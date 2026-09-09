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
import { sendEmail, SUPPORT_EMAIL } from '@/lib/email';
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

  // Never submit the same order twice — a retry, a double click, or a webhook
  // replay must not produce two prescriptions at the pharmacy.
  const { data: existing } = await db
    .from('fulfillment_orders')
    .select('id')
    .eq('user_id', order.user_id ?? '')
    .in('status', ['draft', 'submitted', 'accepted', 'shipped'])
    .limit(1)
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
        html: `<p>${order.order_number} has been signed and paid, but it has not been sent to Kaduceus.</p><p>${why}</p>`,
      });
    } catch {
      // The timeline entry already records it.
    }
    return { ok: false, error: 'no_npi' };
  }

  const orderRef = `FUL-${Date.now().toString(36).toUpperCase()}`;
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
        html: `<p>A new patient-specific prescription is ready.</p>
               <p><strong>Reference:</strong> ${orderRef}<br/>
               <strong>Patient:</strong> ${patient?.full_name ?? order.member_name ?? 'Patient'}<br/>
               <strong>DOB:</strong> ${patient?.date_of_birth ?? '—'}<br/>
               <strong>Prescriber:</strong> ${doctor.full_name} · NPI ${doctor.npi}</p>
               <p><strong>Ship to:</strong><br/>${formatAddress({
                 line1: a.line1,
                 line2: a.line2,
                 city: a.city,
                 state: a.state,
                 zip: a.zip,
               })}</p>
               <ul>${lines}</ul>
               <p>Please confirm receipt and add tracking when it ships.</p>`,
      });
    } catch {
      // The record exists; a mail failure must not undo the submission.
    }
  }

  return { ok: true, submitted: true };
}
