/**
 * The 30-day check-in: which delivered orders are due one.
 *
 * Pure functions only, so the selection can be tested without a database
 * (see the scratchpad assertion script). The cron in
 * src/app/api/cron/checkins/route.ts feeds these from Supabase.
 *
 * A member gets a check-in thirty days after (a) their first delivery of a
 * product and (b) their first refill of it, the second delivery. Nothing
 * else, and never twice for the same order.
 */

export type CheckinKind = 'first' | 'refill';

/** Days after delivery before we ask. */
export const CHECKIN_AFTER_DAYS = 30;
/**
 * Older than this and "how's it going after 30 days" is the wrong question,
 * so the first deploy does not mail every delivery the practice ever made.
 */
export const CHECKIN_MAX_AGE_DAYS = 90;
/** How long an emailed link stays usable. */
export const CHECKIN_TOKEN_TTL_DAYS = 30;

const DAY = 86400_000;

export interface Delivery {
  orderId: string;
  userId: string;
  /** ISO timestamp the order was marked delivered. */
  deliveredAt: string;
  items: { productId: string; productName: string }[];
}

export interface DueCheckin {
  orderId: string;
  userId: string;
  productId: string;
  productName: string;
  kind: CheckinKind;
  deliveredAt: string;
}

/**
 * Every check-in due now. Pass every delivered order the members have (not just
 * recent ones), or a refill will be mistaken for a first delivery.
 *
 * - Per member and product, deliveries in date order: #1 is 'first', #2 is
 *   'refill', the rest are ignored.
 * - Due once CHECKIN_AFTER_DAYS have passed, until CHECKIN_MAX_AGE_DAYS.
 * - An order that already has a check-in is skipped. At most one per order
 *   (a two-product order is asked about the first qualifying product only)
 *   and at most one per member per run, so nobody gets two emails in a day.
 */
export function dueCheckins(
  deliveries: Delivery[],
  alreadyCheckedOrderIds: Iterable<string>,
  now: Date = new Date(),
): DueCheckin[] {
  const done = new Set(alreadyCheckedOrderIds);
  const sorted = [...deliveries].sort(
    (a, b) => Date.parse(a.deliveredAt) - Date.parse(b.deliveredAt),
  );

  // How many times each member has had each product delivered, in order.
  const seen = new Map<string, number>();
  const candidates: DueCheckin[] = [];
  for (const d of sorted) {
    // An order listing the same product twice counts once.
    const products = new Map(d.items.map((i) => [i.productId, i]));
    for (const item of products.values()) {
      const key = `${d.userId}\u0000${item.productId}`;
      const n = (seen.get(key) ?? 0) + 1;
      seen.set(key, n);
      if (n > 2) continue;
      candidates.push({
        orderId: d.orderId,
        userId: d.userId,
        productId: item.productId,
        productName: item.productName,
        kind: n === 1 ? 'first' : 'refill',
        deliveredAt: d.deliveredAt,
      });
    }
  }

  const t = now.getTime();
  const out: DueCheckin[] = [];
  const usedOrders = new Set<string>();
  const usedUsers = new Set<string>();
  for (const c of candidates) {
    const age = t - Date.parse(c.deliveredAt);
    if (age < CHECKIN_AFTER_DAYS * DAY || age > CHECKIN_MAX_AGE_DAYS * DAY) continue;
    if (done.has(c.orderId) || usedOrders.has(c.orderId) || usedUsers.has(c.userId)) continue;
    usedOrders.add(c.orderId);
    usedUsers.add(c.userId);
    out.push(c);
  }
  return out;
}

/** A low score or any words at all go to the care team. */
export function needsFollowUp(rating: number, comment: string | null | undefined): boolean {
  return rating <= 3 || Boolean(comment?.trim());
}

/** Still answerable: not answered, and the link is in date. */
export function checkinOpen(
  row: { responded_at: string | null; created_at: string },
  now: Date = new Date(),
): boolean {
  return (
    !row.responded_at &&
    now.getTime() - Date.parse(row.created_at) <= CHECKIN_TOKEN_TTL_DAYS * DAY
  );
}
