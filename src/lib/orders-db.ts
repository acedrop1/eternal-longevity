'use server';

/**
 * Server-side order workflow, backed by Supabase.
 *
 * Replaces the localStorage OrdersProvider for live mode: a member places an
 * order, an admin approves it, a physician signs it (billing starts), and the
 * pharmacy compounds and ships. Every role reads the same rows, so the doctor
 * and admin queues finally reflect real member activity.
 *
 * Reads go through the caller's own session client so RLS applies (members
 * see their own orders, clinical staff see all). Writes that must cross roles
 * — appending a timeline entry authored by staff, for instance — go through
 * the service-role client after we have checked the caller's role ourselves.
 */

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth-server';
import type { Order, OrderLine, OrderStatus, OrderUpdate, UpdateAuthorRole } from '@/lib/orders';

/** True when the Supabase-backed workflow is available. */
export async function ordersDbConfigured(): Promise<boolean> {
  return supabaseAdminConfigured();
}

/* -------------------------------------------------------------------------- */
/*  Row -> app shape                                                          */
/* -------------------------------------------------------------------------- */

type OrderRow = Record<string, unknown>;

function centsToDollars(v: unknown): number {
  return Math.round(Number(v ?? 0)) / 100;
}

function mapLine(row: OrderRow): OrderLine {
  return {
    productId: String(row.product_id ?? ''),
    productName: String(row.product_name ?? ''),
    cadence: (row.cadence as OrderLine['cadence']) ?? 'monthly',
    cadenceLabel: String(row.cadence_label ?? 'Monthly'),
    quantity: Number(row.quantity ?? 1),
    perCycle: centsToDollars(row.unit_price_cents),
    image: String(row.image ?? '/images/9.jpg'),
    swatch: String(row.swatch ?? '#1a1a1a'),
  };
}

function mapUpdate(row: OrderRow): OrderUpdate {
  return {
    id: String(row.id ?? ''),
    at: new Date(String(row.created_at ?? Date.now())).getTime(),
    author: String(row.author ?? 'System'),
    role: (row.author_role as UpdateAuthorRole) ?? 'system',
    note: [row.label, row.body].filter(Boolean).join(' — '),
    statusChange: (row.status_change as OrderStatus) || undefined,
  };
}

function mapOrder(row: OrderRow): Order {
  const address = (row.shipping_address ?? {}) as Record<string, string>;
  const items = (row.order_items ?? []) as OrderRow[];
  const updates = (row.order_updates ?? []) as OrderRow[];

  return {
    id: String(row.order_number ?? row.id ?? ''),
    memberName: String(row.member_name ?? ''),
    memberEmail: String(row.member_email ?? ''),
    state: String(row.ship_state ?? address.state ?? ''),
    lines: items.map(mapLine),
    subtotal: centsToDollars(row.subtotal_cents),
    shippingCost: centsToDollars(row.shipping_cents),
    tax: centsToDollars(row.tax_cents),
    total: centsToDollars(row.total_cents),
    shippingAddress: {
      fullName: address.fullName ?? String(row.member_name ?? ''),
      line1: address.line1 ?? '',
      line2: address.line2 || undefined,
      city: address.city ?? '',
      state: address.state ?? String(row.ship_state ?? ''),
      zip: address.zip ?? '',
    },
    cardLast4: (row.card_last4 as string) || undefined,
    placedAt: new Date(String(row.created_at ?? Date.now())).getTime(),
    status: (row.status as OrderStatus) ?? 'pending-admin',
    assignedToPhysicianId: (row.assigned_physician_id as string) || undefined,
    adminNote: (row.admin_note as string) || undefined,
    physicianNote: (row.physician_note as string) || undefined,
    paidAt: row.paid_at ? new Date(String(row.paid_at)).getTime() : undefined,
    firstChargeAmount: row.first_charge_cents
      ? centsToDollars(row.first_charge_cents)
      : undefined,
    tracking: (row.tracking_number as string) || undefined,
    carrier: (row.tracking_carrier as string) || undefined,
    updates: updates
      .map(mapUpdate)
      .sort((a, b) => a.at - b.at),
  };
}

const SELECT =
  '*, order_items(*), order_updates(*)';

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Every order the caller is allowed to see. RLS narrows this to the member's
 * own rows, or all rows for doctor/admin.
 */
export async function listOrders(): Promise<Order[]> {
  if (!supabaseConfigured) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('orders')
    .select(SELECT)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[orders-db] listOrders:', error.message);
    return [];
  }
  return (data ?? []).map((r) => mapOrder(r as OrderRow));
}

/** One order by its human-readable order number. */
export async function getOrder(orderNumber: string): Promise<Order | null> {
  if (!supabaseConfigured) return null;
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from('orders')
    .select(SELECT)
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (error || !data) return null;
  return mapOrder(data as OrderRow);
}

/* -------------------------------------------------------------------------- */
/*  Writes                                                                    */
/* -------------------------------------------------------------------------- */

type ActionResult = { ok: boolean; error?: string };

/** Guard: the caller must hold one of these roles. */
async function requireRole(roles: string[]) {
  const user = await getSession();
  if (!user || !roles.includes(user.role)) {
    return { user: null, error: 'not_authorized' as const };
  }
  return { user, error: null };
}

/** Append a timeline entry, optionally recording a status change. */
async function appendUpdate(
  orderId: string,
  author: string,
  role: UpdateAuthorRole,
  label: string,
  body?: string,
  statusChange?: OrderStatus,
): Promise<void> {
  const db = createSupabaseAdminClient();
  await db.from('order_updates').insert({
    order_id: orderId,
    label,
    body: body ?? null,
    author,
    author_role: role,
    status_change: statusChange ?? null,
  });
}

/** Resolve an order_number to its uuid. */
async function orderIdFor(orderNumber: string): Promise<string | null> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('orders')
    .select('id')
    .eq('order_number', orderNumber)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

function revalidatePortal() {
  for (const p of [
    '/portal',
    '/portal/orders',
    '/portal/admin',
    '/portal/admin/queue',
    '/portal/doctor',
    '/portal/pharmacy',
  ]) {
    revalidatePath(p);
  }
}

/** Member places an order. Returns the new order number. */
export async function placeOrderAction(input: {
  lines: OrderLine[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  shippingAddress: Order['shippingAddress'];
  cardLast4?: string;
}): Promise<ActionResult & { orderNumber?: string }> {
  const { user, error } = await requireRole(['member']);
  if (error || !user) return { ok: false, error: 'not_authorized' };

  const db = createSupabaseAdminClient();
  const orderNumber = `EL-${Date.now().toString(36).toUpperCase()}`;

  const { data: order, error: insErr } = await db
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: user.id,
      status: 'pending-admin',
      member_name: user.name,
      member_email: user.email,
      ship_state: input.shippingAddress.state,
      subtotal_cents: Math.round(input.subtotal * 100),
      shipping_cents: Math.round(input.shippingCost * 100),
      tax_cents: Math.round(input.tax * 100),
      total_cents: Math.round(input.total * 100),
      shipping_address: input.shippingAddress,
      card_last4: input.cardLast4 ?? null,
    })
    .select('id')
    .single();

  if (insErr || !order) {
    console.error('[orders-db] placeOrder:', insErr?.message);
    return { ok: false, error: insErr?.message ?? 'insert_failed' };
  }

  if (input.lines.length) {
    await db.from('order_items').insert(
      input.lines.map((l) => ({
        order_id: order.id,
        product_id: l.productId,
        product_name: l.productName,
        quantity: l.quantity,
        unit_price_cents: Math.round(l.perCycle * 100),
        cadence: l.cadence,
        cadence_label: l.cadenceLabel,
        image: l.image,
        swatch: l.swatch,
      })),
    );
  }

  await appendUpdate(
    order.id,
    'System',
    'system',
    'Order received',
    'Your order is queued for review.',
    'pending-admin',
  );
  revalidatePortal();
  return { ok: true, orderNumber };
}

/** Admin approves and releases the order for sign-off. */
export async function approveOrderAction(
  orderNumber: string,
  physicianId?: string,
  note?: string,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };

  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  await db
    .from('orders')
    .update({
      status: 'assigned',
      assigned_physician_id: physicianId ?? null,
      admin_note: note ?? null,
    })
    .eq('id', id);

  await appendUpdate(id, user.name, 'admin', 'Confirmed', note ?? 'Released for compounding.', 'assigned');
  revalidatePortal();
  return { ok: true };
}

/** Admin declines the order. */
export async function denyOrderAction(
  orderNumber: string,
  note: string,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  await db.from('orders').update({ status: 'denied-admin', admin_note: note }).eq('id', id);
  await appendUpdate(id, user.name, 'admin', 'Declined', note, 'denied-admin');
  revalidatePortal();
  return { ok: true };
}

/** Physician signs. This is the moment billing starts. */
export async function signRxAction(
  orderNumber: string,
  note: string | undefined,
  firstChargeAmount: number,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['doctor']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  await db
    .from('orders')
    .update({
      status: 'signed',
      physician_note: note ?? null,
      paid_at: new Date().toISOString(),
      first_charge_cents: Math.round(firstChargeAmount * 100),
    })
    .eq('id', id);

  await appendUpdate(
    id,
    user.name,
    'physician',
    'Order confirmed',
    note ?? 'Billing starts now.',
    'signed',
  );
  revalidatePortal();
  return { ok: true };
}

/** Physician declines on clinical grounds. */
export async function declineClinicalAction(
  orderNumber: string,
  note: string,
): Promise<ActionResult> {
  const { user, error } = await requireRole(['doctor']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  await db.from('orders').update({ status: 'declined-clinical', physician_note: note }).eq('id', id);
  await appendUpdate(id, user.name, 'physician', 'Declined', note, 'declined-clinical');
  revalidatePortal();
  return { ok: true };
}

/** Pharmacy (or admin) moves the order through compounding and shipping. */
export async function advanceOrderAction(
  orderNumber: string,
  to: Extract<OrderStatus, 'compounding' | 'shipped' | 'delivered'>,
  opts?: { note?: string; carrier?: string; tracking?: string },
): Promise<ActionResult> {
  const { user, error } = await requireRole(['pharmacy', 'admin']);
  if (error || !user) return { ok: false, error: 'not_authorized' };
  const id = await orderIdFor(orderNumber);
  if (!id) return { ok: false, error: 'not_found' };

  const db = createSupabaseAdminClient();
  const patch: {
    status: OrderStatus;
    tracking_carrier?: string;
    tracking_number?: string;
  } = { status: to };
  if (opts?.carrier) patch.tracking_carrier = opts.carrier;
  if (opts?.tracking) patch.tracking_number = opts.tracking;
  await db.from('orders').update(patch).eq('id', id);

  const label =
    to === 'compounding' ? 'Compounding' : to === 'shipped' ? 'Shipped' : 'Delivered';
  const body =
    opts?.note ??
    (to === 'shipped' && opts?.tracking
      ? `${opts.carrier ?? 'Carrier'} · ${opts.tracking}`
      : undefined);

  await appendUpdate(id, user.name, 'pharmacy', label, body, to);
  revalidatePortal();
  return { ok: true };
}
