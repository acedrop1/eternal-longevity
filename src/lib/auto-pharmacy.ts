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
 *   about whether the money arrived. We submit only once a charge has
 *   succeeded: lib/payment-record calls this as it records the payment.
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
import { TERMINAL_ORDER, monthsPerShipment } from '@/lib/order-rules';
import { advanceFulfillment } from '@/lib/fulfillment-core';
import { pharmacyEntryFor } from '@/lib/catalog';
import { buildPrescriptionPayload, type PayloadError } from '@/lib/rxhere-rules';
import { postPrescription, rxhereConfigured, rxhereSandbox, type RxHereErrorCode } from '@/lib/rxhere';

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
      .select('product_id, product_name, quantity, cadence, cadence_label')
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
  let prescriptionId =
    opts.prescriptionId ??
    (await db.from('prescriptions').select('id').eq('order_id', order.id).maybeSingle()).data?.id ??
    null;
  /*
   * A refill has no prescription of its own: it ships on its plan's. Recording
   * the payment (lib/payment-record) submits it before the renewal can say so,
   * so find the plan here. A first order always has its own, written at signing.
   */
  let refill = Boolean(opts.refill);
  if (!prescriptionId && order.user_id && items?.[0]?.product_id) {
    const { data: plan } = await db
      .from('subscriptions')
      .select('prescription_id')
      .eq('user_id', order.user_id)
      .eq('product_id', String(items[0].product_id))
      .not('prescription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (plan?.prescription_id) {
      prescriptionId = plan.prescription_id;
      refill = true;
    }
  }

  // A 12 month plan ships 6 months a box; say so to whoever places it by hand.
  const line = items?.[0];
  const cadence = `${line?.cadence_label ?? 'First cycle'}${line?.cadence === 'annual' ? ` · ${monthsPerShipment('annual')}-month box` : ''}`;
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
    // The lines as the board has always stored them; product_id was only for the lookup above.
    items: (items ?? []).map(({ product_id: _id, cadence: _c, ...l }) => l) as unknown as Json,
    cycle_label: refill ? `Refill · ${cadence}` : cadence,
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
    if (sent.sent) {
      // The team hears about every paid order, not only the ones to place by hand.
      try {
        await sendEmail({
          to: SUPPORT_EMAIL,
          subject: `${orderLabel(order.order_number)} paid and sent to the pharmacy`,
          html: noticeEmail({
            eyebrow: 'Paid order',
            heading: 'Paid and sent to the pharmacy',
            body: 'This order went to the pharmacy automatically. Nothing to place by hand; tracking arrives on its own.',
            rows: [['Order', orderLabel(order.order_number)]],
            cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin/fulfillment` },
          }),
        });
      } catch {
        // The order is with the pharmacy either way.
      }
      return { ok: true, submitted: true };
    }
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
        refill,
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
  sku_missing: 'No RxHere catalog ID for this product. Add it in Admin → Products (the IDs are listed in Admin → Settings → Pharmacy catalog), or place it in the RxHere portal.',
  no_directions: 'No directions on the prescription and no approved default for this product.',
  patient_incomplete: 'The patient’s legal name or date of birth is missing or invalid. Fix the profile, then retry.',
  no_address: 'The shipping address is missing a street, city, state or ZIP.',
  no_npi: 'The prescriber has no valid 10-digit NPI on file (Admin → Settings).',
  no_license: 'The prescriber has no licence number on file (Admin → Settings → Prescriber).',
  multi_item: 'More than one product on this order. Place it in the RxHere portal.',
};
const REJECTED: Partial<Record<RxHereErrorCode, string>> = {
  product_unavailable: 'RxHere says this product is not offered to us or is out of stock. Check the catalog ID in Admin → Products.',
  unauthorized: 'RxHere refused our API key. Check RXHERE_API_TOKEN in Vercel.',
  forbidden: 'Our API key is not allowed to place orders. Ask RxHere to adjust it.',
  account_not_open: 'RxHere says our account cannot place new orders right now. Contact RxHere.',
  invalid_npi: 'RxHere rejected the prescriber’s NPI. Check it in Admin → Settings.',
  invalid_dea: 'RxHere rejected the prescriber’s DEA number. Check it in Admin → Settings.',
  controlled_requires_dea: 'This product is a controlled substance and needs the prescriber’s DEA number (Admin → Settings).',
  license_state_mismatch: 'RxHere has no licence for the prescriber in the patient’s state. Add it in Admin → Settings → Prescriber.',
  validation_failed: 'RxHere rejected a field on the order. Check the patient’s details and the product, then retry.',
  order_rejected: 'RxHere could not place the order. Check its portal, then retry or place it by hand.',
  duplicate_request: 'RxHere is still processing this order. Retry in a minute.',
  rate_limited: 'RxHere asked us to slow down. Retry in a minute.',
  unavailable: 'RxHere did not answer. Retry in a few minutes.',
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
 * Send one paid order to RxHere (POST /prescriptions).
 *
 * Called when the order joins the board, and again from "Send to pharmacy" on
 * the order page. Never sends twice: an order with a pharmacy order id is
 * done, the SENDING claim below lets only one caller through at a time, and
 * our order number is the external_order_id, so a resend RxHere already has
 * returns the original order instead of a second one.
 *
 * Not sent means the row stays in "To place" with the reason on it, exactly
 * as a manual order does today.
 */
export async function sendToPharmacyApi(
  orderNumber: string,
  opts: { manual?: boolean } = {},
): Promise<{ sent: boolean; message: string }> {
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
    // ponytail: one product per order goes by API; multi-line orders are placed by hand until each line carries its own signed sig.
    if (items?.length !== 1) return fail('MANUAL', NOT_SENT.multi_item);
    const line = items[0];

    const rxQuery = db.from('prescriptions').select('directions, doctor_id');
    const [{ data: rx }, { data: profile }, { data: intake }, item] = await Promise.all([
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
      pharmacyEntryFor(String(line.product_id)),
    ]);
    const prescriber = await getPrescriber(rx?.doctor_id ?? order.assigned_physician_id ?? undefined);

    const answers = (intake?.answers ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    // The legal name as given at the assessment; a profile name only if it has both parts.
    const [pFirst, ...pRest] = str(profile?.full_name).split(/\s+/);

    const built = buildPrescriptionPayload({
      orderNumber: order.order_number,
      patientId: String(order.user_id),
      item,
      cadence: String(line.cadence ?? 'monthly'),
      lineQty: line.quantity ?? 1,
      sig: rx?.directions ?? item?.defaultSig ?? null,
      patient: {
        firstName: str(answers.first_name) || (pRest.length ? pFirst : null),
        lastName: str(answers.last_name) || (pRest.length ? pRest.join(' ') : null),
        dob: profile?.date_of_birth ?? answers.dob,
        answers,
        phone: profile?.phone ?? null,
        email: order.member_email,
      },
      address: (order.shipping_address ?? null) as Record<string, unknown> | null,
      prescriber: {
        name: prescriber.display || prescriber.name,
        npi: prescriber.npi,
        dea: prescriber.dea,
        licenses: { ...prescriber.otherLicenses, ...(prescriber.licenseState ? { [prescriber.licenseState]: prescriber.licenseNumber } : {}) },
      },
    });
    if (!built.ok) return fail(built.error === 'sku_missing' ? 'MANUAL' : 'ERROR', NOT_SENT[built.error]);

    const res = await postPrescription(built.payload);
    if (!res.ok) return fail('ERROR', REJECTED[res.code] ?? `RxHere rejected the order (${res.code}). Retry, or place it by hand.`);
    const placed = res.data;

    /*
     * Sandbox key (vr_test_): every check passed and nothing was created. The
     * row stays in "To place" so a person places it, or it goes again once the
     * live key is in.
     */
    if (placed.sandbox || rxhereSandbox()) {
      return fail('DRY_RUN', 'Sandbox key: RxHere accepted every field, but nothing was created. Place it by hand, or retry once the live key is in.');
    }
    if (!placed.order_id) {
      return fail('ERROR', 'RxHere answered without an order id. Check its portal; a retry returns the same order.');
    }

    // RxHere charges our card on file per order; a decline leaves it unfilled until paid.
    const unpaid = placed.payment_status === 'awaiting_payment';
    await settle(unpaid ? 'AWAITING_PAYMENT' : 'SUBMITTED', unpaid ? 'RxHere could not charge our card on file. Update the card in the RxHere portal; it fills once paid.' : null, {
      pharmacy_order_id: placed.order_id,
      // RxHere's own order number, as its portal shows it.
      pharmacy_batch_id: placed.order_number ?? null,
      pharmacy_submitted_at: now(),
    });
    if (unpaid) {
      await alertCareTeam({
        orderNumber: order.order_number,
        eyebrow: 'Pharmacy payment',
        heading: 'RxHere could not charge our card',
        body: 'The order is at RxHere but will not be filled until it is paid. Update the card on file in the RxHere portal.',
      });
    }

    // The same step as "Mark placed" on the board: row, order and timeline move together.
    await advanceFulfillment({
      orderNumber: order.order_number,
      step: 'placed',
      actorName: 'System',
      actorRole: 'pharmacy',
      pharmacyRef: placed.order_number ?? placed.order_id,
      note: 'Sent to our partner pharmacy. A pharmacist verifies your prescription before compounding starts.',
      // Only paid orders reach the board, and the pharmacy has it now either way.
      paymentConfirmed: true,
    });
    return { sent: true, message: `Sent to the pharmacy (order ${placed.order_number ?? placed.order_id}).` };
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
 * the pharmacy and hasn't shipped, tell the care team to cancel it in the
 * RxHere portal (the API has no cancel). `cancelByHand` says so to whoever
 * pressed cancel.
 */
export async function withdrawFromPharmacy(orderNumber: string): Promise<{ cancelByHand: boolean }> {
  if (!supabaseAdminConfigured()) return { cancelByHand: false };
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
  if (row && ['shipped', 'delivered'].includes(row.status)) return { cancelByHand: false };
  if (order?.pharmacy_status === 'CANCELLED') return { cancelByHand: false };

  const byHand = async (body: string) => {
    await alertCareTeam({
      orderNumber,
      eyebrow: 'Cancel by hand',
      heading: 'Cancel an order in the pharmacy portal',
      body,
    });
    return { cancelByHand: true };
  };

  // Placed in the pharmacy portal by a person: nothing here can reach it.
  if (!order?.pharmacy_order_id) {
    return row?.status === 'accepted'
      ? byHand('This order was cancelled here after it was placed with the pharmacy by hand. Cancel it in the pharmacy portal before it ships.')
      : { cancelByHand: false };
  }
  // The API has no cancel: a person cancels it in the RxHere portal before it ships.
  return byHand(
    `This order was cancelled here. Cancel RxHere order ${order.pharmacy_order_id} in the RxHere portal before it ships.`,
  );
}
