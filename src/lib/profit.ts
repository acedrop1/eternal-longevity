/**
 * Profit, one definition for the order page, the Orders list, Products,
 * Overview and Analytics. ADMIN ONLY: callers compute this on the server for
 * an admin and pass the result down; the prescriber and members never get it.
 *
 * Pure (no I/O), so it can be checked outside Next. All money is in cents.
 *
 * Per order:
 *   revenue        = total charged − tax
 *   product cost   = Σ lines unitCost × units per 30 days × months in the plan × line quantity
 *   pharmacy ship  = SHIPPING_COST for the order's method (overnight if any line is cold-chain)
 *   processing fee = the charge's real fee as the card processor reports it, else the
 *                    PROCESSING_FEE_* estimate of the total
 *   refunds        = what the card processor says was refunded on the charge
 *   net sales      = revenue − refunds
 *   profit         = net sales − product cost − pharmacy shipping − processing fee
 *   margin         = profit ÷ net sales
 *
 * Cost and shipping are snapshotted in order_costs when the order is paid
 * (migration 0025, lib/profit-data); an order without the snapshot is costed
 * at today's prices and marked estimated. An order closed without shipping (cancelled, denied, declined)
 * has no product or shipping cost; the processor keeps its fee on a refund.
 */

import { TERMINAL_ORDER, monthsPerCycle } from './order-rules';
import { SHIPPING_COST } from './shipping';

/** What one product costs us: per pharmacy unit, units per 30 days, and how it ships. */
export interface CostInfo {
  unitCost: number;
  quantity: number;
  storage?: 'refrigerated' | 'room';
}
export type CostTable = Record<string, CostInfo>;

export interface EconLine {
  productId: string;
  productName: string;
  cadence: string;
  quantity: number;
  /** What the line charged (unit price × quantity). Only used to split order-level money across lines. */
  amountCents: number;
}

/** A paid (or refunded) order as profit needs it. */
export interface EconOrder {
  number: string;
  /** When the money landed (paid_confirmed_at; created_at for a fully refunded order). */
  at: number;
  /** user id, or email: tells new customers from returning ones. */
  customer: string;
  customerName: string;
  status: string;
  totalCents: number;
  taxCents: number;
  lines: EconLine[];
  /** Snapshots written at payment; null = not written (older order, or migration not run). */
  costCents: number | null;
  shippingCostCents: number | null;
  stripeFeeCents: number | null;
  refundedCents: number;
}

export interface Economics {
  revenue: number;
  productCost: number;
  shippingCost: number;
  stripeFee: number;
  refunds: number;
  net: number;
  profit: number;
  /** profit ÷ net sales, or null when net sales are 0 or less. */
  margin: number | null;
  /** Any part below is an estimate. */
  estimated: boolean;
  est: { cost: boolean; shipping: boolean; fee: boolean };
  /** Closed without shipping: no product or shipping cost. */
  closed: boolean;
}

// ponytail: Frame contract (2026-10-07): 3.25% + 30¢, or 2.95% + 30¢ on all
// volume in a month over $150k. Charges record Frame's actual fee, so this
// only fills orders without one, at the base tier (conservative). Make it
// month-aware if many orders end up estimated.
export const PROCESSING_FEE_PCT = 0.0325;
export const PROCESSING_FEE_FIXED_CENTS = 30;

/** Estimated card processing fee. Nothing charged, no fee. */
export function estimateProcessingFeeCents(chargedCents: number): number {
  return chargedCents > 0 ? Math.round(chargedCents * PROCESSING_FEE_PCT) + PROCESSING_FEE_FIXED_CENTS : 0;
}
/** Old name, still imported by the profit check. */
export const estimateStripeFeeCents = estimateProcessingFeeCents;

/** Pharmacy units in one line: units per 30 days × months in the plan × line quantity. */
export function lineUnits(line: Pick<EconLine, 'cadence' | 'quantity'>, cost: Pick<CostInfo, 'quantity'>): number {
  return Math.max(1, cost.quantity) * monthsPerCycle(line.cadence) * Math.max(1, line.quantity);
}

export function lineCostCents(line: Pick<EconLine, 'productId' | 'cadence' | 'quantity'>, costs: CostTable): number {
  const c = costs[line.productId];
  return c ? Math.round(c.unitCost * 100 * lineUnits(line, c)) : 0;
}

export function productCostCents(lines: Pick<EconLine, 'productId' | 'cadence' | 'quantity'>[], costs: CostTable): number {
  return lines.reduce((sum, l) => sum + lineCostCents(l, costs), 0);
}

/** One shipment per order; overnight when any line is cold-chain. */
export function shippingCostCents(lines: Pick<EconLine, 'productId'>[], costs: CostTable): number {
  if (!lines.length) return 0;
  const cold = lines.some((l) => costs[l.productId]?.storage === 'refrigerated');
  return SHIPPING_COST[cold ? 'OVERNIGHT' : '2_DAY'] * 100;
}

export function orderEconomics(o: EconOrder, costs: CostTable): Economics {
  const closed = TERMINAL_ORDER.includes(o.status as never);
  const est = {
    cost: !closed && o.costCents === null,
    shipping: !closed && o.shippingCostCents === null,
    fee: o.stripeFeeCents === null,
  };
  const revenue = o.totalCents - o.taxCents;
  const productCost = closed ? 0 : o.costCents ?? productCostCents(o.lines, costs);
  const shippingCost = closed ? 0 : o.shippingCostCents ?? shippingCostCents(o.lines, costs);
  const stripeFee = o.stripeFeeCents ?? estimateProcessingFeeCents(o.totalCents);
  const refunds = o.refundedCents;
  const net = revenue - refunds;
  const profit = net - productCost - shippingCost - stripeFee;
  return {
    revenue,
    productCost,
    shippingCost,
    stripeFee,
    refunds,
    net,
    profit,
    margin: net > 0 ? profit / net : null,
    estimated: est.cost || est.shipping || est.fee,
    est,
    closed,
  };
}

/* ------------------------------ one plan ------------------------------ */

/** One plan of a product, as Products shows it. Dollars in, cents out. */
export function planEconomics(
  priceDollars: number,
  shippingPriceDollars: number,
  months: number,
  cost: CostInfo,
): { charged: number; productCost: number; shippingCost: number; stripeFee: number; profit: number; margin: number | null } {
  const charged = Math.round((priceDollars + shippingPriceDollars) * 100);
  const productCost = Math.round(cost.unitCost * 100 * Math.max(1, cost.quantity) * months);
  const shippingCost = SHIPPING_COST[cost.storage === 'refrigerated' ? 'OVERNIGHT' : '2_DAY'] * 100;
  const stripeFee = estimateProcessingFeeCents(charged);
  const profit = charged - productCost - shippingCost - stripeFee;
  return { charged, productCost, shippingCost, stripeFee, profit, margin: charged > 0 ? profit / charged : null };
}

/* ------------------------------ date ranges ------------------------------ */

/** Days are New York calendar days, 'YYYY-MM-DD'. Ranges include both ends. */
export interface DateRange {
  from: string;
  to: string;
}

const DAY = 86400_000;
const ET = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

/** The New York calendar day of an instant. */
export const dayOf = (ms: number): string => ET.format(ms);
const utc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => iso(utc(d) + n * DAY);
/** Days in a range, both ends counted. */
export const rangeDays = (r: DateRange) => Math.round((utc(r.to) - utc(r.from)) / DAY) + 1;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based
const monthStart = (d: string, back = 0) => {
  const y = +d.slice(0, 4);
  const m = +d.slice(5, 7) - back;
  const yy = y + Math.floor((m - 1) / 12);
  const mm = ((((m - 1) % 12) + 12) % 12) + 1;
  return `${yy}-${String(mm).padStart(2, '0')}-01`;
};

export const PRESETS = [
  ['this_month', 'This month'],
  ['last_month', 'Last month'],
  ['last_30', 'Last 30 days'],
  ['last_90', 'Last 90 days'],
  ['ytd', 'Year to date'],
] as const;
export type Preset = (typeof PRESETS)[number][0];

export function presetRange(p: Preset, today: string): DateRange {
  switch (p) {
    case 'this_month':
      return { from: monthStart(today), to: today };
    case 'last_month': {
      const from = monthStart(today, 1);
      return { from, to: addDays(monthStart(today), -1) };
    }
    case 'last_30':
      return { from: addDays(today, -29), to: today };
    case 'last_90':
      return { from: addDays(today, -89), to: today };
    case 'ytd':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }
}

/**
 * What a range is compared with. A range starting on the 1st of a month is set
 * against the same days of the month before (Oct 1–3 vs Sep 1–3; all of
 * September vs all of August); year to date against the same dates last year;
 * anything else against the same number of days just before it.
 */
export function previousRange(r: DateRange): DateRange {
  const sameMonth = r.from.slice(0, 7) === r.to.slice(0, 7);
  if (r.from.endsWith('-01-01') && r.to.slice(0, 4) === r.from.slice(0, 4) && !sameMonth) {
    const y = +r.from.slice(0, 4) - 1;
    const [m, d] = [+r.to.slice(5, 7), +r.to.slice(8, 10)];
    return { from: `${y}-01-01`, to: `${y}-${r.to.slice(5, 7)}-${String(Math.min(d, daysInMonth(y, m))).padStart(2, '0')}` };
  }
  if (r.from.endsWith('-01') && sameMonth) {
    const from = monthStart(r.from, 1);
    const len = Math.min(rangeDays(r), daysInMonth(+from.slice(0, 4), +from.slice(5, 7)));
    return { from, to: addDays(from, len - 1) };
  }
  const len = rangeDays(r);
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
}

const inRange = (day: string, r: DateRange) => day >= r.from && day <= r.to;

/* ------------------------------ aggregate ------------------------------ */

export interface Row {
  key: string;
  label: string;
  units: number;
  orders: number;
  gross: number;
  refunds: number;
  net: number;
  productCost: number;
  shippingCost: number;
  fees: number;
  profit: number;
  margin: number | null;
}

export interface Totals extends Row {
  aov: number;
  newCustomers: number;
  returningCustomers: number;
  /** Orders with at least one estimated figure. */
  estimatedOrders: number;
}

export interface OrderRow extends Economics {
  number: string;
  at: number;
  day: string;
  customerName: string;
  items: string;
}

export interface Aggregate {
  range: DateRange;
  totals: Totals;
  byProduct: Row[];
  byMonth: Row[];
  byDay: Row[];
  orders: OrderRow[];
  /** Products sold in the range with no cost set (counted at $0). */
  missingCost: string[];
}

const blank = (key: string, label: string): Row => ({
  key,
  label,
  units: 0,
  orders: 0,
  gross: 0,
  refunds: 0,
  net: 0,
  productCost: 0,
  shippingCost: 0,
  fees: 0,
  profit: 0,
  margin: null,
});

function add(row: Row, e: Pick<Economics, 'revenue' | 'refunds' | 'net' | 'productCost' | 'shippingCost' | 'stripeFee' | 'profit'>, units: number, orders: number) {
  row.units += units;
  row.orders += orders;
  row.gross += e.revenue;
  row.refunds += e.refunds;
  row.net += e.net;
  row.productCost += e.productCost;
  row.shippingCost += e.shippingCost;
  row.fees += e.stripeFee;
  row.profit += e.profit;
}

const finish = (r: Row): Row => ({ ...r, margin: r.net > 0 ? r.profit / r.net : null });

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const DAY_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const monthLabel = (key: string) => MONTH.format(utc(`${key}-01`));
export const dayLabel = (key: string) => DAY_LABEL.format(utc(key));

/** Split an order's money across its lines by what each line charged (equal when none did). */
function shares(o: EconOrder): number[] {
  const total = o.lines.reduce((s, l) => s + Math.max(0, l.amountCents), 0);
  return o.lines.map((l) => (total > 0 ? Math.max(0, l.amountCents) / total : 1 / o.lines.length));
}

/**
 * Totals and splits for one range. Takes every order (not just the range) so a
 * customer's first-ever order decides new versus returning.
 */
export function aggregate(all: EconOrder[], range: DateRange, costs: CostTable): Aggregate {
  const firstDay = new Map<string, string>();
  for (const o of all) {
    const d = dayOf(o.at);
    const prev = firstDay.get(o.customer);
    if (!prev || d < prev) firstDay.set(o.customer, d);
  }

  const totals = blank('total', 'Total');
  const byProduct = new Map<string, Row>();
  const byMonth = new Map<string, Row>();
  const byDay = new Map<string, Row>();
  // Every bucket in the range, so charts and tables show the empty ones too.
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    byDay.set(d, blank(d, dayLabel(d)));
    const m = d.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, blank(m, monthLabel(m)));
  }

  const customers = new Set<string>();
  const missing = new Set<string>();
  const orders: OrderRow[] = [];
  let estimatedOrders = 0;

  for (const o of all) {
    const day = dayOf(o.at);
    if (!inRange(day, range)) continue;
    const e = orderEconomics(o, costs);
    const units = o.lines.reduce((s, l) => s + Math.max(1, l.quantity), 0);
    add(totals, e, units, 1);
    add(byMonth.get(day.slice(0, 7))!, e, units, 1);
    add(byDay.get(day)!, e, units, 1);
    customers.add(o.customer);
    if (e.estimated) estimatedOrders++;

    // Per product: product cost by line; everything order-level by share.
    const share = shares(o);
    const lineCosts = o.lines.map((l) => lineCostCents(l, costs));
    const costSum = lineCosts.reduce((a, b) => a + b, 0);
    o.lines.forEach((l, i) => {
      if (!costs[l.productId]?.unitCost) missing.add(l.productName || l.productId);
      const s = share[i];
      const productCost = costSum > 0 ? Math.round((e.productCost * lineCosts[i]) / costSum) : Math.round(e.productCost * s);
      const part = {
        revenue: Math.round(e.revenue * s),
        refunds: Math.round(e.refunds * s),
        net: Math.round(e.net * s),
        productCost,
        shippingCost: Math.round(e.shippingCost * s),
        stripeFee: Math.round(e.stripeFee * s),
        profit: 0,
      };
      part.profit = part.net - part.productCost - part.shippingCost - part.stripeFee;
      const row = byProduct.get(l.productId) ?? blank(l.productId, l.productName || l.productId);
      add(row, part, Math.max(1, l.quantity), 1);
      byProduct.set(l.productId, row);
    });

    orders.push({
      ...e,
      number: o.number,
      at: o.at,
      day,
      customerName: o.customerName,
      items: o.lines.map((l) => l.productName).join(' · '),
    });
  }

  let newCustomers = 0;
  for (const c of customers) if (inRange(firstDay.get(c)!, range)) newCustomers++;

  const t = finish(totals);
  return {
    range,
    totals: {
      ...t,
      aov: t.orders ? Math.round(t.gross / t.orders) : 0,
      newCustomers,
      returningCustomers: customers.size - newCustomers,
      estimatedOrders,
    },
    byProduct: [...byProduct.values()].map(finish).sort((a, b) => b.net - a.net),
    byMonth: [...byMonth.values()].map(finish),
    byDay: [...byDay.values()].map(finish),
    orders: orders.sort((a, b) => b.at - a.at),
    missingCost: [...missing].sort(),
  };
}

/** % change from `before` to `now`; null when there is nothing to compare with. */
export function change(now: number, before: number): number | null {
  if (before === 0) return now === 0 ? 0 : null;
  return (now - before) / Math.abs(before);
}
