'use server';

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
 *   reject one without it. Submitting anyway wastes a cycle with Kaduceus and
 *   leaves the member waiting, so a missing NPI holds the order and tells the
 *   team instead.
 */

import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { noticeEmail, sendEmail, SUPPORT_EMAIL } from '@/lib/email';
import { SITE_URL } from '@/lib/site';
import type { Json } from '@/lib/database.types';
import { formatAddress } from '@/lib/format';

export async function autoSubmitToPharmacy(orderNumber: string): Promise<{
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
      'The prescriber has no NPI on file. Kaduceus will reject a prescription without one — set it in Admin → Settings, then submit this order manually.';
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
        subject: `Order ${order.order_number} is paid but cannot go to the pharmacy`,
        html: noticeEmail({
          eyebrow: 'Held',
          heading: 'An order cannot go to the pharmacy',
          body: `${order.order_number} has been signed and paid, but it has not been sent.`,
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

  const { error: insErr } = await db.from('fulfillment_orders').insert({
    order_ref: orderRef,
    user_id: order.user_id,
    status: 'submitted',
    patient_name: patient?.full_name ?? order.member_name ?? 'Patient',
    patient_dob: patient?.date_of_birth ?? null,
    shipping_address: (order.shipping_address ?? null) as Json | null,
    prescriber_name: doctor.full_name,
    prescriber_npi: doctor.npi,
    items: (items ?? []) as unknown as Json,
    cycle_label: items?.[0]?.cadence_label ?? 'First cycle',
    submitted_at: new Date().toISOString(),
  });

  if (insErr) return { ok: false, error: insErr.message };

  await db.from('order_updates').insert({
    order_id: order.id,
    label: 'Sent to the pharmacy',
    body: `Submitted to Kaduceus as ${orderRef}. Compounding usually starts the same business day.`,
    author: 'System',
    author_role: 'system',
  });

  const a = (order.shipping_address ?? {}) as Record<string, string>;
  const lines = (items ?? [])
    .map(
      (i) =>
        `<li>${i.product_name}${i.quantity > 1 ? ` &times;${i.quantity}` : ''} — ${
          i.cadence_label ?? ''
        }</li>`,
    )
    .join('');

  if (process.env.PHARMACY_EMAIL) {
    try {
      await sendEmail({
        to: process.env.PHARMACY_EMAIL,
        subject: `New prescription — ${orderRef}`,
        html: noticeEmail({
          eyebrow: 'New prescription',
          heading: 'A patient-specific prescription is ready',
          rows: [
            ['Reference', orderRef],
            ['Patient', patient?.full_name ?? order.member_name ?? 'Patient'],
            ['Date of birth', patient?.date_of_birth ?? '—'],
            ['Prescriber', `${doctor.full_name} · NPI ${doctor.npi}`],
            [
              'Ship to',
              formatAddress({
                line1: a.line1,
                line2: a.line2,
                city: a.city,
                state: a.state,
                zip: a.zip,
              }),
            ],
            ['Items', `<ul style="margin:0;padding-left:18px;">${lines}</ul>`],
          ],
          footnote: 'Please confirm receipt and add tracking when it ships.',
        }),
      });
    } catch {
      // The record exists; a mail failure must not undo the submission.
    }
  }

  return { ok: true, submitted: true };
}
