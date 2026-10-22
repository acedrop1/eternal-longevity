import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { supabaseConfigured } from '@/lib/env';
import { PRODUCT_CATEGORY } from '@/lib/intake-categories';
import { intakeProductIds, outstandingMedia } from '@/lib/intake-rules';
import { intakeCovers } from '@/lib/purchase-rules';

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

/**
 * True while the newest intake is sent back for more information. intakeStateFor
 * folds that into 'submitted' (ordering stays open); the dashboard needs it on
 * its own so the member is told a question is waiting.
 */
export async function intakeNeedsInfo(userId: string): Promise<boolean> {
  if (!supabaseAdminConfigured()) return false;
  const { data } = await createSupabaseAdminClient()
    .from('intake_submissions')
    .select('status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.status === 'needs_info';
}

/**
 * The assessment is done, so they may order: either fully reviewed
 * ('submitted') or waiting on the health questions that follow checkout
 * ('awaiting_visit'; the order then waits for them, lib/release-to-doctor).
 */
export const assessmentDone = (state: IntakeState) => state === 'submitted' || state === 'awaiting_visit';

/** Only a member who has done the assessment may place an order. */
export async function canOrder(userId: string): Promise<boolean> {
  return assessmentDone(await intakeStateFor(userId));
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

/** Why a product needs its questions answered again before it can be ordered. */
export type ReassessReason = 'declined' | 'cancelled' | 'stale';
export type PriorDecline = {
  reason: ReassessReason;
  /** When the reason arose (the decline, the cancellation, or the last assessment for 'stale'). */
  at: string;
  /** Declines only: the order he declined and his note. */
  orderNumber?: string;
  note?: string | null;
};

/** Health answers older than this are re-confirmed before a new order (pre-filled). */
export const ANSWERS_MAX_AGE_DAYS = 180;

/**
 * Products this member must answer again (their last answers pre-filled)
 * before ordering, so Dr. Elder never reviews a new order on answers that may
 * no longer hold:
 *   declined:  he declined it, and no assessment covering it since
 *   cancelled: they cancelled its plan after their last assessment
 *   stale:     their last assessment is older than ANSWERS_MAX_AGE_DAYS
 * A prescription that ran its term is handled by the renewal path (?renew=).
 */
export async function reassessNeeded(userId: string): Promise<Map<string, PriorDecline>> {
  const out = new Map<string, PriorDecline>();
  if (!supabaseAdminConfigured()) return out;
  const db = createSupabaseAdminClient();
  const [{ data: orders }, { data: plans }, { data: intake }] = await Promise.all([
    db.from('orders').select('id, order_number, physician_note, updated_at').eq('user_id', userId).eq('status', 'declined-clinical'),
    db.from('subscriptions').select('product_id, updated_at').eq('user_id', userId).eq('status', 'canceled'),
    db.from('intake_submissions').select('answers, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const answers = intake?.answers && typeof intake.answers === 'object' && !Array.isArray(intake.answers) ? (intake.answers as Record<string, unknown>) : {};
  const lastAt = intake?.created_at ?? '';
  // Answered (for this product) after `at`: the reason no longer applies.
  const answeredSince = (productId: string, at: string) => Boolean(intake) && lastAt > at && intakeCovers(answers, productId);

  // Stale: every product their last assessment covered, once it's past the limit.
  if (intake && Date.now() - new Date(lastAt).getTime() > ANSWERS_MAX_AGE_DAYS * 86_400_000) {
    for (const id of intakeProductIds(answers)) out.set(id, { reason: 'stale', at: lastAt });
  }

  // Cancelled since the last assessment.
  for (const p of plans ?? []) {
    if (!answeredSince(p.product_id, p.updated_at)) out.set(p.product_id, { reason: 'cancelled', at: p.updated_at });
  }

  // Declined, and not answered again since (the strongest reason, so it wins).
  if (orders?.length) {
    const ids = orders.map((o) => o.id);
    const [{ data: items }, { data: updates }] = await Promise.all([
      db.from('order_items').select('order_id, product_id').in('order_id', ids),
      db.from('order_updates').select('order_id, created_at').in('order_id', ids).eq('status_change', 'declined-clinical'),
    ]);
    for (const o of orders) {
      const at = updates?.find((u) => u.order_id === o.id)?.created_at ?? o.updated_at;
      for (const i of (items ?? []).filter((x) => x.order_id === o.id)) {
        const prev = out.get(i.product_id);
        if (!answeredSince(i.product_id, at) && !(prev?.reason === 'declined' && prev.at > at)) {
          out.set(i.product_id, { reason: 'declined', at, orderNumber: o.order_number, note: o.physician_note });
        }
      }
    }
  }
  return out;
}
