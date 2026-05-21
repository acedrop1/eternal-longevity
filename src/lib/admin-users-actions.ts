'use server';

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

export interface AdminUserResult {
  ok: boolean;
  message: string;
}

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

/** Invite a new user. They receive an email to set their own password. */
export async function adminInviteUser(input: {
  email: string;
  fullName: string;
  role: Role;
}): Promise<AdminUserResult> {
  const blocked = await adminGuard();
  if (blocked) return blocked;

  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) {
    return { ok: false, message: 'Enter a valid email address.' };
  }

  try {
    const db = createSupabaseAdminClient();
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
      data: { full_name: input.fullName.trim() },
      redirectTo: `${SITE_URL}/auth/callback?next=/portal`,
    });
    if (error) return { ok: false, message: error.message };

    // The new-user trigger creates the profile as a member; promote if needed.
    if (data.user && input.role !== 'member') {
      await db
        .from('profiles')
        .update({ role: input.role })
        .eq('id', data.user.id);
    }
    return {
      ok: true,
      message: `Invite sent to ${email}. They will set their own password.`,
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
