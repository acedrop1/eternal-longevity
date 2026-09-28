'use server';

/**
 * Answering a check-in. The token from the email is the credential, so no
 * session is needed; it works once, then the row is closed for good.
 */

import { revalidatePath } from 'next/cache';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { checkinOpen, needsFollowUp } from '@/lib/checkins';
import { SITE_URL } from '@/lib/site';
import { SUPPORT_EMAIL, checkinFollowUpInternalEmail, sendEmail } from '@/lib/email';

export async function submitCheckinAction(input: {
  token: string;
  rating: number;
  comment?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseAdminConfigured()) return { ok: false, error: 'not_configured' };
  const rating = Math.round(Number(input.rating));
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: 'Pick a number from 1 to 5.' };
  const comment = (input.comment ?? '').trim().slice(0, 2000) || null;
  if (typeof input.token !== 'string' || !input.token || input.token.length > 100) {
    return { ok: false, error: 'invalid_link' };
  }

  const db = createSupabaseAdminClient();
  const { data: row } = await db
    .from('checkins')
    .select('id, user_id, product_name, kind, responded_at, created_at')
    .eq('token', input.token)
    .maybeSingle();
  if (!row) return { ok: false, error: 'invalid_link' };
  if (row.responded_at) return { ok: true }; // already answered; same thank-you
  if (!checkinOpen(row)) return { ok: false, error: 'invalid_link' };

  // Conditional on still being open, so a double submit records one answer.
  const { data: saved, error } = await db
    .from('checkins')
    .update({ rating, comment, responded_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('responded_at', null)
    .select('id');
  if (error) return { ok: false, error: 'Something went wrong. Please try again.' };
  if (!saved?.length) return { ok: true };

  if (needsFollowUp(rating, comment)) {
    const { data: member } = await db
      .from('profiles')
      .select('full_name, email')
      .eq('id', row.user_id)
      .maybeSingle();
    const mail = checkinFollowUpInternalEmail({
      memberName: member?.full_name || 'A member',
      memberEmail: member?.email ?? '',
      productName: row.product_name,
      kind: row.kind,
      rating,
      comment,
      adminUrl: `${SITE_URL}/portal/admin/checkins`,
    });
    try {
      await sendEmail({ to: SUPPORT_EMAIL, subject: mail.subject, html: mail.html });
    } catch {
      // The answer is saved and on the admin list either way.
    }
  }

  revalidatePath('/portal');
  revalidatePath('/portal/admin/checkins');
  return { ok: true };
}
