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
import { BUSINESS_LEGAL_NAME } from '@/lib/site';
import { TERMINAL_ORDER } from '@/lib/order-rules';
import { advanceFulfillment } from '@/lib/fulfillment-core';
import { getCatalogProduct } from '@/lib/catalog';
import { PHARMACY_CATALOG, shippingMethodFor } from '@/lib/pharmacy-catalog';
import { buildOrderPayload, isPatientSpecific, type PayloadError } from '@/lib/rxhere-rules';
import {
  cancelPharmacyOrder,
  getPharmacyOrder,
  rxhereConfigured,
  rxhereDryRun,
  submitPharmacyOrder,
  type RxHereErrorCode,
} from '@/lib/rxhere';

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
        subject: `A paid order cannot go to the pharmacy · ${orderLabel(order.order_number)}`,
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
   * Straight to the pharmacy over its API when it can go: configured, a SKU
   * for the product, and everything the pharmacist needs. Anything else stays
   * on the board below for a person, with the reason on the row.
   */
  if (rxhereConfigured()) {
    const sent = await sendToPharmacyApi(order.order_number);
    if (sent.sent) return { ok: true, submitted: true };
  }

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

/* -------------------------------------------------------------------------- */
/*  The pharmacy's partner API                                                */
/* -------------------------------------------------------------------------- */

/** A submit older than this with no answer is treated as dead and may be retried. */
const STUCK_MS = 2 * 60_000;

/*
 * Why an order did not go, as staff read it on the board. Fixed text only:
 * this lands in orders.pharmacy_error, never anything from the patient record
 * or the pharmacy's response body.
 */
const NOT_SENT: Record<PayloadError | 'multi_item', string> = {
  sku_missing: 'No pharmacy SKU yet. Place it in the pharmacy portal.',
  no_directions: 'No directions on the prescription and no approved default for this product.',
  patient_incomplete: 'The patient’s legal name or date of birth is missing or invalid. Fix the profile, then retry.',
  no_address: 'No shipping address on the order.',
  no_npi: 'The prescriber has no valid 10-digit NPI on file (Admin → Settings).',
  multi_item: 'More than one product on this order. Place it in the pharmacy portal.',
};
const REJECTED: Record<RxHereErrorCode, string> = {
  sku_unknown: 'The pharmacy does not recognise this SKU. Check the pharmacy catalogue map, then retry.',
  patient_incomplete: 'The pharmacy rejected the patient’s name, date of birth or address. Fix them, then retry.',
  bad_request: 'The pharmacy rejected the order (400). Retry, or place it by hand.',
  auth: 'The pharmacy refused our API token. Check RXHERE_API_TOKEN.',
  not_found: 'The pharmacy reported a duplicate but could not return it. Check its portal before retrying.',
  conflict: 'The pharmacy already has this order number. Check its portal before retrying.',
  unavailable: 'The pharmacy API did not answer. Retry in a few minutes.',
  not_configured: 'The pharmacy API is not configured.',
};

/**
 * Tell the care team (and, for clinical questions, the prescriber) that an
 * order needs a person. The subject carries the order number and nothing
 * else; the details are behind the sign-in on the board.
 */
export async function alertCareTeam(input: {
  orderNumber: string;
  eyebrow: string;
  heading: string;
  body: string;
  prescriber?: boolean;
}): Promise<void> {
  const recipients: [string, string][] = [[SUPPORT_EMAIL, `${SITE_URL}/portal/admin/fulfillment`]];
  if (input.prescriber) {
    const doc = await getPrescriber().catch(() => null);
    if (doc?.email && doc.email !== SUPPORT_EMAIL) recipients.push([doc.email, `${SITE_URL}/portal/doctor/fulfillment`]);
  }
  for (const [to, href] of recipients) {
    try {
      await sendEmail({
        to,
        subject: `${input.heading} · ${orderLabel(input.orderNumber)}`,
        html: noticeEmail({
          eyebrow: input.eyebrow,
          heading: input.heading,
          body: `${orderLabel(input.orderNumber)}: ${input.body}`,
          cta: { label: 'Open the orders board', href },
        }),
      });
    } catch {
      // The board shows it either way.
    }
  }
}

/**
 * Send one paid order to the pharmacy over its API.
 *
 * Called when the order joins the board, and again from the board's "Retry
 * send to pharmacy". Never sends twice: an order with a pharmacy order id is
 * done, the SENDING claim below lets only one caller through at a time, and
 * our order number is the partnerOrderId, so a resend the pharmacy already has
 * comes back 409 and is reconciled instead of duplicated.
 *
 * Not sent means the row stays in "To place" with the reason on it, exactly
 * as a manual order does today.
 */
export async function sendToPharmacyApi(orderNumber: string): Promise<{ sent: boolean; message: string }> {
  if (!rxhereConfigured() || !supabaseAdminConfigured()) {
    return { sent: false, message: 'The pharmacy API is not configured. Place it by hand.' };
  }
  const db = createSupabaseAdminClient();
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, user_id, member_email, shipping_address, status, assigned_physician_id, pharmacy_order_id')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (!order) return { sent: false, message: 'Order not found.' };
  if (order.pharmacy_order_id) return { sent: true, message: 'Already with the pharmacy.' };
  if (TERMINAL_ORDER.includes(order.status)) return { sent: false, message: 'This order is closed.' };

  const { data: row } = await db
    .from('fulfillment_orders')
    .select('id, status, prescription_id')
    .eq('order_ref', `FUL-${order.order_number}`)
    .maybeSingle();
  if (!row || !['draft', 'submitted'].includes(row.status)) {
    return { sent: false, message: 'This order is not waiting to be placed.' };
  }

  const now = () => new Date().toISOString();
  const stuck = new Date(Date.now() - STUCK_MS).toISOString();
  const { data: claimed } = await db
    .from('orders')
    .update({ pharmacy_status: 'SENDING', pharmacy_error: null, pharmacy_updated_at: now() })
    .eq('id', order.id)
    .is('pharmacy_order_id', null)
    .or(
      `pharmacy_status.is.null,pharmacy_status.in.(ERROR,MANUAL,DRY_RUN),and(pharmacy_status.eq.SENDING,pharmacy_updated_at.lt.${stuck})`,
    )
    .select('id');
  if (!claimed?.length) return { sent: false, message: 'A send to the pharmacy is already in progress.' };

  const settle = (status: string, error: string | null, extra: Record<string, string | null> = {}) =>
    db
      .from('orders')
      .update({ pharmacy_status: status, pharmacy_error: error, pharmacy_updated_at: now(), ...extra })
      .eq('id', order.id);

  const fail = async (status: 'ERROR' | 'MANUAL' | 'DRY_RUN', message: string) => {
    await settle(status, message);
    if (status === 'ERROR') {
      await alertCareTeam({
        orderNumber: order.order_number,
        eyebrow: 'Not sent',
        heading: 'An order could not be sent to the pharmacy',
        body: 'It is still in "To place" on the orders board with the reason. Fix it and retry, or place it by hand.',
      });
    }
    return { sent: false, message };
  };

  const send = async (): Promise<{ sent: boolean; message: string }> => {
    const { data: items } = await db
      .from('order_items')
      .select('product_id, quantity, cadence')
      .eq('order_id', order.id);
    if (items?.length !== 1) return fail('MANUAL', NOT_SENT.multi_item);
    const line = items[0];

    const rxQuery = db.from('prescriptions').select('directions, doctor_id');
    const [{ data: rx }, { data: profile }, { data: intake }, product] = await Promise.all([
      row.prescription_id
        ? rxQuery.eq('id', row.prescription_id).maybeSingle()
        : rxQuery.eq('order_id', order.id).maybeSingle(),
      db.from('profiles').select('full_name, date_of_birth, phone').eq('id', order.user_id).maybeSingle(),
      // Every saved intake carries the answers on file, so the newest is complete.
      db
        .from('intake_submissions')
        .select('answers')
        .eq('user_id', order.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      getCatalogProduct(String(line.product_id)),
    ]);
    const prescriber = await getPrescriber(rx?.doctor_id ?? order.assigned_physician_id ?? undefined);

    const answers = (intake?.answers ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    // The legal name as given at the assessment; a profile name only if it has both parts.
    const [pFirst, ...pRest] = str(profile?.full_name).split(/\s+/);
    const item = PHARMACY_CATALOG[String(line.product_id)] ?? null;

    const built = buildOrderPayload({
      orderNumber: order.order_number,
      item,
      cadence: String(line.cadence ?? 'monthly'),
      lineQty: line.quantity ?? 1,
      sig: rx?.directions ?? item?.defaultSig ?? null,
      shippingMethod: shippingMethodFor(product?.storage),
      patient: {
        firstName: str(answers.first_name) || (pRest.length ? pFirst : null),
        lastName: str(answers.last_name) || (pRest.length ? pRest.join(' ') : null),
        dob: profile?.date_of_birth ?? answers.dob,
        answers,
        phone: profile?.phone ?? null,
        email: order.member_email,
      },
      address: (order.shipping_address ?? null) as Record<string, unknown> | null,
      prescriber,
      practiceName: BUSINESS_LEGAL_NAME,
    });
    if (!built.ok) return fail(built.error === 'sku_missing' ? 'MANUAL' : 'ERROR', NOT_SENT[built.error]);
    const payload = built.payload;

    if (rxhereDryRun()) {
      // Shape only: which fields are filled, never their values.
      console.info(
        `[rxhere] dry run · order ${order.order_number} · sku ${payload.sku} · ${payload.shippingMethod} · qty ${payload.quantity} · patient fields ${Object.keys(payload.patient).filter((k) => payload.patient[k as keyof typeof payload.patient] !== undefined).join(',')}`,
      );
      return fail('DRY_RUN', 'Dry run: the order was built but not sent. Place it by hand.');
    }

    let res = await submitPharmacyOrder(payload);
    // Already there (a retry after a timeout that did land): adopt it, don't resend.
    if (!res.ok && res.code === 'conflict') res = await getPharmacyOrder(order.order_number);
    if (!res.ok) return fail('ERROR', REJECTED[res.code]);
    const placed = res.data;

    /*
     * Patient-specific only. A research-use (RUO) order carries no patient and
     * ships to the provider; if the pharmacy ever answers with one, it is
     * cancelled on the spot and a person takes over. The id is kept so it is
     * never resent automatically.
     */
    if (!isPatientSpecific(placed)) {
      const cancel = await cancelPharmacyOrder(placed.orderId || order.order_number);
      const cancelled = cancel.ok && cancel.data.success !== false;
      await settle(
        'ERROR',
        cancelled
          ? 'The pharmacy took this as a research-use order, not a patient prescription. It was cancelled automatically. Do not resend until the pharmacy fixes the account.'
          : 'The pharmacy took this as a research-use order, not a patient prescription, and the automatic cancel failed. Cancel it in the pharmacy portal now.',
        { pharmacy_order_id: placed.orderId ?? null, pharmacy_batch_id: placed.batchId ?? null },
      );
      await alertCareTeam({
        orderNumber: order.order_number,
        eyebrow: 'Pharmacy error',
        heading: cancelled ? 'A pharmacy order was cancelled automatically' : 'Cancel a pharmacy order now',
        body: cancelled
          ? 'The pharmacy answered as a research-use order, not a patient prescription, so it was cancelled. Place it by hand and raise it with the pharmacy.'
          : 'The pharmacy answered as a research-use order, not a patient prescription, and the automatic cancel failed. Cancel it in the pharmacy portal now.',
      });
      return { sent: false, message: 'The pharmacy answered as research-use, not patient-specific. See the order.' };
    }

    if (!placed?.orderId) {
      return fail('ERROR', 'The pharmacy answered without an order id. Check its portal; a retry reconciles it.');
    }

    await settle(placed.status || 'SUBMITTED', null, {
      pharmacy_order_id: placed.orderId,
      pharmacy_batch_id: placed.batchId ?? null,
      pharmacy_submitted_at: now(),
    });

    // The same step as "Mark placed" on the board: row, order and timeline move together.
    await advanceFulfillment({
      orderNumber: order.order_number,
      step: 'placed',
      actorName: 'System',
      actorRole: 'pharmacy',
      pharmacyRef: placed.orderId,
      note: 'Sent to our partner pharmacy. A pharmacist verifies your prescription before compounding starts.',
    });
    return { sent: true, message: `Sent to the pharmacy (order ${placed.orderId}).` };
  };

  try {
    return await send();
  } catch {
    // A throw mid-send must not leave the claim stuck or reach the signing that
    // called this. If it did land, the retry's 409 reconciles it.
    return fail('ERROR', 'Something went wrong sending this order. Retry, or place it by hand.');
  }
}

/**
 * Staff cancelled an order: take it off the board and, if it already went to
 * the pharmacy and hasn't shipped, cancel it there. A cancel the API refuses
 * is a person's job, so the care team is told to do it in the pharmacy portal.
 */
export async function withdrawFromPharmacy(orderNumber: string): Promise<void> {
  if (!supabaseAdminConfigured()) return;
  const db = createSupabaseAdminClient();
  const [{ data: order }, { data: row }] = await Promise.all([
    db.from('orders').select('id, pharmacy_order_id, pharmacy_status').eq('order_number', orderNumber).maybeSingle(),
    db.from('fulfillment_orders').select('id, status').eq('order_ref', `FUL-${orderNumber}`).maybeSingle(),
  ]);
  if (row && ['draft', 'submitted', 'accepted'].includes(row.status)) {
    await db
      .from('fulfillment_orders')
      .update({ status: 'canceled' })
      .eq('id', row.id)
      .in('status', ['draft', 'submitted', 'accepted']);
  }
  if (!order?.pharmacy_order_id || !rxhereConfigured()) return;
  if (row && ['shipped', 'delivered'].includes(row.status)) return;
  if (order.pharmacy_status === 'CANCELLED') return;

  const res = await cancelPharmacyOrder(orderNumber);
  if (res.ok && res.data.success !== false) {
    await db
      .from('orders')
      .update({ pharmacy_status: 'CANCELLED', pharmacy_updated_at: new Date().toISOString() })
      .eq('id', order.id);
    await db.from('order_updates').insert({
      order_id: order.id,
      label: 'Cancelled at the pharmacy',
      body: 'The pharmacy order was cancelled before it shipped.',
      author: 'System',
      author_role: 'system',
    });
    return;
  }
  await alertCareTeam({
    orderNumber,
    eyebrow: 'Cancel by hand',
    heading: 'Cancel an order in the pharmacy portal',
    body: `This order was cancelled here, but the pharmacy did not accept the cancel (pharmacy order ${order.pharmacy_order_id}). Cancel it in the pharmacy portal before it ships.`,
  });
}
