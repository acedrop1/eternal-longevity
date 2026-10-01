/**
 * The pharmacy's status webhook (RXHere).
 *
 * The pharmacy posts each step of an order — compounding, QA, shipped,
 * delivered, holds and exceptions — with our webhook secret in both
 * x-courier-secret and x-webhook-secret. It wants a 200 within 10 seconds and
 * retries up to six times, so the request does only the minimum: check the
 * secret, parse, and record the event (the record is the idempotency guard —
 * a retry or replay inserts nothing and is answered 200). The work runs after
 * the response.
 *
 * The work goes through advanceFulfillment, the same path as the board's
 * buttons, so the member's emails, texts and check-in clock fire exactly as
 * when a person marks the step, and its conditional updates mean a late event
 * never moves an order backwards.
 *
 * Give the pharmacy: https://www.etlongevity.com/api/webhooks/rxhere
 */
import { after, NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { advanceFulfillment } from '@/lib/fulfillment-core';
import { alertCareTeam } from '@/lib/auto-pharmacy';
import {
  nextPharmacyStatus,
  parseWebhook,
  planWebhookEvent,
  secretMatches,
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
  if (!secretMatches([req.headers.get('x-webhook-secret'), req.headers.get('x-courier-secret')], secret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: 'Too large.' }, { status: 413 });
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
  const [{ data: order }, { data: row }] = await Promise.all([
    db.from('orders').select('id, pharmacy_status').eq('order_number', w.reference).maybeSingle(),
    db.from('fulfillment_orders').select('id, status').eq('order_ref', `FUL-${w.reference}`).maybeSingle(),
  ]);
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
      orderNumber: w.reference,
      step,
      actorName: 'Pharmacy',
      actorRole: 'pharmacy',
      carrier: w.carrier ?? 'FedEx',
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

  // The reason stays on the board (pharmacy_events is staff-only), never in an email.
  if (plan.alert === 'hold') {
    await alertCareTeam({
      orderNumber: w.reference,
      eyebrow: 'Pharmacy hold',
      heading: 'The pharmacist needs a clarification',
      body: 'The pharmacy put this order on hold and needs an answer from the prescriber. The pharmacist’s note is on the orders board.',
      prescriber: true,
    });
  } else if (plan.alert === 'exception') {
    await alertCareTeam({
      orderNumber: w.reference,
      eyebrow: 'Delivery exception',
      heading: 'A delivery hit a problem',
      body: 'The carrier reported an exception (delay, address or reschedule). The details are on the orders board.',
    });
  } else if (plan.alert === 'cancelled' && order.pharmacy_status !== 'CANCELLED') {
    // Already CANCELLED means we cancelled it ourselves; this is just the echo.
    await alertCareTeam({
      orderNumber: w.reference,
      eyebrow: 'Pharmacy cancelled',
      heading: 'The pharmacy cancelled an order',
      body: 'Nothing will ship from the pharmacy. Decide whether to place it again or refund the member; neither happens automatically. The reason is on the orders board.',
    });
  } else if (plan.alert === 'no_tracking') {
    await alertCareTeam({
      orderNumber: w.reference,
      eyebrow: 'Shipped, no tracking',
      heading: 'An order shipped without a tracking number',
      body: 'The pharmacy marked it shipped but sent no tracking, so the member has not been told. Get the tracking from the pharmacy portal and mark it shipped on the board.',
    });
  }
}
