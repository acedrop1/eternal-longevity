import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { supabaseConfigured } from '@/lib/env';
import { PRODUCT_CATEGORY } from '@/lib/intake-categories';
import { intakeProductIds, outstandingMedia } from '@/lib/intake-rules';

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
  // Local demo (no Supabase at all): the assessment is stored nowhere, so
  // there is nothing to gate on and checkout stays reachable. With Supabase
  // half-configured this stays shut.
  if (!supabaseAdminConfigured()) return supabaseConfigured ? 'none' : 'submitted';
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('intake_submissions')
    .select('status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const s = data?.status;
  // In review / needs info are still a completed intake: no second visit, ordering stays open.
  if (s === 'submitted' || s === 'approved' || s === 'in_review' || s === 'needs_info') return 'submitted';
  if (s === 'awaiting_visit') return 'awaiting_visit';
  if (s === 'declined') return 'declined';
  return 'none';
}

/** Only a completed intake may place an order. */
export async function canOrder(userId: string): Promise<boolean> {
  return (await intakeStateFor(userId)) === 'submitted';
}

/** The answers on this member's newest intake ({} when there is none). */
export async function latestIntakeAnswers(userId: string): Promise<Record<string, unknown>> {
  if (!supabaseAdminConfigured()) return {};
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('intake_submissions')
    .select('answers')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const a = data?.answers;
  return a && typeof a === 'object' && !Array.isArray(a) ? (a as Record<string, unknown>) : {};
}

/**
 * What is left after checkout: the photo / lab steps still owed on the newest
 * intake. `photos` is true while required hair or skin photos are missing
 * (the portal's "Add your photos" task); `needsPhotos` whether this intake
 * asks for photos at all.
 */
export async function pendingMediaFor(
  userId: string,
): Promise<{ stepIds: string[]; photos: boolean; needsPhotos: boolean }> {
  const a = await latestIntakeAnswers(userId);
  const steps = outstandingMedia(a);
  return {
    stepIds: steps.map((s) => s.id),
    photos: steps.some((s) => s.fields.some((f) => f.type === 'photo-upload')),
    needsPhotos: intakeProductIds(a).some((id) => ['hair', 'skin'].includes(PRODUCT_CATEGORY[id])),
  };
}
