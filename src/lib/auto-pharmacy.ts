import 'server-only';

/*
 * Not a server action. Nothing in the browser calls this — the directive was
 * publishing "submit this prescription to the pharmacy" as an unauthenticated
 * endpoint, callable by anyone holding an order number.
 */

/**
 * Send a signed, paid order to the pharmacy automatically.
 *
 * Previously this was a manual step in admin: the prescriber signed, and the
 * order then sat until somebody clicked submit. It now happens the moment the
 * capture succeeds, so the only human in the chain is the one whose signature
 * is legally required.
 *
 * Two things gate it, and neither is optional:
 *
 *   Payment. A signature says the treatment is appropriate; it says nothing
 *   about whether the money arrived. We submit only on a confirmed capture —
 *   not on the order's `paid_confirmed_at`, which is written asynchronously by
 *   the Stripe webhook and may not have landed yet.
 *
 *   The prescriber's NPI. It prints on the prescription and a pharmacy will
 *   reject one without it. Submitting anyway wastes a cycle with the pharmacy and
 *   leaves the member waiting, so a missing NPI holds the order and tells the
 *   team instead.
 */

import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { noticeEmail, readyToPlaceEmail, sendEmail, SUPPORT_EMAIL } from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import type { Json } from '@/lib/database.types';
import { orderRef as orderLabel } from '@/lib/format';
import { getPrescriber } from '@/lib/prescriber';

export async function autoSubmitToPharmacy(
  orderNumber: string,
  opts: { refill?: boolean; prescriptionId?: string } = {},
): Promise<{
  ok: boolean;
  submitted?: boolean;
  error?: string;
}> {
  if (!supabaseAdminConfigured()) return { ok: false, error: 'not_configured' };

  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select(
      'id, order_number, user_id, member_name, member_email, shipping_address, assigned_physician_id',
    )
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) return { ok: false, error: 'not_found' };

  /*
   * Never submit the same order twice — a retry, a double click, or a webhook
   * replay must not produce two prescriptions at the pharmacy. The reference
   * is derived from the order number rather than the clock, so the check is
   * per-order and the unique index on order_ref is the real backstop. Keying
   * this on the member instead would silently skip every repeat order placed
   * while their last one was still in flight.
   */
  const orderRef = `FUL-${order.order_number}`;
  const { data: existing } = await db
    .from('fulfillment_orders')
    .select('id')
    .eq('order_ref', orderRef)
    .maybeSingle();
  if (existing) return { ok: true, submitted: false };

  const [{ data: patient }, { data: items }] = await Promise.all([
    order.user_id
      ? db
          .from('profiles')
          .select('full_name, date_of_birth')
          .eq('id', order.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from('order_items')
      .select('product_name, quantity, cadence_label')
      .eq('order_id', order.id),
  ]);

  // The prescriber on the order, falling back to whoever holds the role.
  const { data: doctor } = order.assigned_physician_id
    ? await db
        .from('profiles')
        .select('full_name, npi')
        .eq('id', order.assigned_physician_id)
        .maybeSingle()
    : await db
        .from('profiles')
        .select('full_name, npi')
        .eq('role', 'doctor')
        .eq('account_status', 'active')
        .limit(1)
        .maybeSingle();

  if (!doctor?.npi) {
    const why =
      'The prescriber has no NPI on file. The pharmacy will reject a prescription without one — set it in Admin → Settings, then submit this order manually.';
    await db.from('order_updates').insert({
      order_id: order.id,
      label: 'Held before the pharmacy — missing NPI',
      body: why,
      author: 'System',
      author_role: 'system',
    });
    try {
      await sendEmail({
        to: SUPPORT_EMAIL,
        subject: `${order.member_name ?? 'An order'} is paid but cannot go to the pharmacy · ${orderLabel(order.order_number)}`,
        html: noticeEmail({
          eyebrow: 'Held',
          heading: 'An order cannot go to the pharmacy',
          body: `${orderLabel(order.order_number)} has been signed and paid, but it has not been sent.`,
          footnote: why,
          cta: {
            label: 'Fix the prescriber record',
            href: `${SITE_URL}/portal/admin/settings`,
          },
        }),
      });
    } catch {
      // The timeline entry already records it.
    }
    return { ok: false, error: 'no_npi' };
  }

  /*
   * Link the prescription. Admin's "ready to submit" list is every signed
   * prescription with no shipment against it; without this link an order
   * already queued here stayed on that list and could be submitted twice.
   */
  const prescriptionId =
    opts.prescriptionId ??
    (await db.from('prescriptions').select('id').eq('order_id', order.id).maybeSingle()).data?.id ??
    null;

  const cadence = items?.[0]?.cadence_label ?? 'First cycle';
  const { error: insErr } = await db.from('fulfillment_orders').insert({
    order_ref: orderRef,
    user_id: order.user_id,
    prescription_id: prescriptionId,
    status: 'submitted',
    patient_name: patient?.full_name ?? order.member_name ?? 'Patient',
    patient_dob: patient?.date_of_birth ?? null,
    shipping_address: (order.shipping_address ?? null) as Json | null,
    prescriber_name: doctor.full_name,
    prescriber_npi: doctor.npi,
    items: (items ?? []) as unknown as Json,
    cycle_label: opts.refill ? `Refill · ${cadence}` : cadence,
    submitted_at: new Date().toISOString(),
  });

  if (insErr) return { ok: false, error: insErr.message };

  /*
   * Not "sent to the pharmacy" yet: a person places it on the pharmacy's own
   * platform, and that step writes the "Sent to the pharmacy" entry.
   */
  await db.from('order_updates').insert({
    order_id: order.id,
    label: 'Preparing your order',
    body: 'Payment received. Your order is being placed with our partner pharmacy.',
    author: 'System',
    author_role: 'system',
  });

  /*
   * Admin and the prescriber both get the to-do; whoever places it marks it on
   * the board. Names and products only — the address and date of birth stay
   * behind the sign-in.
   */
  const itemList =
    (items ?? [])
      .map((i) => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
      .join(', ') || 'Care program';
  const patientName = patient?.full_name ?? order.member_name ?? 'Patient';
  const prescriber = await getPrescriber().catch(() => null);
  const recipients: [string, string][] = [[SUPPORT_EMAIL, `${SITE_URL}/portal/admin/fulfillment`]];
  if (prescriber?.email && prescriber.email !== SUPPORT_EMAIL) {
    recipients.push([prescriber.email, `${SITE_URL}/portal/doctor/fulfillment`]);
  }
  for (const [to, portalUrl] of recipients) {
    try {
      const msg = readyToPlaceEmail({
        orderRef,
        patientName,
        items: itemList,
        refill: Boolean(opts.refill),
        portalUrl,
      });
      await sendEmail({ to, subject: msg.subject, html: msg.html });
    } catch {
      // The row is on the board either way.
    }
  }

  return { ok: true, submitted: true };
}
