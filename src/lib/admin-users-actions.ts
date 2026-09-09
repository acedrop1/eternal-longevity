'use server';

import { revalidatePath } from 'next/cache';

/**
 * Admin user management.
 *
 * The admin invites users (members, doctors, pharmacies), and suspends or
 * deactivates them. Nothing here hard-deletes a user — a medical practice has
 * record-retention obligations, so "remove" means suspend or deactivate, with
 * the row and chart kept intact.
 */
import { getSession } from './auth-server';
import type { Role } from './auth';
import type { AccountStatus } from './database.types';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from './supabase/admin';
import { SITE_URL } from './site';
import {
  sendEmail,
  welcomeEmail,
  passwordResetEmail,
  emailConfigured,
} from './email';
import { randomInt } from 'crypto';

export interface AdminUserResult {
  ok: boolean;
  message: string;
  /**
   * When an account was created but the welcome email could not be delivered,
   * these carry the sign-in details so the admin can relay them by hand.
   */
  tempPassword?: string;
  createdEmail?: string;
  /** The new user's id, so the directory can show them without a full reload. */
  userId?: string;
}

/** A 14-character temporary password: mixed case + digits, no ambiguous glyphs. */
function generateTempPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 14; i += 1) {
    out += chars[randomInt(chars.length)];
  }
  return out;
}

const ROLE_LABEL: Record<Role, string> = {
  member: 'Member',
  doctor: 'Doctor',
  pharmacy: 'Pharmacy',
  admin: 'Admin',
};

async function adminGuard(): Promise<AdminUserResult | null> {
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Connect Supabase to manage users.' };
  }
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { ok: false, message: 'Admin access is required.' };
  }
  return null;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}

/**
 * Create an account for a new user and email them a branded welcome message
 * with a temporary password. Works for every role: member, doctor, pharmacy,
 * admin. The account is created already email-confirmed, so the person can
 * sign in immediately and change the password from Account settings.
 *
 * If email delivery is not configured yet, the account is still created and
 * the temporary password is returned so the admin can relay it by hand.
 */
export async function adminCreateUser(input: {
  email: string;
  fullName: string;
  role: Role;
}): Promise<AdminUserResult> {
  const blocked = await adminGuard();
  if (blocked) return blocked;

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!email.includes('@')) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  if (!fullName) {
    return { ok: false, message: "Enter the person's full name." };
  }

  try {
    const db = createSupabaseAdminClient();
    const password = generateTempPassword();

    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) return { ok: false, message: error.message };
    if (!data.user) {
      return { ok: false, message: 'The account could not be created.' };
    }
    const userId = data.user.id;

    // The new-user trigger creates the profile as a member. Set the requested
    // role and keep the display name in sync.
    const { error: profileErr } = await db
      .from('profiles')
      .update({ role: input.role, full_name: fullName })
      .eq('id', userId);
    if (profileErr) {
      return {
        ok: false,
        message: `Account created, but its role could not be set: ${profileErr.message}`,
        userId,
      };
    }

    // Branded welcome email carrying the temporary password.
    const tpl = welcomeEmail({
      fullName,
      email,
      tempPassword: password,
      role: input.role,
      loginUrl: `${SITE_URL}/login`,
    });
    const mail = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
    });

    if (mail.ok) {
      return {
        ok: true,
        message: `${ROLE_LABEL[input.role]} account created. A welcome email with sign-in details was sent to ${email}.`,
        userId,
      };
    }

    // The account exists, but no email went out. Hand the admin the password
    // so they can pass the sign-in details along directly.
    return {
      ok: true,
      message: emailConfigured()
        ? `${ROLE_LABEL[input.role]} account created, but the welcome email did not send. Share these sign-in details with the user directly:`
        : `${ROLE_LABEL[input.role]} account created. Email delivery is not connected yet, so share these sign-in details with the user directly:`,
      tempPassword: password,
      createdEmail: email,
      userId,
    };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

/** Suspend, deactivate, or reactivate an account. */
export async function adminSetUserStatus(input: {
  userId: string;
  status: AccountStatus;
}): Promise<AdminUserResult> {
  const blocked = await adminGuard();
  if (blocked) return blocked;

  try {
    const db = createSupabaseAdminClient();
    const { error } = await db
      .from('profiles')
      .update({ account_status: input.status })
      .eq('id', input.userId);
    if (error) return { ok: false, message: error.message };

    // Block or restore sign-in at the auth layer to match.
    await db.auth.admin.updateUserById(input.userId, {
      ban_duration: input.status === 'active' ? 'none' : '876000h',
    });

    const verb =
      input.status === 'active'
        ? 'reactivated'
        : input.status === 'suspended'
          ? 'suspended'
          : 'deactivated';
    return { ok: true, message: `Account ${verb}.` };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

/** Change a user's role. */
export async function adminSetUserRole(input: {
  userId: string;
  role: Role;
}): Promise<AdminUserResult> {
  const blocked = await adminGuard();
  if (blocked) return blocked;

  try {
    const db = createSupabaseAdminClient();
    const { error } = await db
      .from('profiles')
      .update({ role: input.role })
      .eq('id', input.userId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Role changed to ${input.role}.` };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
}

/**
 * Send a set-your-password email to any account — member, doctor or pharmacy.
 *
 * This is how a doctor or a pharmacy user gets in the first time: admin
 * creates the account, then sends this instead of inventing a password and
 * reading it down the phone. It is also the fix for "I never got the email".
 *
 * The link goes through our own /auth/confirm route in our own branded email,
 * so nothing arrives looking like it came from Supabase.
 */
export async function adminSendPasswordEmail(input: {
  userId: string;
}): Promise<AdminUserResult> {
  const actor = await getSession();
  if (!actor || actor.role !== 'admin') {
    return { ok: false, message: 'Not authorised.' };
  }
  if (!supabaseAdminConfigured()) {
    return { ok: false, message: 'Database is not configured.' };
  }

  const db = createSupabaseAdminClient();
  const { data: profile } = await db
    .from('profiles')
    .select('email, full_name')
    .eq('id', input.userId)
    .maybeSingle();

  if (!profile?.email) {
    return { ok: false, message: 'That account has no email address.' };
  }

  try {
    const { data, error } = await db.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
    });
    if (error || !data?.properties?.hashed_token) {
      return { ok: false, message: error?.message ?? 'Could not create a link.' };
    }

    const link = `${SITE_URL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/auth/reset`;
    const msg = passwordResetEmail(link);
    await sendEmail({ to: profile.email, subject: msg.subject, html: msg.html });
    return { ok: true, message: `Password email sent to ${profile.email}.` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not send the email.',
    };
  }
}
