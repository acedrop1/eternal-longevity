import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export type IntakeState = 'none' | 'awaiting_visit' | 'submitted' | 'declined';

/**
 * How far this member has got through their medical intake.
 *
 * One source of truth for a rule that is enforced in three places: the
 * checkout page redirects on it, `placeOrderAction` rejects on it, and the
 * dashboard checklist reports it. A member with no completed intake has given
 * the prescriber nothing to review, so an order from them would arrive as a
 * signature request with no clinical record behind it.
 */
export async function intakeStateFor(userId: string): Promise<IntakeState> {
  if (!supabaseAdminConfigured()) return 'none';
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('intake_submissions')
    .select('status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const s = data?.status;
  if (s === 'submitted' || s === 'approved') return 'submitted';
  if (s === 'awaiting_visit') return 'awaiting_visit';
  if (s === 'declined') return 'declined';
  return 'none';
}

/** Only a completed intake may place an order. */
export async function canOrder(userId: string): Promise<boolean> {
  return (await intakeStateFor(userId)) === 'submitted';
}
