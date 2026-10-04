import 'server-only';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCatalog, getPharmacyEntries } from './catalog';
import { createSupabaseAdminClient, supabaseAdminConfigured } from './supabase/admin';
import { getStripe } from './stripe';
import type { Order } from './orders';
import {
  orderEconomics,
  productCostCents,
  shippingCostCents,
  type CostTable,
  type EconLine,
  type EconOrder,
  type Economics,
} from './profit';

/*
 * Profit's I/O: the cost table, the paid orders, and the snapshots written
 * when money moves, kept in `order_costs` (migration 0025): RLS on, no
 * policies, so only this service-role code reads it. ADMIN ONLY: every reader
 * is an admin page that has checked the role; nothing here reaches a member
 * or the prescriber. Each write catches its own errors, so a missing
 * migration only logs and the payment path carries on.
 */

type Db = ReturnType<typeof createSupabaseAdminClient>;
// The generated types predate migration 0025.
const untyped = (db: Db) => db as unknown as SupabaseClient;
const MIGRATION_HINT = '(has supabase/migrations/0025_order_costs.sql been run?)';

/** Per product: cost per unit, units per 30 days, storage (for the shipping method). */
export async function costTable(): Promise<CostTable> {
  const [products, rx] = await Promise.all([getCatalog(), getPharmacyEntries()]);
  return Object.fromEntries(
    products.map((p) => [p.id, { unitCost: rx[p.id]?.unitCost ?? 0, quantity: rx[p.id]?.quantity ?? 1, storage: p.storage }]),
  );
}

/**
 * Freeze what an order cost us at the moment it is paid, so a later price
 * change on the cost sheet does not rewrite past months. Called only at
 * payment (each caller runs once per order). `extra` carries a known fee
 * (0 on a $0 order). Upsert touches only the columns given.
 */
export async function snapshotOrderCosts(db: Db, orderId: string, extra: Record<string, number> = {}): Promise<void> {
  try {
    const [{ data: items, error: itemsErr }, costs] = await Promise.all([
      db.from('order_items').select('product_id, cadence, quantity').eq('order_id', orderId),
      costTable(),
    ]);
    if (itemsErr) throw new Error(itemsErr.message);
    const lines = (items ?? []).map((i) => ({
      productId: String(i.product_id ?? ''),
      cadence: String(i.cadence ?? 'monthly'),
      quantity: Number(i.quantity ?? 1),
    }));
    const { error } = await untyped(db)
      .from('order_costs')
      .upsert(
        { order_id: orderId, cost_cents: productCostCents(lines, costs), shipping_cost_cents: shippingCostCents(lines, costs), ...extra },
        { onConflict: 'order_id' },
      );
    if (error) console.error(`[profit] cost snapshot not written for ${orderId} ${MIGRATION_HINT}:`, error.message);
  } catch (err) {
    console.error(`[profit] cost snapshot failed for ${orderId}:`, err);
  }
}

/**
 * Copy Stripe's own numbers onto the order that owns this payment: the fee
 * from the charge's balance transaction, and what has been refunded so far.
 * Absolute values, so running it twice (webhook + the refund code) is safe.
 * The balance transaction can lag the charge by a moment; charge.updated
 * fills the fee in then.
 */
export async function syncStripeAmounts(db: Db, paymentIntentId: string): Promise<void> {
  try {
    const pi = await getStripe().paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });
    const charge = typeof pi.latest_charge === 'object' ? (pi.latest_charge as Stripe.Charge | null) : null;
    if (!charge) return;
    const bt = typeof charge.balance_transaction === 'object' ? charge.balance_transaction : null;
    // Only the order that owns this intent; a stray payment refunded elsewhere matches nothing.
    const { data: order } = await db.from('orders').select('id').eq('stripe_payment_intent_id', paymentIntentId).maybeSingle();
    if (!order) return;
    const patch: Record<string, string | number> = { order_id: order.id, refunded_cents: charge.amount_refunded ?? 0 };
    if (bt) patch.stripe_fee_cents = bt.fee;
    const { error } = await untyped(db).from('order_costs').upsert(patch, { onConflict: 'order_id' });
    if (error) console.error(`[profit] Stripe fee/refund not written for ${paymentIntentId} ${MIGRATION_HINT}:`, error.message);
  } catch (err) {
    console.error(`[profit] Stripe fee/refund sync failed for ${paymentIntentId}:`, err);
  }
}

/* -------------------------------- reading -------------------------------- */

type Row = Record<string, unknown>;
const ITEMS = 'order_items(product_id, product_name, cadence, quantity, unit_price_cents)';
const BASE = `id, order_number, user_id, member_email, member_name, status, total_cents, tax_cents, created_at, paid_confirmed_at, ${ITEMS}`;
const SNAP = 'order_costs(cost_cents, shipping_cost_cents, stripe_fee_cents, refunded_cents)';
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function fromRow(r: Row): EconOrder {
  const items = (r.order_items ?? []) as Row[];
  // One-to-one embed: an object, or a one-item array on older PostgREST.
  const c = ((Array.isArray(r.order_costs) ? r.order_costs[0] : r.order_costs) ?? {}) as Row;
  return {
    number: String(r.order_number ?? r.id ?? ''),
    at: new Date(String(r.paid_confirmed_at ?? r.created_at)).getTime(),
    customer: String(r.user_id ?? r.member_email ?? r.order_number),
    customerName: String(r.member_name ?? r.member_email ?? ''),
    status: String(r.status ?? ''),
    totalCents: Number(r.total_cents ?? 0),
    taxCents: Number(r.tax_cents ?? 0),
    lines: items.map((i) => ({
      productId: String(i.product_id ?? ''),
      productName: String(i.product_name ?? ''),
      cadence: String(i.cadence ?? 'monthly'),
      quantity: Number(i.quantity ?? 1),
      amountCents: Number(i.unit_price_cents ?? 0) * Number(i.quantity ?? 1),
    })),
    costCents: num(c.cost_cents),
    shippingCostCents: num(c.shipping_cost_cents),
    stripeFeeCents: num(c.stripe_fee_cents),
    refundedCents: Number(c.refunded_cents ?? 0),
  };
}

/** A sample Order (dev fixture) as profit reads it. */
export function econFromOrder(o: Order, snap: Partial<Pick<EconOrder, 'costCents' | 'shippingCostCents' | 'stripeFeeCents' | 'refundedCents'>> = {}): EconOrder {
  return {
    number: o.id,
    at: o.paidAt ?? o.placedAt,
    customer: o.userId ?? o.memberEmail,
    customerName: o.memberName,
    status: o.status,
    totalCents: Math.round(o.total * 100),
    taxCents: Math.round(o.tax * 100),
    lines: o.lines.map<EconLine>((l) => ({
      productId: l.productId,
      productName: l.productName,
      cadence: l.cadence,
      quantity: l.quantity,
      amountCents: Math.round(l.perCycle * 100 * l.quantity),
    })),
    costCents: null,
    shippingCostCents: null,
    stripeFeeCents: null,
    refundedCents: 0,
    ...snap,
  };
}

/** The dev fixture. A row with a fee gets the cost snapshot too, as the webhook writes both. */
async function sampleOrders(costs: CostTable): Promise<EconOrder[]> {
  const s = await import('@/components/admin/dev-sample');
  return s
    .sampleEconOrders(econFromOrder)
    .map((o) =>
      o.stripeFeeCents === null ? o : { ...o, costCents: productCostCents(o.lines, costs), shippingCostCents: shippingCostCents(o.lines, costs) },
    );
}

/** Pages of 1000 (PostgREST's cap) until the table runs out. */
async function readAll(build: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

export interface EconData {
  orders: EconOrder[];
  costs: CostTable;
  /** 'sample': the dev fixture; 'live': Supabase; 'none': neither. */
  source: 'live' | 'sample' | 'none';
  /** False when order_costs (migration 0025) could not be read: every order is estimated. */
  snapshots: boolean;
}

/**
 * Every order money landed on: paid now, or refunded since (a full refund
 * clears paid_confirmed_at, so those are found through order_costs and dated
 * by when they were placed). Dev without Supabase reads the sample fixture.
 */
export async function loadEconData(): Promise<EconData> {
  const costs = await costTable();
  if (!supabaseAdminConfigured()) {
    // NODE_ENV is inlined at build, so production never loads the fixture.
    if (process.env.NODE_ENV !== 'development') return { orders: [], costs, source: 'none', snapshots: false };
    return { orders: await sampleOrders(costs), costs, source: 'sample', snapshots: true };
  }
  const db = untyped(createSupabaseAdminClient());
  const paid = (cols: string) =>
    readAll((from) =>
      db.from('orders').select(cols).not('paid_confirmed_at', 'is', null).order('created_at', { ascending: true }).range(from, from + 999),
    );
  try {
    const rows = await paid(`${BASE}, ${SNAP}`);
    // Fully refunded orders lost paid_confirmed_at; find them by their refund.
    const refunded = await readAll((from) =>
      db.from('order_costs').select('order_id').gt('refunded_cents', 0).range(from, from + 999),
    );
    const seen = new Set(rows.map((r) => r.id));
    const ids = refunded.map((r) => String(r.order_id)).filter((id) => !seen.has(id));
    // ponytail: one .in() call; chunk it if fully refunded orders ever pass a few hundred.
    if (ids.length) {
      const { data, error } = await db.from('orders').select(`${BASE}, ${SNAP}`).in('id', ids);
      if (error) throw new Error(error.message);
      rows.push(...((data ?? []) as Row[]));
    }
    return { orders: rows.map(fromRow), costs, source: 'live', snapshots: true };
  } catch (err) {
    console.error(`[profit] reading order_costs failed ${MIGRATION_HINT}; estimating every order:`, err);
  }
  try {
    return { orders: (await paid(BASE)).map(fromRow), costs, source: 'live', snapshots: false };
  } catch (err) {
    console.error('[profit] reading paid orders failed:', err);
    return { orders: [], costs, source: 'live', snapshots: false };
  }
}

/** One order's profit for its admin page, or null if no money has landed on it. */
export async function economicsForOrder(orderNumber: string): Promise<Economics | null> {
  const costs = await costTable();
  if (!supabaseAdminConfigured()) {
    if (process.env.NODE_ENV !== 'development') return null;
    const o = (await sampleOrders(costs)).find((x) => x.number === orderNumber);
    return o ? orderEconomics(o, costs) : null;
  }
  const db = untyped(createSupabaseAdminClient());
  const one = (cols: string) => db.from('orders').select(cols).eq('order_number', orderNumber).maybeSingle();
  let { data, error } = await one(`${BASE}, ${SNAP}`);
  if (error) {
    console.error(`[profit] reading cost columns failed ${MIGRATION_HINT}:`, error.message);
    ({ data, error } = await one(BASE));
  }
  const row = data as Row | null;
  if (error || !row) return null;
  const o = fromRow(row);
  if (!row.paid_confirmed_at && !(o.refundedCents > 0)) return null;
  return orderEconomics(o, costs);
}
