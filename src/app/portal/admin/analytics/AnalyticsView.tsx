'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import { SHIPPING_COST } from '@/lib/shipping';
import { PRESETS, change, dayLabel, type DateRange, type OrderRow, type Preset, type Row, type Totals } from '@/lib/profit';
import {
  AdminPageHeader,
  MetricCard,
  SectionCard,
  fieldInput,
  plainTd,
  secondaryButton,
  toolbarSelect,
} from '@/components/admin/IndexTable';

/** Admin only: the page passes this data after its role check. */
interface Props {
  preset: Preset | 'custom';
  range: DateRange;
  previous: DateRange;
  today: string;
  totals: Totals;
  before: Totals;
  series: Row[];
  bucket: 'day' | 'month';
  byProduct: Row[];
  byMonth: Row[];
  orders: OrderRow[];
  missingCost: string[];
  source: 'live' | 'sample' | 'none';
  snapshots: boolean;
}

const money = (cents: number) => (cents < 0 ? `−${formatMoney(-cents)}` : formatMoney(cents));
const pct = (m: number | null) => (m === null ? '—' : `${(m * 100).toFixed(1)}%`);
const year = (d: string) => d.slice(0, 4);
const span = (r: DateRange) =>
  r.from === r.to
    ? `${dayLabel(r.from)}, ${year(r.from)}`
    : `${dayLabel(r.from)}${year(r.from) !== year(r.to) ? `, ${year(r.from)}` : ''} – ${dayLabel(r.to)}, ${year(r.to)}`;

/* Series colours: categorical slots 1 and 2 of the validated reference palette (dataviz). */
const BLUE = '#2a78d6';
const ORANGE = '#eb6834';

export function AnalyticsView(p: Props) {
  const router = useRouter();
  const [custom, setCustom] = useState(p.preset === 'custom');
  const [from, setFrom] = useState(p.range.from);
  const [to, setTo] = useState(p.range.to);
  const t = p.totals;
  const b = p.before;

  const go = (q: string) => router.push(`/portal/admin/analytics?${q}`);

  // Higher is better (up), worse (down), or just context (none).
  const kpis: [string, ReactNode, number, number, 'up' | 'down' | 'none'][] = [
    ['Gross sales', money(t.gross), t.gross, b.gross, 'up'],
    ['Refunds', money(t.refunds), t.refunds, b.refunds, 'down'],
    ['Net sales', money(t.net), t.net, b.net, 'up'],
    ['Product cost', money(t.productCost), t.productCost, b.productCost, 'none'],
    ['Pharmacy shipping', money(t.shippingCost), t.shippingCost, b.shippingCost, 'none'],
    ['Stripe fees', money(t.fees), t.fees, b.fees, 'none'],
    ['Gross profit', money(t.profit), t.profit, b.profit, 'up'],
    ['Margin', pct(t.margin), t.margin ?? 0, b.margin ?? 0, 'up'],
    ['Orders', t.orders, t.orders, b.orders, 'up'],
    ['Average order value', money(t.aov), t.aov, b.aov, 'up'],
    ['New customers', t.newCustomers, t.newCustomers, b.newCustomers, 'up'],
    ['Returning customers', t.returningCustomers, t.returningCustomers, b.returningCustomers, 'up'],
  ];

  const exportMonths = () =>
    download(`months-${p.range.from}-to-${p.range.to}.csv`, [
      ['Month', 'Units', 'Orders', 'Gross sales', 'Refunds', 'Net sales', 'Product cost', 'Pharmacy shipping', 'Stripe fees', 'Gross profit', 'Margin %'],
      ...[...p.byMonth, { ...t, label: 'Total' }].map((r) => [
        r.label,
        r.units,
        r.orders,
        usd(r.gross),
        usd(r.refunds),
        usd(r.net),
        usd(r.productCost),
        usd(r.shippingCost),
        usd(r.fees),
        usd(r.profit),
        r.margin === null ? '' : (r.margin * 100).toFixed(1),
      ]),
    ]);
  const exportOrders = () =>
    download(`orders-${p.range.from}-to-${p.range.to}.csv`, [
      ['Order', 'Date', 'Customer', 'Items', 'Gross sales', 'Refunds', 'Net sales', 'Product cost', 'Pharmacy shipping', 'Stripe fee', 'Gross profit', 'Margin %', 'Estimated'],
      ...p.orders.map((o) => [
        o.number,
        o.day,
        o.customerName,
        o.items,
        usd(o.revenue),
        usd(o.refunds),
        usd(o.net),
        usd(o.productCost),
        usd(o.shippingCost),
        usd(o.stripeFee),
        usd(o.profit),
        o.margin === null ? '' : (o.margin * 100).toFixed(1),
        o.estimated ? [o.est.cost && 'product cost', o.est.shipping && 'shipping', o.est.fee && 'fee'].filter(Boolean).join('; ') : '',
      ]),
    ]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Analytics"
        subtitle="Sales, costs and profit. Admin only. Days are New York time."
        actions={
          <>
            <button type="button" className={secondaryButton} onClick={exportMonths}>
              Export months
            </button>
            <button type="button" className={secondaryButton} onClick={exportOrders}>
              Export orders
            </button>
          </>
        }
      />

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Date range"
          className={cn(toolbarSelect, 'flex-none')}
          value={custom ? 'custom' : p.preset}
          onChange={(e) => {
            if (e.target.value === 'custom') return setCustom(true);
            setCustom(false);
            go(`range=${e.target.value}`);
          }}
        >
          {PRESETS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
          <option value="custom">Custom range</option>
        </select>
        {custom && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (from && to && from <= to) go(`from=${from}&to=${to}`);
            }}
          >
            <input aria-label="From" type="date" className={cn(fieldInput, 'w-auto')} value={from} max={to || p.today} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-[14px] text-ink/60">to</span>
            <input aria-label="To" type="date" className={cn(fieldInput, 'w-auto')} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            <button type="submit" className={secondaryButton} disabled={!from || !to || from > to}>
              Apply
            </button>
          </form>
        )}
        <p className="basis-full text-[13px] text-ink/65 sm:basis-auto">
          {span(p.range)} <span className="text-ink/45">·</span> compared with {span(p.previous)}
        </p>
      </div>

      {p.source === 'sample' && (
        <Notice>Sample data (dev only). Real numbers appear once Supabase is connected.</Notice>
      )}
      {p.source === 'live' && !p.snapshots && (
        <Notice>
          Cost snapshots are not available (run migration 0025_order_costs.sql). Every order below is estimated from today’s costs and
          Stripe’s list price.
        </Notice>
      )}
      {p.missingCost.length > 0 && (
        <Notice>
          No cost set for {p.missingCost.join(', ')}: counted at $0 product cost. Set “Your cost” in Products.
        </Notice>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {kpis.map(([label, value, now, prev, good]) => (
          <MetricCard
            key={label}
            label={label}
            value={value}
            hint={<Delta now={now} prev={prev} good={good} points={label === 'Margin'} />}
          />
        ))}
      </div>
      {t.estimatedOrders > 0 && (
        <p className="-mt-2 text-[13px] text-ink/60">
          {t.estimatedOrders} of {t.orders} orders include an estimate (est.): costs not recorded at payment.
        </p>
      )}

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Net sales and gross profit" description={`By ${p.bucket}`}>
          <Legend items={[['Net sales', BLUE], ['Gross profit', ORANGE]]} />
          <Chart
            rows={p.series}
            bucket={p.bucket}
            kind="line"
            series={[
              { key: 'net', label: 'Net sales', color: BLUE },
              { key: 'profit', label: 'Gross profit', color: ORANGE },
            ]}
          />
        </SectionCard>
        <SectionCard title="Orders" description={`By ${p.bucket}`}>
          <div className="h-[22px]" aria-hidden />
          <Chart rows={p.series} bucket={p.bucket} kind="bar" series={[{ key: 'orders', label: 'Orders', color: BLUE }]} />
        </SectionCard>
      </div>

      {/* Tables */}
      <SectionCard flush title="By product" description="Order-level amounts (shipping, fees, refunds) split by what each line charged.">
        <MoneyTable first="Product" rows={p.byProduct} total={t} empty="No sales in this range." />
      </SectionCard>

      <SectionCard flush title="By month">
        <MoneyTable first="Month" rows={p.byMonth} total={t} empty="No months in this range." />
      </SectionCard>

      <SectionCard
        flush
        title="Orders"
        description={p.orders.length > 25 ? `Latest 25 of ${p.orders.length}. Export orders for all of them.` : 'Every order in this range.'}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[14px] tabular-nums">
            <thead>
              <tr className="bg-milk text-left text-[13px] text-ink/70">
                {['Order', 'Date', 'Customer', 'Items', 'Net sales', 'Costs', 'Profit', 'Margin'].map((h, i) => (
                  <th key={h} className={cn('whitespace-nowrap px-2.5 py-2 font-semibold first:pl-4 last:pr-4', i >= 4 && 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border-t border-ink/10 px-4 py-6 text-center text-ink/65">
                    No paid orders in this range.
                  </td>
                </tr>
              ) : (
                p.orders.slice(0, 25).map((o) => (
                  <tr key={o.number}>
                    <td className={plainTd}>
                      <Link href={`/portal/admin/orders/${encodeURIComponent(o.number)}`} className="font-medium underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                        #{o.number}
                      </Link>
                    </td>
                    <td className={cn(plainTd, 'text-ink/70')}>{dayLabel(o.day)}</td>
                    <td className={cn(plainTd, 'max-w-[160px] truncate')}>{o.customerName}</td>
                    <td className={cn(plainTd, 'max-w-[200px] truncate text-ink/70')}>{o.items || '—'}</td>
                    <td className={cn(plainTd, 'text-right')}>{money(o.net)}</td>
                    <td className={cn(plainTd, 'text-right text-ink/70')}>
                      {money(o.productCost + o.shippingCost + o.stripeFee)}
                      {o.estimated && <Est />}
                    </td>
                    <td className={cn(plainTd, 'text-right font-medium', o.profit < 0 && 'text-red-700')}>{money(o.profit)}</td>
                    <td className={cn(plainTd, 'text-right')}>{pct(o.margin)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="How each number is worked out">
        <dl className="grid gap-x-8 gap-y-3 text-[14px] leading-relaxed md:grid-cols-2">
          {[
            ['Which orders', 'Every order the money landed on (the Stripe webhook’s paid time), plus any refunded since. Dated by when it was paid, as a New York calendar day; a fully refunded order is dated by when it was placed. Unpaid and declined orders are not counted.'],
            ['Gross sales', 'What the card was charged: items after any discount, plus the shipping the customer paid, minus tax (tax is not ours). A $0 order covered by a code counts as $0.'],
            ['Refunds', 'What Stripe reports as refunded on the order’s charge, in full or in part, from the portal or the Stripe dashboard.'],
            ['Net sales', 'Gross sales − refunds.'],
            ['Product cost', 'Your cost per unit (Products → Pharmacy) × units per 30 days × months in the plan × quantity. Frozen on the order when it is paid, so a later price change does not rewrite the past. Not counted on an order closed without shipping (cancelled, denied, declined).'],
            ['Pharmacy shipping', `What the pharmacy charges us per order: $${SHIPPING_COST['2_DAY']} for 2-day, $${SHIPPING_COST.OVERNIGHT} for overnight (cold-chain). Frozen at payment like product cost.`],
            ['Stripe fees', 'The real fee from the charge’s balance transaction in Stripe. Stripe keeps it when a payment is refunded, so it stays. Where it was not recorded: 2.9% + 30¢ of the amount charged (est.). $0 orders have no fee.'],
            ['Gross profit', 'Net sales − product cost − pharmacy shipping − Stripe fees. Excludes everything else (prescriber, software, ads, payroll).'],
            ['Margin', 'Gross profit ÷ net sales.'],
            ['Orders and average order value', 'Count of orders in the range; average order value = gross sales ÷ orders.'],
            ['New and returning customers', 'Customers with an order in the range. New: their first-ever paid order is in the range. Returning: they had paid before it (refills count as returning).'],
            ['est.', 'An order paid before costs were recorded (or with the fee still on its way from Stripe) is worked out at read time from today’s costs and 2.9% + 30¢.'],
            ['Compared with', 'A range from the 1st of a month is compared with the same days of the month before; year to date with the same dates last year; anything else with the same number of days just before it.'],
            ['By product', 'Units are plans sold (a 3-month plan is 1). Product cost is by line; shipping, fees and refunds are split across an order’s lines by what each line charged.'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold text-ink">{k}</dt>
              <dd className="text-ink/70">{v}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  );
}

/* ---------------------------------- bits ---------------------------------- */

const usd = (cents: number) => (cents / 100).toFixed(2);

function download(name: string, rows: (string | number)[][]) {
  const cell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const blob = new Blob([rows.map((r) => r.map(cell).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">{children}</p>;
}

const Est = () => <span className="ml-1 text-[12px] font-normal text-amber-800">est.</span>;

function Delta({ now, prev, good, points }: { now: number; prev: number; good: 'up' | 'down' | 'none'; points?: boolean }) {
  // Margin moves in points, everything else in %.
  const d = points ? (now - prev) * 100 : change(now, prev);
  if (d === null) return <span className="text-ink/55">— vs previous</span>;
  const flat = Math.abs(d) < (points ? 0.05 : 0.0005);
  const better = good === 'none' || flat ? null : (d > 0) === (good === 'up');
  const text = points ? `${Math.abs(d).toFixed(1)} pts` : `${Math.abs(d * 100).toFixed(d !== 0 && Math.abs(d) < 0.1 ? 1 : 0)}%`;
  return (
    <span className={cn(better === true ? 'text-emerald-700' : better === false ? 'text-red-700' : 'text-ink/60')}>
      <span aria-hidden>{flat ? '→' : d > 0 ? '↑' : '↓'}</span>
      <span className="sr-only">{flat ? 'No change' : d > 0 ? 'Up' : 'Down'}</span> {flat ? '0%' : text}
      <span className="text-ink/55"> vs previous</span>
    </span>
  );
}

function MoneyTable({ first, rows, total, empty }: { first: string; rows: Row[]; total: Totals; empty: string }) {
  const heads = [first, 'Units', 'Orders', 'Net sales', 'Product cost', 'Shipping', 'Stripe fees', 'Profit', 'Margin'];
  const cells = (r: Row) => [
    r.units,
    r.orders,
    money(r.net),
    money(r.productCost),
    money(r.shippingCost),
    money(r.fees),
    <span key="p" className={cn(r.profit < 0 && 'text-red-700')}>{money(r.profit)}</span>,
    pct(r.margin),
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[14px] tabular-nums">
        <thead>
          <tr className="bg-milk text-left text-[13px] text-ink/70">
            {heads.map((h, i) => (
              <th key={h} className={cn('whitespace-nowrap px-2.5 py-2 font-semibold first:pl-4 last:pr-4', i > 0 && 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={heads.length} className="border-t border-ink/10 px-4 py-6 text-center text-ink/65">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.key}>
                <td className={cn(plainTd, 'max-w-[240px] truncate font-medium')}>{r.label}</td>
                {cells(r).map((c, i) => (
                  <td key={i} className={cn(plainTd, 'text-right')}>
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 1 && (
          <tfoot>
            <tr className="bg-milk/60 font-semibold">
              <td className={plainTd}>Total</td>
              {cells(total).map((c, i) => (
                <td key={i} className={cn(plainTd, 'text-right')}>
                  {c}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <ul className="mb-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink/75">
      {items.map(([label, color]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span aria-hidden className="h-[3px] w-4 rounded-full" style={{ background: color }} />
          {label}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------- chart --------------------------------- */

type SeriesKey = 'net' | 'profit' | 'orders';
interface Series {
  key: SeriesKey;
  label: string;
  color: string;
}

/** 0, 1, 2 or 5 × 10^n steps that cover [min, max] in about `count` ticks. */
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) max = min + 1;
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** $1.2k, $500, −$40. Money is in cents. */
function axisMoney(cents: number): string {
  const d = cents / 100;
  const a = Math.abs(d);
  const s = a >= 1000 ? `$${(a / 1000).toFixed(a >= 10000 || a % 1000 === 0 ? 0 : 1)}k` : `$${Math.round(a)}`;
  return d < 0 ? `−${s}` : s;
}

/** The container's width, for a chart drawn at real pixels (so text stays readable on phones). */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Chart({ rows, bucket, kind, series }: { rows: Row[]; bucket: 'day' | 'month'; kind: 'line' | 'bar'; series: Series[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 220;
  const money = kind === 'line';
  const values = rows.flatMap((r) => series.map((s) => r[s.key]));
  const ticks = niceTicks(Math.min(0, ...values), Math.max(money ? 100 : 1, ...values));
  // Whole orders only.
  const yTicks = money ? ticks : ticks.filter((v) => Number.isInteger(v));
  const fmtY = (v: number) => (money ? axisMoney(v) : String(v));
  const left = Math.max(...yTicks.map((v) => fmtY(v).length)) * 7 + 10;
  const top = 10;
  const bottom = 24;
  const right = 8;
  const plotW = Math.max(0, width - left - right);
  const plotH = H - top - bottom;
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const y = (v: number) => top + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const n = rows.length;
  const step = n ? plotW / n : 0;
  const x = (i: number) => left + step * (i + 0.5);

  // Label every k-th bucket so labels never collide (~64px each).
  const labelOf = (r: Row) => (bucket === 'day' ? r.label : r.label.replace(/ (\d{2})(\d{2})$/, ' ’$2'));
  const k = Math.max(1, Math.ceil(64 / (step || 1)));

  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el || !n) return;
    const i = Math.floor((clientX - el.getBoundingClientRect().left - left) / step);
    setHover(i >= 0 && i < n ? i : null);
  };
  const h = hover !== null ? rows[hover] : null;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: H }}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`${series.map((s) => s.label).join(' and ')} by ${bucket}, ${rows[0]?.label ?? ''} to ${rows[n - 1]?.label ?? ''}`}
          className="touch-pan-y"
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
        >
          {/* Grid and y axis */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={left} x2={width - right} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#11111166' : '#1111111a'} />
              <text x={left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize="12" fill="#55565A">
                {fmtY(v)}
              </text>
            </g>
          ))}
          {/* x axis labels */}
          {rows.map((r, i) =>
            i % k === 0 ? (
              <text key={r.key} x={x(i)} y={H - 6} textAnchor="middle" fontSize="12" fill="#55565A">
                {labelOf(r)}
              </text>
            ) : null,
          )}
          {/* Hover band */}
          {hover !== null && <rect x={left + step * hover} y={top} width={step} height={plotH} fill="#1111110d" />}

          {kind === 'bar'
            ? rows.map((r, i) => {
                const v = r[series[0].key];
                if (!v) return null;
                const w = Math.max(2, Math.min(28, step * 0.7));
                const y0 = y(0);
                const y1 = y(v);
                const rad = Math.min(4, w / 2, y0 - y1);
                const x0 = x(i) - w / 2;
                return (
                  <path
                    key={r.key}
                    fill={series[0].color}
                    d={`M${x0},${y0}V${y1 + rad}Q${x0},${y1} ${x0 + rad},${y1}H${x0 + w - rad}Q${x0 + w},${y1} ${x0 + w},${y1 + rad}V${y0}Z`}
                  />
                );
              })
            : series.map((s) => (
                <g key={s.key}>
                  <polyline
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={rows.map((r, i) => `${x(i)},${y(r[s.key])}`).join(' ')}
                  />
                  {hover !== null && <circle cx={x(hover)} cy={y(rows[hover][s.key])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />}
                </g>
              ))}
        </svg>
      )}
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-[150px] rounded-thumb bg-white px-3 py-2 text-[13px] shadow-[0_4px_16px_rgba(17,17,17,0.15)] ring-1 ring-ink/10"
          style={x(hover) > width / 2 ? { right: width - x(hover) + 10 } : { left: x(hover) + 10 }}
        >
          <p className="font-semibold text-ink">{bucket === 'day' ? `${h.label}, ${h.key.slice(0, 4)}` : h.label}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-3 tabular-nums text-ink/80">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-medium text-ink">{money ? formatMoney(h[s.key]) : h[s.key]}</span>
            </p>
          ))}
          {money && <p className="mt-0.5 text-ink/60">{h.orders} {h.orders === 1 ? 'order' : 'orders'}</p>}
        </div>
      )}
    </div>
  );
}
