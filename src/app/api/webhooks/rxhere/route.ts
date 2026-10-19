/**
 * The pharmacy's order webhook (RxHere Integration Guide §7).
 *
 * RxHere posts order.paid, order.invoiced, order.shipped, order.delivered and
 * order.exception, signed in X-Webhook-Signature (HMAC-SHA256 of the raw body
 * with our signing secret). It retries a slow or failing answer, so the
 * request does only the minimum: check the signature, parse, and record the
 * event (order_id + event + occurred_at is unique, so a retry inserts nothing
 * and is answered 200). The work runs after the response.
 *
 * The work goes through advanceFulfillment, the same path as the board's
 * buttons, so the member's emails, texts and check-in clock fire exactly as
 * when a person marks the step, and its conditional updates mean a late event
 * never moves an order backwards.
 *
 * Give RxHere: https://www.etlongevity.com/api/webhooks/rxhere
 */
import { after, NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { advanceFulfillment } from '@/lib/fulfillment-core';
import { alertCareTeam } from '@/lib/auto-pharmacy';
import {
  nextPharmacyStatus,
  parseWebhook,
  planWebhookEvent,
  signatureValid,
  type RxHereWebhook,
} from '@/lib/rxhere-rules';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 64 * 1024;

export async function POST(req: NextRequest) {
  const secret = process.env.RXHERE_WEBHOOK_SECRET;
  if (!secret || !supabaseAdminConfigured()) {
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: 'Too large.' }, { status: 413 });
  // Over the exact bytes received: re-serialising parsed JSON would not match.
  if (!signatureValid(raw, req.headers.get('x-webhook-signature'), secret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  let w: RxHereWebhook | null = null;
  try {
    w = parseWebhook(JSON.parse(raw));
  } catch {
    // Falls through to the 400.
  }
  // Not retryable either way: a body we can't read won't read better next time.
  if (!w) return NextResponse.json({ error: 'Unrecognised payload.' }, { status: 400 });

  const db = createSupabaseAdminClient();
  const { data: rec, error } = await db
    .from('pharmacy_events')
    .insert({
      reference: w.reference,
      event: w.event,
      occurred_at: w.occurredAt,
      tracking_number: w.trackingNumber,
      carrier: w.carrier,
      reason: w.reason,
    })
    .select('id')
    .single();
  if (error?.code === '23505') return NextResponse.json({ received: true, duplicate: true });
  if (error || !rec) {
    console.error('[rxhere webhook] could not record event', w.event, error?.code);
    // 500 so the pharmacy retries; nothing was recorded, so nothing is skipped.
    return NextResponse.json({ error: 'Try again.' }, { status: 500 });
  }

  const event = w;
  after(async () => {
    try {
      await applyEvent(event);
      await db.from('pharmacy_events').update({ processed_at: new Date().toISOString() }).eq('id', rec.id);
    } catch (err) {
      // Recorded, so a retry would be skipped: a person has to look.
      console.error('[rxhere webhook] failed applying', event.event, err instanceof Error ? err.name : 'error');
      await alertCareTeam({
        orderNumber: event.reference,
        eyebrow: 'Pharmacy update',
        heading: 'A pharmacy update could not be applied',
        body: `The pharmacy sent ${event.event} for this order and it was not applied. Check the order against the pharmacy portal.`,
      });
    }
  });

  return NextResponse.json({ received: true });
}

async function applyEvent(w: RxHereWebhook): Promise<void> {
  const db = createSupabaseAdminClient();
  // The event names RxHere's order_id; ours was stored when the order was placed.
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, pharmacy_status')
    .eq('pharmacy_order_id', w.reference)
    .maybeSingle();
  const { data: row } = order
    ? await db.from('fulfillment_orders').select('id, status').eq('order_ref', `FUL-${order.order_number}`).maybeSingle()
    : { data: null };
  if (!order || !row) {
    // Not one of ours (or a manual test). Recorded; nothing to move.
    console.warn('[rxhere webhook] no order for reference', w.event);
    return;
  }

  const status = nextPharmacyStatus(order.pharmacy_status, w.event);
  if (status) {
    await db
      .from('orders')
      .update({ pharmacy_status: status, pharmacy_updated_at: new Date().toISOString() })
      .eq('id', order.id);
  }

  const plan = planWebhookEvent(w, row.status);
  for (const step of plan.steps) {
    await advanceFulfillment({
      fulfillmentId: row.id,
      orderNumber: order.order_number,
      step,
      actorName: 'Pharmacy',
      actorRole: 'pharmacy',
      carrier: w.carrier ?? 'Carrier',
      tracking: w.trackingNumber ?? undefined,
    });
  }

  if (plan.timeline) {
    await db.from('order_updates').insert({
      order_id: order.id,
      label: plan.timeline.label,
      body: plan.timeline.body,
      author: 'Pharmacy',
      author_role: 'pharmacy',
    });
  }

  if (plan.alert === 'exception') {
    await alertCareTeam({
      orderNumber: order.order_number,
      eyebrow: 'Delivery exception',
      heading: 'A delivery hit a problem',
      body: 'The carrier reported an exception (delay, address or reschedule). Check the order in the RxHere portal.',
    });
  } else if (plan.alert === 'no_tracking') {
    await alertCareTeam({
      orderNumber: order.order_number,
      eyebrow: 'Shipped, no tracking',
      heading: 'An order shipped without a tracking number',
      body: 'The pharmacy marked it shipped but sent no tracking, so the member has not been told. Get the tracking from the RxHere portal and mark it shipped on the board.',
    });
  }
}
