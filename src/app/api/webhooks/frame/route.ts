/**
 * Frame webhook: charges settling late, refunds and disputes made anywhere
 * (the Frame dashboard included).
 *
 * Production: Frame dashboard → Developer → Webhooks → Create webhook, URL
 * https://www.etlongevity.com/api/webhooks/frame, events below; copy the
 * signing secret into FRAME_WEBHOOK_SECRET.
 *   transfer.succeeded  transfer.failed  transfer.refunded  transfer.disputed
 *   refund.created  charge.dispute.created  charge.dispute.closed_won  charge.dispute.closed_lost
 * Frame says to use the transfer.* family only for payments: charge.* fires
 * in parallel for the same money.
 *
 * The signature has no timestamp, so an old genuine event could be replayed.
 * Nothing here trusts the body beyond the transfer id: the transfer is read
 * back from Frame, and recordPayment only moves an order forward once.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { getTransfer, verifyWebhook } from '@/lib/frame';
import { recordPayment } from '@/lib/payment-record';
import { syncProcessorAmounts } from '@/lib/profit-data';
import { noticeEmail, sendEmail, SUPPORT_EMAIL } from '@/lib/email';
import { orderRef } from '@/lib/format';
import { SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FrameEvent {
  id: string;
  type: string;
  data: Record<string, unknown> & { id?: string; transfer?: string; charge_intent?: string };
}

export async function POST(req: NextRequest) {
  if (!process.env.FRAME_SECRET_KEY || !process.env.FRAME_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Frame webhook is not configured.' }, { status: 503 });
  }
  const body = await req.text();
  if (!verifyWebhook(body, req.headers.get('x-frame-signature'))) {
    return NextResponse.json({ error: 'Bad signature.' }, { status: 400 });
  }
  let event: FrameEvent;
  try {
    event = JSON.parse(body) as FrameEvent;
  } catch {
    return NextResponse.json({ error: 'Bad body.' }, { status: 400 });
  }
  if (!supabaseAdminConfigured()) return NextResponse.json({ received: true });

  try {
    await handle(event);
  } catch (err) {
    console.error(`[frame webhook] failed handling ${event.type}`, err instanceof Error ? err.message : err);
    // 5xx: Frame retries (up to 3 attempts).
    return NextResponse.json({ error: 'Handler error.' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function handle(event: FrameEvent): Promise<void> {
  const db = createSupabaseAdminClient();
  // transfer.* carry the transfer itself; refund.* and disputes point at it.
  const transferId = event.type.startsWith('transfer.') ? event.data.id : event.data.transfer;

  switch (event.type) {
    case 'transfer.succeeded': {
      if (!transferId) return;
      const t = await getTransfer(transferId);
      if (!t.ok) throw new Error(`transfer read failed: ${t.code}`);
      await recordPayment(db, t.data);
      return;
    }
    case 'transfer.failed': {
      // The caller that charged already told the member or the team; a late
      // failure (after fraud review) leaves a note on the order.
      if (!transferId) return;
      const { data: order } = await db
        .from('orders')
        .select('id, paid_confirmed_at')
        .eq('frame_transfer_id', transferId)
        .maybeSingle();
      if (!order || order.paid_confirmed_at) return;
      await db.from('order_updates').insert({
        order_id: order.id,
        label: 'Payment failed',
        body: 'We could not charge your card. Please update your payment method.',
      });
      return;
    }
    case 'transfer.refunded':
    case 'refund.created': {
      if (transferId) await syncProcessorAmounts(db, transferId);
      return;
    }
    case 'transfer.disputed':
    case 'charge.dispute.created':
    case 'charge.dispute.closed_won':
    case 'charge.dispute.closed_lost': {
      await alertDispute(db, event, transferId ?? null);
      return;
    }
    default:
      return;
  }
}

/** A chargeback opened or closed: the team hears about it with the order it hit. */
async function alertDispute(db: ReturnType<typeof createSupabaseAdminClient>, event: FrameEvent, transferId: string | null) {
  const { data: order } = transferId
    ? await db.from('orders').select('order_number').eq('frame_transfer_id', transferId).maybeSingle()
    : { data: null };
  const outcome =
    event.type === 'charge.dispute.closed_won' ? 'won' : event.type === 'charge.dispute.closed_lost' ? 'lost' : 'opened';
  try {
    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `Chargeback ${outcome}${order ? ` · ${orderRef(order.order_number)}` : ''}`,
      html: noticeEmail({
        eyebrow: 'Chargeback',
        heading: outcome === 'opened' ? 'A member disputed a charge' : `A chargeback was ${outcome}`,
        body:
          outcome === 'opened'
            ? 'Respond with evidence in the Frame dashboard before the deadline: the signed prescription, order timeline and tracking.'
            : 'No action needed. Recorded for your books.',
        rows: [
          ['Order', order ? orderRef(order.order_number) : 'Not matched to an order'],
          ['Payment', transferId ?? 'unknown'],
        ],
        cta: { label: 'Open orders', href: `${SITE_URL}/portal/admin` },
      }),
    });
  } catch {
    // Frame's dashboard has it either way.
  }
}
