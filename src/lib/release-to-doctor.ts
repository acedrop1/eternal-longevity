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
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { sendEmail, newVisitForDoctorEmail } from '@/lib/email';
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
    .select('id, order_number, member_name, status, shipping_address')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) return { ok: false, error: 'not_found' };
  if (order.status !== 'pending-admin') return { ok: true };

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
