/**
 * Did this payment pay for this order? Every charge we create is for the
 * order's total, in dollars; anything else (an order edited after the intent
 * was made, an intent made elsewhere with the order's metadata) must not mark
 * it paid. Pure, so the webhook's rule can be checked on its own.
 */
export function paymentMatchesOrder(
  pi: { amount: number; currency: string },
  order: { total_cents: number | null },
): boolean {
  return pi.currency === 'usd' && order.total_cents !== null && pi.amount === order.total_cents;
}
