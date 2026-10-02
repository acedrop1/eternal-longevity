import 'server-only';

/*
 * Not a server action. Nothing in the browser calls this, and the directive was
 * publishing "release this order to the prescriber" as an unauthenticated
 * endpoint that skips every checkout gate.
 */

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
import {
  newVisitForDoctorEmail,
  noticeEmail,
  sendEmail,
  SUPPORT_EMAIL,
} from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { SITE_URL } from '@/lib/site';
import { orderRef } from '@/lib/format';

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
    .select(
      'id, order_number, user_id, member_name, member_email, status, shipping_address',
    )
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) return { ok: false, error: 'not_found' };
  if (order.status !== 'pending-admin') return { ok: true };

  /*
   * No payment gate here. Checkout saves a card and reserves nothing, so the
   * prescriber is not signing against confirmed funds — he is signing a
   * clinical decision, and the charge is attempted afterwards. A card that
   * fails then emails the member a pay link and alerts the team; the
   * prescriber is never asked to think about payment.
   */
  const notes = addressNotes(order.shipping_address);

  // Conditional, so a retry racing checkout cannot release it twice, and
  // checked: an order that silently stays pending-admin reaches nobody.
  const { data: moved, error: moveErr } = await db
    .from('orders')
    .update({
      status: 'assigned',
      admin_note: notes.length ? notes.join(' ') : null,
    })
    .eq('id', order.id)
    .eq('status', 'pending-admin')
    .select('id');
  if (moveErr) {
    console.error('[release-to-doctor] update failed:', moveErr.message);
    return { ok: false, error: moveErr.message };
  }
  if (!moved?.length) return { ok: true };

  await db.from('order_updates').insert({
    order_id: order.id,
    label: 'Sent to prescriber',
    body: notes.length ? notes.join(' ') : null,
    author: 'System',
    author_role: 'system',
    // The stale-order sweep times the prescriber's wait from this entry.
    status_change: 'assigned',
  });

  const memberName = order.member_name ?? 'A member';
  await notifyDoctor(db, order.order_number, memberName);

  /*
   * The team gets a copy too. The prescriber owns the clinical decision, but
   * somebody non-clinical has to notice when an order stalls, a charge fails,
   * or nobody has looked at a case in a day.
   */
  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `New order for review — ${orderRef(order.order_number)}`,
      html: noticeEmail({
        eyebrow: 'New order',
        heading: `${memberName} placed an order`,
        body: 'It has gone straight to the prescriber. Nothing is charged until he signs.',
        rows: [
          ['Order', orderRef(order.order_number)],
          ['Member', memberName],
        ],
        cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin/fulfillment` },
      }),
    });
  } catch {
    // The prescriber has already been paged; this copy is for visibility only.
  }

  revalidatePath('/portal/admin/fulfillment');
  revalidatePath('/portal/doctor');
  return { ok: true };
}

/** Email and text every doctor that something is waiting. */
async function notifyDoctor(
  db: ReturnType<typeof createSupabaseAdminClient>,
  orderNumber: string,
  memberName: string,
): Promise<void> {
  await pageDoctors(
    db,
    (firstName) =>
      newVisitForDoctorEmail({
        firstName,
        memberName,
        orderNumber,
        queueUrl: `${SITE_URL}/portal/doctor`,
      }),
    // No patient name: SMS is not covered by a BAA.
    `Eternal Longevity: a visit is ready for review, ${orderRef(orderNumber)}. ${SITE_URL}/portal/doctor`,
  );
}

/**
 * Email and text every active prescriber. Shared with the stale-order sweep,
 * so a reminder reaches him the same way the first page did. Best effort:
 * a failed notice never rolls back whatever triggered it.
 */
export async function pageDoctors(
  db: ReturnType<typeof createSupabaseAdminClient>,
  email: (firstName: string) => { subject: string; html: string },
  sms: string,
): Promise<void> {
  const { data: doctors } = await db
    .from('profiles')
    .select('full_name, email, phone')
    .eq('role', 'doctor')
    .eq('account_status', 'active');

  for (const doc of doctors ?? []) {
    const firstName = (doc.full_name ?? '').trim().split(/\s+/)[0] || 'Doctor';
    if (doc.email) {
      try {
        const msg = email(firstName);
        await sendEmail({ to: doc.email, subject: msg.subject, html: msg.html });
      } catch {
        // Best effort.
      }
    }
    if (doc.phone) {
      try {
        await sendSms(doc.phone, sms);
      } catch {
        // Same.
      }
    }
  }
}
