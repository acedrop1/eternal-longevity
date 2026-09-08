'use server';

/**
 * Pay-on-approval.
 *
 * Orders are placed with no payment method and no charge. When the prescriber
 * signs, we mint a single-use token, email the member a secure pay link, and
 * only then take money — so "you are only charged if a prescriber approves
 * your treatment" is enforced here, not just promised in the copy.
 *
 * The token is the credential: it is unguessable, single-use, expires in
 * seven days, and is cleared the moment payment is confirmed.
 */

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth-server';
import { SITE_URL } from '@/lib/site';
import { approvedPayNowEmail, sendEmail } from '@/lib/email';

const TOKEN_TTL_DAYS = 7;

export interface PayableOrder {
  orderNumber: string;
  memberName: string;
  totalCents: number;
  items: { name: string; qty: number }[];
  alreadyPaid: boolean;
}

/**
 * Issue a pay link for a signed order and email it to the member. Called from
 * the prescriber's sign action; safe to call again to re-send.
 */
export async function issuePayLink(orderNumber: string): Promise<{
  ok: boolean;
  payUrl?: string;
  error?: string;
}> {
  if (!supabaseAdminConfigured()) return { ok: false, error: 'not_configured' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, member_name, member_email, total_cents, paid_confirmed_at')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (!order) return { ok: false, error: 'not_found' };
  if (order.paid_confirmed_at) return { ok: false, error: 'already_paid' };

  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 86400_000).toISOString();

  const { error } = await db
    .from('orders')
    .update({ pay_token: token, pay_token_expires: expires })
    .eq('id', order.id);
  if (error) return { ok: false, error: error.message };

  const payUrl = `${SITE_URL}/pay/${token}`;

  if (order.member_email) {
    const firstName = (order.member_name ?? '').trim().split(/\s+/)[0] || 'there';
    const msg = approvedPayNowEmail({
      firstName,
      orderNumber: order.order_number,
      total: order.total_cents ?? 0,
      payUrl,
    });
    await sendEmail({
      to: order.member_email,
      subject: msg.subject,
      html: msg.html,
    });
  }

  return { ok: true, payUrl };
}

/** Look up an order by its pay token. Returns null for expired/unknown tokens. */
export async function getOrderByPayToken(token: string): Promise<PayableOrder | null> {
  if (!supabaseAdminConfigured() || !token) return null;

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, member_name, total_cents, pay_token_expires, paid_confirmed_at')
    .eq('pay_token', token)
    .maybeSingle();
  if (!order) return null;

  const expired =
    order.pay_token_expires !== null &&
    new Date(order.pay_token_expires).getTime() < Date.now();
  if (expired) return null;

  const { data: items } = await db
    .from('order_items')
    .select('product_name, quantity')
    .eq('order_id', order.id);

  return {
    orderNumber: order.order_number,
    memberName: order.member_name ?? '',
    totalCents: order.total_cents ?? 0,
    items: (items ?? []).map((i) => ({
      name: i.product_name,
      qty: i.quantity ?? 1,
    })),
    alreadyPaid: Boolean(order.paid_confirmed_at),
  };
}

/**
 * Mark an order paid. Called by the payment confirmation once a rail is live;
 * until then, admin can also confirm a manual payment (wire/ACH) by hand.
 */
export async function confirmPaymentAction(input: {
  token?: string;
  orderNumber?: string;
  reference?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseAdminConfigured()) return { ok: false, error: 'not_configured' };

  // Confirming by order number is an admin action; by token it is the member
  // completing their own emailed link.
  if (!input.token) {
    const user = await getSession();
    if (!user || user.role !== 'admin') return { ok: false, error: 'not_authorized' };
  }

  const db = createSupabaseAdminClient();
  const query = db.from('orders').select('id, paid_confirmed_at');
  const { data: order } = input.token
    ? await query.eq('pay_token', input.token).maybeSingle()
    : await query.eq('order_number', input.orderNumber ?? '').maybeSingle();

  if (!order) return { ok: false, error: 'not_found' };
  if (order.paid_confirmed_at) return { ok: true }; // idempotent

  const { error } = await db
    .from('orders')
    .update({
      paid_confirmed_at: new Date().toISOString(),
      // Burn the token so the link cannot be reused or forwarded.
      pay_token: null,
      pay_token_expires: null,
    })
    .eq('id', order.id);
  if (error) return { ok: false, error: error.message };

  await db.from('order_updates').insert({
    order_id: order.id,
    label: 'Payment received',
    body: input.reference ? `Reference: ${input.reference}` : null,
    author: 'System',
    author_role: 'system',
  });

  revalidatePath('/portal/orders');
  revalidatePath('/portal/admin/fulfillment');
  return { ok: true };
}
