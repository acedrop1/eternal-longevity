import 'server-only';

/**
 * The one path an order takes after it is paid: placed with the pharmacy,
 * shipped, delivered.
 *
 * The pharmacy works from its own platform (Formula Health's portal), so a
 * person places every order there, first cycles and monthly refills alike,
 * then keys the tracking back in here. Admin and the prescriber share that
 * job: both see the same board, and whoever marks a step first owns it. Each
 * step is a conditional update on the current status, so a second click from
 * the other portal is told it's already done instead of doing it twice.
 *
 * Every step keeps three records in agreement: the shipment row
 * (fulfillment_orders), the member's order and its timeline (orders,
 * order_updates), and the member's inbox at the two moments they care about,
 * shipped and delivered.
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { deliveredEmail, sendEmail, shippedEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';

export type FulfillmentStep = 'placed' | 'shipped' | 'delivered';
export type ActorRole = 'admin' | 'doctor' | 'pharmacy';

const FROM: Record<FulfillmentStep, string[]> = {
  placed: ['draft', 'submitted'],
  shipped: ['draft', 'submitted', 'accepted'],
  delivered: ['shipped'],
};
const TO: Record<FulfillmentStep, 'accepted' | 'shipped' | 'delivered'> = {
  placed: 'accepted',
  shipped: 'shipped',
  delivered: 'delivered',
};
const ORDER_STATUS: Record<FulfillmentStep, 'compounding' | 'shipped' | 'delivered'> = {
  placed: 'compounding',
  shipped: 'shipped',
  delivered: 'delivered',
};
const DONE: Record<string, string> = {
  accepted: 'already placed with the pharmacy',
  shipped: 'already marked shipped',
  delivered: 'already marked delivered',
  canceled: 'canceled',
};

export async function advanceFulfillment(input: {
  /** The shipment row, or the order it belongs to. One is required. */
  fulfillmentId?: string;
  orderNumber?: string;
  step: FulfillmentStep;
  actorName: string;
  actorRole: ActorRole;
  /** The pharmacy's own order number, when placing. */
  pharmacyRef?: string;
  carrier?: string;
  tracking?: string;
  note?: string;
}): Promise<{ ok: boolean; message: string }> {
  const db = createSupabaseAdminClient();
  const { step } = input;
  const tracking = input.tracking?.trim() ?? '';
  const carrier = input.carrier?.trim() || 'Carrier';
  if (step === 'shipped' && !tracking) return { ok: false, message: 'Enter a tracking number.' };

  const cols = 'id, order_ref, status, user_id, notes';
  const { data: row } = input.fulfillmentId
    ? await db.from('fulfillment_orders').select(cols).eq('id', input.fulfillmentId).maybeSingle()
    : await db.from('fulfillment_orders').select(cols).eq('order_ref', `FUL-${input.orderNumber}`).maybeSingle();

  const orderNumber =
    input.orderNumber ?? (row?.order_ref?.startsWith('FUL-') ? row.order_ref.slice(4) : null);

  // --- The shipment row: conditional, so the second of two clicks is a no-op.
  if (row) {
    const now = new Date().toISOString();
    const patch: {
      status: 'accepted' | 'shipped' | 'delivered';
      notes?: string;
      tracking_carrier?: string;
      tracking_number?: string;
      shipped_at?: string;
    } = { status: TO[step] };
    if (step === 'placed') {
      const ref = input.pharmacyRef?.trim();
      patch.notes = `Placed by ${input.actorName} on ${now.slice(0, 10)}${ref ? ` · pharmacy order ${ref}` : ''}`;
    }
    if (step === 'shipped') {
      patch.tracking_carrier = carrier;
      patch.tracking_number = tracking;
      patch.shipped_at = now;
    }
    const { data: moved, error } = await db
      .from('fulfillment_orders')
      .update(patch)
      .eq('id', row.id)
      .in('status', FROM[step] as ('draft' | 'submitted' | 'accepted' | 'shipped')[])
      .select('id');
    if (error) return { ok: false, message: error.message };
    if (!moved?.length) {
      const who = row.notes ? ` (${row.notes})` : '';
      return { ok: false, message: `This order is ${DONE[row.status] ?? row.status}${who}.` };
    }
  }

  // --- The member's order and its timeline.
  if (orderNumber) {
    const { data: order } = await db
      .from('orders')
      .select('id, member_name, member_email, user_id')
      .eq('order_number', orderNumber)
      .maybeSingle();
    if (order) {
      const orderPatch: { status: 'compounding' | 'shipped' | 'delivered'; tracking_carrier?: string; tracking_number?: string } =
        { status: ORDER_STATUS[step] };
      if (step === 'shipped') {
        orderPatch.tracking_carrier = carrier;
        orderPatch.tracking_number = tracking;
      }
      await db.from('orders').update(orderPatch).eq('id', order.id);

      const label = { placed: 'Sent to the pharmacy', shipped: 'Shipped', delivered: 'Delivered' }[step];
      const body =
        input.note ??
        {
          placed: 'Your pharmacy is compounding your order. It usually ships within 1–3 business days.',
          shipped: `${carrier} · ${tracking}`,
          delivered: 'Your order has arrived. Refrigerate it on arrival if you haven’t already.',
        }[step];
      await db.from('order_updates').insert({
        order_id: order.id,
        label,
        body,
        author: input.actorName,
        author_role: input.actorRole === 'admin' ? 'admin' : input.actorRole === 'doctor' ? 'physician' : 'pharmacy',
        status_change: ORDER_STATUS[step],
      });

      // --- The member hears about the two steps they're waiting for.
      if (step === 'shipped' || step === 'delivered') {
        const userId = row?.user_id ?? order.user_id;
        const { data: patient } = userId
          ? await db.from('profiles').select('email, phone, full_name').eq('id', userId).maybeSingle()
          : { data: null };
        const email = patient?.email ?? order.member_email;
        const firstName =
          (patient?.full_name ?? order.member_name ?? '').trim().split(/\s+/)[0] || 'there';
        const ref = row?.order_ref ?? orderNumber;
        try {
          if (email) {
            const msg =
              step === 'shipped'
                ? shippedEmail({ firstName, orderRef: ref, carrier, tracking })
                : deliveredEmail({ firstName, orderRef: ref });
            await sendEmail({ to: email, subject: msg.subject, html: msg.html });
          }
          if (step === 'shipped' && patient?.phone) {
            await sendSms(
              patient.phone,
              `Your Eternal Longevity order ${ref} has shipped. ${carrier} tracking: ${tracking}`,
            );
          }
        } catch {
          // The step is recorded; a mail or SMS failure must not undo it.
        }
      }
    }
  }

  if (!row && !orderNumber) return { ok: false, message: 'Order not found.' };

  for (const p of [
    '/portal/orders',
    '/portal/admin/fulfillment',
    '/portal/doctor',
    '/portal/doctor/fulfillment',
    '/portal/pharmacy',
  ]) {
    revalidatePath(p);
  }
  return {
    ok: true,
    message: {
      placed: 'Marked placed with the pharmacy.',
      shipped: 'Marked shipped. The patient has been emailed their tracking.',
      delivered: 'Marked delivered. The patient has been emailed.',
    }[step],
  };
}

/* -------------------------------------------------------------------------- */
/*  The board admin and the prescriber share                                  */
/* -------------------------------------------------------------------------- */

export interface BoardRow {
  id: string;
  orderRef: string;
  status: 'draft' | 'submitted' | 'accepted' | 'shipped' | 'delivered' | 'canceled';
  patientName: string;
  patientDob: string | null;
  phone: string | null;
  address: string;
  items: string[];
  cycleLabel: string | null;
  prescriber: string | null;
  npi: string | null;
  notes: string | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  createdAt: string;
  /** Days since it was paid and queued, for the "waiting too long" flag. */
  ageDays: number;
}

function fmtAddress(a: unknown): string {
  const x = (a ?? {}) as Record<string, string>;
  return [x.line1, x.line2, [x.city, x.state].filter(Boolean).join(', '), x.zip]
    .filter(Boolean)
    .join(' · ');
}

function fmtItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((i: Record<string, unknown>) => {
    const name = String(i.product_name ?? i.name ?? i.product ?? 'Item');
    const qty = Number(i.quantity ?? 1);
    const cadence = i.cadence_label ? ` · ${i.cadence_label}` : '';
    return `${name}${qty > 1 ? ` ×${qty}` : ''}${cadence}`;
  });
}

/** Everything still moving, plus the last two weeks of deliveries. */
export async function loadFulfillmentBoard(): Promise<BoardRow[]> {
  const db = createSupabaseAdminClient();
  const since = new Date(Date.now() - 14 * 86400_000).toISOString();
  const { data } = await db
    .from('fulfillment_orders')
    .select(
      'id, order_ref, status, user_id, patient_name, patient_dob, shipping_address, items, cycle_label, prescriber_name, prescriber_npi, notes, tracking_carrier, tracking_number, created_at, submitted_at, updated_at',
    )
    .or(`status.in.(draft,submitted,accepted,shipped),and(status.eq.delivered,updated_at.gte.${since})`)
    .order('created_at', { ascending: true })
    .limit(500);
  const rows = data ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const phones = new Map<string, string | null>();
  if (userIds.length) {
    const { data: profiles } = await db.from('profiles').select('id, phone').in('id', userIds);
    for (const p of profiles ?? []) phones.set(p.id, p.phone ?? null);
  }

  return rows.map((r) => {
    const queued = r.submitted_at ?? r.created_at;
    return {
      id: r.id,
      orderRef: r.order_ref,
      status: r.status,
      patientName: r.patient_name,
      patientDob: r.patient_dob,
      phone: r.user_id ? phones.get(r.user_id) ?? null : null,
      address: fmtAddress(r.shipping_address),
      items: fmtItems(r.items),
      cycleLabel: r.cycle_label,
      prescriber: r.prescriber_name,
      npi: r.prescriber_npi,
      notes: r.notes,
      trackingCarrier: r.tracking_carrier,
      trackingNumber: r.tracking_number,
      createdAt: r.created_at,
      ageDays: Math.floor((Date.now() - new Date(queued).getTime()) / 86400_000),
    };
  });
}
