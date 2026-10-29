'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  StatusBadge,
  fromControl,
  indexCard,
  row,
  shortDate,
  table,
  tbody,
  td,
  th,
  thead,
  toolbarSelect,
  type BadgeTone,
} from '@/components/admin/IndexTable';

export type OrderIndexRow = {
  ref: string;
  placedAt: number;
  customer: string;
  email: string;
  state: string;
  total: number;
  items: string;
  status: string;
  payment: 'Paid' | 'Refunded' | 'Partially refunded' | 'Awaiting payment' | 'Pending' | 'Not charged';
  fulfillment:
    | 'Health questions'
    | 'With prescriber'
    | 'Unfulfilled'
    | 'In progress'
    | 'Shipped'
    | 'Delivered'
    | 'Declined'
    | 'Cancelled';
  tracking: string;
  promo: string;
  archived?: boolean;
};

type Tab = 'all' | 'review' | 'unfulfilled' | 'fulfilled' | 'unpaid' | 'cancelled' | 'refunded' | 'archived';

const TABS: { key: Tab; label: string; match: (r: OrderIndexRow) => boolean }[] = [
  { key: 'all', label: 'All', match: (r) => !r.archived },
  { key: 'review', label: 'In review', match: (r) => !r.archived && (r.fulfillment === 'Health questions' || r.fulfillment === 'With prescriber') },
  { key: 'unfulfilled', label: 'Unfulfilled', match: (r) => !r.archived && (r.fulfillment === 'Unfulfilled' || r.fulfillment === 'In progress') },
  { key: 'fulfilled', label: 'Fulfilled', match: (r) => !r.archived && (r.fulfillment === 'Shipped' || r.fulfillment === 'Delivered') },
  { key: 'unpaid', label: 'Unpaid', match: (r) => !r.archived && (r.payment === 'Awaiting payment') },
  { key: 'cancelled', label: 'Cancelled', match: (r) => !r.archived && (r.fulfillment === 'Cancelled' || r.fulfillment === 'Declined') },
  { key: 'refunded', label: 'Refunded', match: (r) => !r.archived && (r.payment === 'Refunded' || r.payment === 'Partially refunded') },
  { key: 'archived', label: 'Archived', match: (r) => Boolean(r.archived) },
];

const PAYMENT_TONE: Record<OrderIndexRow['payment'], BadgeTone> = {
  Paid: 'success',
  Refunded: 'neutral',
  'Partially refunded': 'attention',
  'Awaiting payment': 'attention',
  Pending: 'neutral',
  'Not charged': 'neutral',
};

const FULFILLMENT_TONE: Record<OrderIndexRow['fulfillment'], BadgeTone> = {
  'Health questions': 'info',
  'With prescriber': 'info',
  Unfulfilled: 'attention',
  'In progress': 'attention',
  Shipped: 'success',
  Delivered: 'success',
  Declined: 'critical',
  Cancelled: 'neutral',
};

type Range = 'all' | '7' | '30' | '90';
type Sort = 'new' | 'old' | 'high' | 'low';

const money = (n: number) => `$${n.toFixed(2)}`;

function csv(rows: OrderIndexRow[]) {
  const cols: (keyof OrderIndexRow)[] = ['ref', 'placedAt', 'customer', 'email', 'state', 'total', 'payment', 'fulfillment', 'items', 'tracking', 'promo'];
  const cell = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    cols.map((c) => cell(c === 'placedAt' ? new Date(r.placedAt).toISOString() : r[c])).join(','),
  );
  const blob = new Blob([[cols.join(','), ...body].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Shopify's Orders list: every order, any state, one click to its page. */
export function AdminOrdersIndex({ rows }: { rows: OrderIndexRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<Range>('all');
  const [sort, setSort] = useState<Sort>('new');

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, rows.filter(t.match).length])) as Record<Tab, number>,
    [rows],
  );

  const shown = useMemo(() => {
    const match = TABS.find((t) => t.key === tab)!.match;
    const q = query.trim().toLowerCase().replace(/^#/, '');
    const since = range === 'all' ? 0 : Date.now() - Number(range) * 86_400_000;
    const list = rows.filter(
      (r) =>
        match(r) &&
        r.placedAt >= since &&
        (!q || [r.ref, r.customer, r.email, r.items, r.state, r.tracking, r.promo].some((v) => v.toLowerCase().includes(q))),
    );
    const by: Record<Sort, (a: OrderIndexRow, b: OrderIndexRow) => number> = {
      new: (a, b) => b.placedAt - a.placedAt,
      old: (a, b) => a.placedAt - b.placedAt,
      high: (a, b) => b.total - a.total,
      low: (a, b) => a.total - b.total,
    };
    return list.sort(by[sort]);
  }, [rows, tab, query, range, sort]);

  return (
    <div className={indexCard}>
      <IndexTabs
        label="Order filters"
        value={tab}
        onChange={setTab}
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key] }))}
      />
      <IndexToolbar query={query} onQuery={setQuery} placeholder="Search order #, customer, email, product, tracking">
        <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value as Range)} className={toolbarSelect}>
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={toolbarSelect}>
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
          <option value="high">Total: high to low</option>
          <option value="low">Total: low to high</option>
        </select>
        <button
          type="button"
          onClick={() => csv(shown)}
          disabled={shown.length === 0}
          className="inline-flex h-10 items-center rounded-thumb bg-white px-3 text-[14px] font-semibold text-ink ring-1 ring-ink/15 hover:bg-milk disabled:opacity-50 md:h-9"
        >
          Export
        </button>
      </IndexToolbar>

      {shown.length === 0 ? (
        <p className="px-4 py-10 text-center text-[14px] text-ink/65">No orders match.</p>
      ) : (
        <table className={table}>
          <thead className={thead}>
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Date</th>
              <th className={th}>Customer</th>
              <th className={`${th} text-right`}>Total</th>
              <th className={th}>Payment</th>
              <th className={th}>Fulfillment</th>
              <th className={th}>Items</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {shown.map((r) => {
              const href = `/portal/admin/orders/${r.ref}`;
              return (
                <tr
                  key={r.ref}
                  className={row}
                  onClick={(e) => !fromControl(e.target) && router.push(href)}
                  onMouseEnter={() => router.prefetch(href)}
                >
                  <td className={`${td} font-semibold text-ink`}>
                    <a href={href} onClick={(e) => { e.preventDefault(); router.push(href); }} className="hover:underline">
                      #{r.ref}
                    </a>
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink/70`}>{shortDate(r.placedAt)}</td>
                  <td className={`${td} min-w-0 basis-full md:basis-auto`}>
                    <span className="block truncate text-ink">{r.customer || r.email}</span>
                    <span className="block truncate text-[13px] text-ink/60 md:hidden">{r.items}</span>
                  </td>
                  <td className={`${td} tabular-nums text-ink md:text-right`}>{money(r.total)}</td>
                  <td className={td}>
                    <StatusBadge tone={PAYMENT_TONE[r.payment]}>{r.payment}</StatusBadge>
                  </td>
                  <td className={td}>
                    <StatusBadge tone={FULFILLMENT_TONE[r.fulfillment]}>{r.fulfillment}</StatusBadge>
                  </td>
                  <td className={`${td} hidden max-w-[260px] truncate text-ink/70 md:table-cell`}>{r.items}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <IndexFooter shown={shown.length} total={rows.length} noun="orders" />
    </div>
  );
}
