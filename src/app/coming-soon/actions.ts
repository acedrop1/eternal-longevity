'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { noticeEmail, sendEmail, SUPPORT_EMAIL } from '@/lib/email';
import { LOCK_COOKIE, lockToken } from '@/lib/site-lock';

export type FormState = { ok?: boolean; error?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Save a pre-launch signup. Falls back to emailing the care team so no signup is lost. */
export async function joinWaitlistAction(_prev: FormState, form: FormData): Promise<FormState> {
  if (String(form.get('company') ?? '')) return { ok: true }; // honeypot: bots fill every field
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) return { error: 'Please enter a valid email address.' };

  if (supabaseAdminConfigured()) {
    const { error } = await createSupabaseAdminClient()
      .from('waitlist')
      .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });
    if (!error) return { ok: true };
    console.error('[waitlist] insert failed, emailing instead:', error.message);
  }

  const sent = await sendEmail({
    to: SUPPORT_EMAIL,
    subject: 'Launch list signup',
    html: noticeEmail({ eyebrow: 'Launch list', heading: 'Someone asked to hear when we open.', rows: [['Email', email]] }),
  });
  return sent.ok ? { ok: true } : { error: 'Something went wrong. Please try again.' };
}

/** Team access while the site is locked. */
export async function unlockAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = await lockToken();
  const tried = String(form.get('password') ?? '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`eternal-longevity:${tried}`));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  if (!token || hex !== token) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: 'That password is not right.' };
  }
  (await cookies()).set(LOCK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect('/');
}
