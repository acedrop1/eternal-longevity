import 'server-only';

/**
 * Save the card at checkout; charge it when the prescriber approves.
 *
 * The member enters a card and is not charged (lib/cards). When Dr. Elder
 * signs, that card is billed off-session — which is exactly what they
 * authorised at checkout (lib/pay-on-approval).
 * A decline charges nothing, so there is nothing to refund.
 *
 * The alternative was charging up front and refunding declines. It is simpler
 * to reason about, but the processor keeps its fee on every refund, so
 * each decline would cost about \$5.50 with no revenue — and a visible refund
 * rate is exactly what underwriting reads as risk on a restricted business.
 * Not charging in the first place avoids both.
 *
 * `refundDeclinedOrder` stays for the case where money did move and has to
 * come back: an admin denial after payment, or a charge that succeeded on an
 * order later declined.
 */

import { createRefund, getTransfer, listRefunds } from '@/lib/frame';
import { paymentsConfigured } from '@/lib/payments';
import { refundedEmail, sendEmail } from '@/lib/email';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { intentBelongsTo } from '@/lib/order-rules';
import { syncProcessorAmounts } from '@/lib/profit-data';

/**
 * Refund in full. Called when the prescriber declines, or when an order is
 * denied before review.
 *
 * Automatic and immediate by design: the checkout copy promises a refund if
 * treatment is not approved, and a promise that depends on someone remembering
 * to click something is not a promise.
 */
export async function refundDeclinedOrder(
  orderNumber: string,
  /**
   * Why, in the member's words. Defaults to the clinical wording because the
   * prescriber's decline is the common case — an operational cancellation must
   * pass its own, or the receipt attributes a decision nobody made.
   */
  reason = 'Your prescriber determined this treatment is not right for you.',
): Promise<{
  ok: boolean;
  /** False when there was nothing to refund, which is not a failure. */
  refunded?: boolean;
  error?: string;
}> {
  if (!paymentsConfigured()) {
    return { ok: false, error: 'not_configured' };
  }

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, member_name, member_email, total_cents, frame_transfer_id')
    .eq('order_number', orderNumber)
    .maybeSingle();

  // Never charged: nothing to return.
  if (!order?.frame_transfer_id) return { ok: true, refunded: false };

  try {
    const t = await getTransfer(order.frame_transfer_id);
    if (!t.ok) return { ok: false, error: `refund_failed_${t.code}` };
    // Never refund a charge this order did not make — the id on the row is
    // only trusted as far as the charge's own metadata agrees.
    if (!intentBelongsTo(t.data, order)) return { ok: true, refunded: false };

    /*
     * Nothing moved yet (declined, or still waiting on the bank). If it lands
     * after this, it lands on a closed order and lib/payment-record refunds it.
     */
    if (t.data.status !== 'succeeded') return { ok: true, refunded: false };

    // Only what is still held: a retried cancel finds nothing left and stops,
    // and an earlier partial refund is not paid out twice.
    const prior = await listRefunds(t.data.id);
    if (!prior.ok) return { ok: false, error: `refund_failed_${prior.code}` };
    const returned = prior.data
      .filter((r) => r.status !== 'failed' && r.status !== 'canceled')
      .reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const remaining = t.data.amount - returned;
    if (remaining <= 0) return { ok: true, refunded: false };

    const refund = await createRefund({ transferId: t.data.id, amountCents: returned ? remaining : undefined });
    if (!refund.ok) return { ok: false, error: `refund_failed_${refund.code}` };
    await syncProcessorAmounts(db, t.data.id); // profit: refunded_cents (never throws)

    await db
      .from('orders')
      .update({ paid_confirmed_at: null })
      .eq('id', order.id);

    await db.from('order_updates').insert({
      order_id: order.id,
      label: 'Refunded in full',
      body: `${reason} Your payment has been returned — banks usually post it within 5–10 business days.`,
      author: 'System',
      author_role: 'system',
    });

    if (order.member_email) {
      const msg = refundedEmail({
        firstName: (order.member_name ?? '').trim().split(/\s+/)[0] || 'there',
        orderNumber: order.order_number,
        amount: order.total_cents ?? 0,
        full: true,
        reason,
      });
      try {
        await sendEmail({
          to: order.member_email,
          subject: msg.subject,
          html: msg.html,
        });
      } catch {
        // The money is already back; a failed receipt must not look like a
        // failed refund.
      }
    }

    return { ok: true, refunded: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'refund_failed',
    };
  }
}
