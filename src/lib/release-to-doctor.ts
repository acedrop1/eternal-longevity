'use server';

/**
 * Release a new order straight to the prescriber.
 *
 * There is no admin gate. An order goes to Dr. Elder the moment it is placed,
 * and he is emailed and texted — one less person between a member and their
 * review, and nothing sitting in a queue waiting for someone to click.
 *
 * The cheap address checks still run, but they only *annotate*. A PO box or a
 * mail forwarder cannot receive a prescription, so it is worth Dr. Elder
 * seeing that before he signs something the pharmacy will not be able to
 * deliver — but it does not stop the order or delay his review.
 *
 * An earlier version put Claude in front of this to make a release-or-hold
 * decision. That is removed: it added cost, latency and a second opinion
 * nobody asked for on a step that is now simply automatic.
 */

import { revalidatePath } from 'next/cache';
import { getStripe, stripeConfigured } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/billing';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import {
  sendEmail,
  newVisitForDoctorEmail,
  cardNeededEmail,
} from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { SITE_URL } from '@/lib/site';

/** Mailbox stores and freight forwarders — not a residence, not shippable. */
const PO_BOX = /\b(p\.?\s*o\.?\s*box|post\s*office\s*box|postal\s*box)\b/i;
const FORWARDER =
  /\b(mailbox|mail\s*box|pmb|shipito|myus|stackry|reship|forward(ing)?\s*(service|agent)|freight\s*forward)/i;

/** Things worth flagging on the order. None of them hold it up. */
function addressNotes(shippingAddress: unknown): string[] {
  const a = (shippingAddress ?? {}) as Record<string, string>;
  const line = `${a.line1 ?? ''} ${a.line2 ?? ''}`.trim();
  const notes: string[] = [];
  if (PO_BOX.test(line)) {
    notes.push('Ships to a PO box — a prescription cannot be delivered there.');
  }
  if (FORWARDER.test(line)) {
    notes.push('Address looks like a mail forwarder.');
  }
  if (!a.zip || !/^\d{5}(-\d{4})?$/.test(a.zip)) {
    notes.push('ZIP code is missing or malformed.');
  }
  return notes;
}

/**
 * Is there a card that will still be chargeable when the prescriber signs?
 *
 * The point is to keep an unpayable order out of Dr. Elder's queue entirely.
 * Signing is a clinical act — once he has done it there is a prescription in
 * the world, and discovering only then that the card is dead means his work is
 * wasted and someone has to go back to the member. Better to never show it to
 * him.
 *
 * Expiry is checked against next month, not today: a card expiring in three
 * days will very likely be dead by the time a review finishes.
 */
async function usableCard(userId: string | null, email: string | null, name: string | null) {
  if (!stripeConfigured() || !email) return { ok: false, reason: 'no_stripe' };

  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer({
    userId: userId ?? '',
    email,
    name: name ?? undefined,
  });
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  if (methods.data.length === 0) return { ok: false, reason: 'no_card' };

  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const live = methods.data.filter((m) => {
    const c = m.card;
    if (!c) return false;
    // exp_month is 1-12; a card is good through the end of its month.
    return new Date(c.exp_year, c.exp_month, 1) > cutoff;
  });
  if (live.length === 0) return { ok: false, reason: 'expired' };

  return { ok: true, reason: 'ok' };
}

/**
 * Send a new order to the prescriber and tell him about it.
 * Called from placeOrderAction.
 */
export async function releaseToDoctor(orderNumber: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!supabaseAdminConfigured()) return { ok: false, error: 'not_configured' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select(
      'id, order_number, user_id, member_name, member_email, status, shipping_address',
    )
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) return { ok: false, error: 'not_found' };
  if (order.status !== 'pending-admin') return { ok: true };

  // Never put an order the card cannot pay for in front of the prescriber.
  const card = await usableCard(
    order.user_id,
    order.member_email,
    order.member_name,
  );
  if (!card.ok && card.reason !== 'no_stripe') {
    const why =
      card.reason === 'expired'
        ? 'The saved card expires too soon to charge on approval.'
        : 'No usable card is saved for this member.';

    await db.from('orders').update({ admin_note: why }).eq('id', order.id);
    await db.from('order_updates').insert({
      order_id: order.id,
      label: 'Held before review — payment method',
      body: `${why} The prescriber has not been notified.`,
      author: 'System',
      author_role: 'system',
    });

    if (order.member_email) {
      const first = (order.member_name ?? '').trim().split(/\s+/)[0] || 'there';
      const msg = cardNeededEmail({
        firstName: first,
        orderNumber: order.order_number,
        accountUrl: `${SITE_URL}/portal/account`,
      });
      try {
        await sendEmail({
          to: order.member_email,
          subject: msg.subject,
          html: msg.html,
        });
      } catch {
        // Best effort; the order is already annotated for a human.
      }
    }

    revalidatePath('/portal/admin/queue');
    return { ok: true, error: card.reason };
  }

  const notes = addressNotes(order.shipping_address);

  await db
    .from('orders')
    .update({
      status: 'assigned',
      admin_note: notes.length ? notes.join(' ') : null,
    })
    .eq('id', order.id);

  await db.from('order_updates').insert({
    order_id: order.id,
    label: 'Sent to prescriber',
    body: notes.length ? notes.join(' ') : null,
    author: 'System',
    author_role: 'system',
  });

  await notifyDoctor(db, order.order_number, order.member_name ?? 'A member');

  revalidatePath('/portal/admin/queue');
  revalidatePath('/portal/doctor');
  return { ok: true };
}

/** Email and text every doctor that something is waiting. */
async function notifyDoctor(
  db: ReturnType<typeof createSupabaseAdminClient>,
  orderNumber: string,
  memberName: string,
): Promise<void> {
  const { data: doctors } = await db
    .from('profiles')
    .select('full_name, email, phone')
    .eq('role', 'doctor')
    .eq('account_status', 'active');

  for (const doc of doctors ?? []) {
    const firstName = (doc.full_name ?? '').trim().split(/\s+/)[0] || 'Doctor';
    if (doc.email) {
      const msg = newVisitForDoctorEmail({
        firstName,
        memberName,
        orderNumber,
        queueUrl: `${SITE_URL}/portal/doctor`,
      });
      try {
        await sendEmail({ to: doc.email, subject: msg.subject, html: msg.html });
      } catch {
        // A failed notification must not roll back the release.
      }
    }
    if (doc.phone) {
      try {
        await sendSms(
          doc.phone,
          `Eternal Longevity: a visit is ready for review — ${memberName}, order ${orderNumber}. ${SITE_URL}/portal/doctor`,
        );
      } catch {
        // Same: best effort.
      }
    }
  }
}
