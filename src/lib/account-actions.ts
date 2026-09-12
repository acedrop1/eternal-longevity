'use server';

import { getSession } from '@/lib/auth-server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';
import { noticeEmail, sendEmail } from '@/lib/email';
import { SUPPORT_EMAIL } from '@/lib/site';
import { passwordValid } from '@/lib/intakeSchema';

export interface AccountResult {
  ok: boolean;
  message?: string;
}

/**
 * Change the signed-in member's password.
 *
 * The form asked for the current password and then threw it away — the button
 * cleared the fields, showed a tick, and left the password untouched. The
 * current password is verified here by re-authenticating with it, so someone
 * who walks up to an unlocked laptop still cannot change it.
 */
export async function changePasswordAction(input: {
  current: string;
  next: string;
}): Promise<AccountResult> {
  const user = await getSession();
  if (!user) return { ok: false, message: 'Please sign in again.' };
  if (!supabaseConfigured) {
    return { ok: false, message: 'Not available right now.' };
  }
  if (!passwordValid(input.next)) {
    return {
      ok: false,
      message:
        'Use at least 8 characters with an uppercase, a lowercase and a special character.',
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.current,
  });
  if (authError) {
    return { ok: false, message: 'That current password is not right.' };
  }

  const { error } = await supabase.auth.updateUser({ password: input.next });
  if (error) return { ok: false, message: 'Could not update your password.' };

  return { ok: true, message: 'Password updated.' };
}

/** Shared shape for the two requests that a person has to fulfil. */
async function raiseRequest(
  subject: string,
  detail: string,
  confirmation: string,
): Promise<AccountResult> {
  const user = await getSession();
  if (!user) return { ok: false, message: 'Please sign in again.' };

  const sent = await sendEmail({
    to: SUPPORT_EMAIL,
    replyTo: user.email,
    subject: `${subject} — ${user.email}`,
    html: noticeEmail({
      eyebrow: 'Member request',
      heading: subject,
      rows: [['Member', `${user.name || 'Member'} &lt;${user.email}&gt;`]],
      body: detail,
    }),
  });
  if (!sent.ok) {
    return {
      ok: false,
      message: `Could not send that. Please email ${SUPPORT_EMAIL} directly.`,
    };
  }
  return { ok: true, message: confirmation };
}

/**
 * A patient has a legal right to a copy of their record, so this cannot be a
 * button that shows a tick — it used to promise a download link within 24
 * hours and do nothing at all. It raises a real request that a person answers.
 */
export async function requestDataExportAction(): Promise<AccountResult> {
  return raiseRequest(
    'Data export request',
    'Requested a full copy of their record — intake, orders, messages. Fulfil within the statutory window.',
    'Request received. We will email your export within 30 days, usually much sooner.',
  );
}

/**
 * Closing an account stops billing, so a button that only set a flag left
 * members believing their subscriptions had been cancelled while the charges
 * kept coming.
 */
export async function requestAccountClosureAction(): Promise<AccountResult> {
  return raiseRequest(
    'Account closure request',
    'Requested account closure. Cancel active subscriptions, stop future billing, and confirm by email. Medical records are retained per state law.',
    'Closure requested. We will confirm by email within 3 business days and stop any future billing.',
  );
}
