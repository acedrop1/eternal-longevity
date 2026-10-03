'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { BoardRow } from '@/lib/fulfillment-core';
import type { Order } from '@/lib/orders';
import { useOrders } from '@/components/orders/OrdersProvider';
import { LIVE_ORDER_STATUSES, attentionFor } from '@/components/admin/AdminLiveOrders';
import { paymentState } from '@/lib/order-health';
import { formatMoney } from '@/lib/format';
import {
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  StatusBadge,
  fromControl,
  indexCard,
  row as rowClass,
  shortDate,
  table,
  tbody,
  td,
  th,
  thead,
  toolbarSelect,
  type BadgeTone,
} from '@/components/admin/IndexTable';
import { cn } from '@/lib/utils';
import {
  PAYMENT,
  STAGE,
  STAGE_INFO,
  STATUS,
  displayRef,
  fulfillmentBadge,
  orderHref,
  pharmacyBadge,
  trackingHref,
  type Stage,
} from '@/components/fulfillment/order-status';

/**
 * The orders index admin and the prescriber share. Every paid order, first
 * cycle or refill, lands in "To place" until someone places it on the
 * pharmacy's platform and marks it here; then tracking, then delivery. Both
 * portals see the same rows, and whoever marks a step first owns it.
 * Each row opens the order page (/portal/admin/orders/[ref]), where the
 * steps are marked.
 *
 * With `admin`, the live orders (OrdersProvider) join in: totals, payment,
 * anything needing attention, and orders still with the prescriber that
 * have not reached the board yet.
 */

type Tab = 'all' | Exclude<Stage, 'other'> | 'issues';
/** The ?tab= values the index reads (review is admin's only). */
const TABS: Tab[] = ['all', 'review', 'place', 'placed', 'shipped', 'delivered', 'issues'];
// What is waiting is worked oldest first; everything else reads newest first.
const waitingTab = (t: Tab) => t === 'issues' || t === 'review';

interface IndexRow {
  key: string;
  board?: BoardRow;
  order?: Order;
  stage: Stage;
  ref: string;
  /** The order page. */
  href: string;
  date: number;
  customer: string;
  items: string[];
  refill: boolean;
  attention: string | null;
  late: boolean;
  issue: boolean;
  /** Whole days it has waited at this stage. */
  ageDays: number;
  /** One line on why it is an issue, for the Issues tab. */
  reason: string | null;
}

function paymentOf(row: IndexRow): [string, BadgeTone] | null {
  const state = row.order ? paymentState(row.order) : null;
  return state ? PAYMENT[state] : null;
}

const unpaid = (o?: Order) => {
  const p = o ? paymentState(o) : null;
  return p === 'awaiting' || p === 'failed';
};

const DAY = 86400_000;

function buildRows(board: BoardRow[], orders: Order[]): IndexRow[] {
  const byNumber = new Map(orders.map((o) => [o.id, o]));
  const onBoard = new Set<string>();
  const out: IndexRow[] = board.map((b) => {
    const order = b.orderNumber ? byNumber.get(b.orderNumber) : undefined;
    if (b.orderNumber) onBoard.add(b.orderNumber);
    const stage = STAGE[b.status];
    const attention = order && LIVE_ORDER_STATUSES.includes(order.status) ? attentionFor(order) : null;
    const late = b.ageDays >= STAGE_INFO[stage].lateAfter;
    const critical = !!b.pharmacy && pharmacyBadge(b.pharmacy)[1] === 'critical';
    return {
      key: b.id,
      board: b,
      order,
      stage,
      ref: displayRef(b.orderNumber ?? b.orderRef),
      href: orderHref(b.orderNumber ?? b.orderRef),
      date: new Date(b.createdAt).getTime(),
      customer: b.patientName,
      items: b.items,
      refill: !!b.cycleLabel?.startsWith('Refill'),
      attention,
      late,
      issue: late || !!attention || critical || unpaid(order),
      ageDays: b.ageDays,
      reason:
        attention ??
        (critical && b.pharmacy ? b.pharmacy.reason ?? b.pharmacy.error ?? pharmacyBadge(b.pharmacy)[0] : null) ??
        (late ? `${STATUS[b.status][0]} for ${b.ageDays} days` : null),
    };
  });
  // Orders still in motion that have not reached the board (most often: with the prescriber).
  for (const o of orders) {
    if (onBoard.has(o.id) || !LIVE_ORDER_STATUSES.includes(o.status)) continue;
    const attention = attentionFor(o);
    out.push({
      key: `order-${o.id}`,
      order: o,
      stage: o.status === 'assigned' ? 'review' : 'other',
      ref: displayRef(o.id),
      href: orderHref(o.id),
      date: o.placedAt,
      customer: o.memberName,
      items: o.lines.map((l) => l.productName),
      refill: false,
      attention,
      late: false,
      issue: !!attention || unpaid(o),
      ageDays: Math.floor((Date.now() - o.placedAt) / DAY),
      reason: attention,
    });
  }
  return out;
}

export function FulfillmentBoard({
  rows,
  admin = false,
  sampleOrders,
}: {
  rows: BoardRow[];
  /** Join the live orders in (totals, payment, cancel, orders with the prescriber). */
  admin?: boolean;
  /** Dev-only fixture in place of the provider's orders. */
  sampleOrders?: Order[];
}) {
  const { orders: liveOrders } = useOrders();
  const orders = admin ? sampleOrders ?? liveOrders : [];
  const all = useMemo(() => buildRows(rows, orders), [rows, orders]);

  // ?tab= lands on a tab (the Overview cards link here), and the URL follows the tabs.
  const router = useRouter();
  const pathname = usePathname();
  const asked = useSearchParams().get('tab') as Tab | null;
  const initialTab: Tab = asked && TABS.includes(asked) && (admin || asked !== 'review') ? asked : 'all';
  const [tab, setTabState] = useState<Tab>(initialTab);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'new' | 'refill'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>(waitingTab(initialTab) ? 'oldest' : 'newest');
  const setTab = (t: Tab) => {
    setTabState(t);
    setSort(waitingTab(t) ? 'oldest' : 'newest');
    router.replace(t === 'all' ? pathname : `${pathname}?tab=${t}`, { scroll: false });
  };

  const count = (t: Tab) => all.filter((r) => inTab(r, t)).length;
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    ...(admin ? [{ key: 'review' as const, label: 'With prescriber', count: count('review') }] : []),
    { key: 'place', label: 'To place', count: count('place') },
    { key: 'placed', label: 'Placed', count: count('placed') },
    { key: 'shipped', label: 'Shipped', count: count('shipped') },
    { key: 'delivered', label: 'Delivered', count: count('delivered') },
    { key: 'issues', label: 'Issues', count: count('issues') },
  ];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((r) => inTab(r, tab))
      .filter((r) => kind === 'all' || (kind === 'refill') === r.refill)
      .filter(
        (r) =>
          !q ||
          [r.ref, r.customer, r.items.join(' '), r.board?.trackingNumber, r.board?.pharmacy?.orderId, r.order?.memberEmail]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => (sort === 'newest' ? b.date - a.date : a.date - b.date));
  }, [all, tab, kind, query, sort]);

  const cols = admin ? 9 : 7;
  const note = tab !== 'all' && tab !== 'issues' ? STAGE_INFO[tab].note : '';

  return (
    <div className={indexCard}>
      <IndexTabs label="Order status" tabs={tabs} value={tab} onChange={setTab} />
      <IndexToolbar query={query} onQuery={setQuery} placeholder="Search orders, customers, tracking">
        <select aria-label="Order type" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={toolbarSelect}>
          <option value="all">All types</option>
          <option value="new">New orders</option>
          <option value="refill">Refills</option>
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={toolbarSelect}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </IndexToolbar>
      {note && <p className="border-b border-ink/10 px-4 py-2 text-[14px] text-ink/65 md:text-[12px]">{note}</p>}

      <div className="md:overflow-x-auto">
      <table className={table}>
        <thead className={thead}>
          <tr>
            <th className={th}>Order</th>
            <th className={th}>Date</th>
            <th className={th}>Customer</th>
            <th className={th}>Items</th>
            {admin && <th className={cn(th, 'text-right')}>Total</th>}
            {admin && <th className={th}>Payment</th>}
            <th className={th}>Fulfillment</th>
            <th className={th}>Pharmacy</th>
            <th className={th}>Tracking</th>
          </tr>
        </thead>
        <tbody className={tbody}>
          {visible.length === 0 ? (
            <tr className="block md:table-row">
              <td colSpan={cols} className="block px-4 py-10 text-center text-[13px] text-ink/65 md:table-cell">
                {all.length === 0 ? 'No orders yet. Paid orders appear here.' : 'No orders match.'}
              </td>
            </tr>
          ) : (
            visible.map((r) => (
              <OrderRow
                key={r.key}
                row={r}
                admin={admin}
                showAge={waitingTab(tab)}
              />
            ))
          )}
        </tbody>
      </table>
      </div>
      <IndexFooter shown={visible.length} total={all.length} noun="orders" />
    </div>
  );
}

function inTab(r: IndexRow, t: Tab): boolean {
  return t === 'all' || (t === 'issues' ? r.issue : r.stage === t);
}

function OrderRow({
  row,
  admin,
  showAge,
}: {
  row: IndexRow;
  admin: boolean;
  showAge: boolean;
}) {
  const router = useRouter();
  const b = row.board;
  const o = row.order;
  const status = fulfillmentBadge(b, o);
  const pharmacy = b?.pharmacy ? pharmacyBadge(b.pharmacy) : null;
  const payment = paymentOf(row);
  const trackingNumber = b?.trackingNumber ?? o?.tracking ?? null;
  const trackingCarrier = b?.trackingCarrier ?? o?.carrier ?? null;
  const href = trackingNumber ? trackingHref(trackingCarrier, trackingNumber) : null;

  return (
    <tr
      // No chevron any more, so the stacked (mobile) row needs no room for one.
      className={cn(rowClass, 'pr-4')}
      onClick={(e) => {
        if (!fromControl(e.target)) router.push(row.href);
      }}
    >
      <td className={cn(td, 'order-1 whitespace-nowrap font-medium text-ink')}>
        <Link href={row.href} className="underline decoration-transparent underline-offset-[3px] hover:decoration-ink/40">
          {row.ref}
        </Link>
        {row.refill && <span className="ml-1.5 text-[13px] font-normal text-ink/60 md:text-[12px]">Refill</span>}
      </td>
      <td className={cn(td, 'order-7 basis-full whitespace-nowrap text-[14px] text-ink/60 md:text-[13px]')}>
        {shortDate(row.date)}
        {(showAge || (row.late && b)) && (
          <span
            className={cn('ml-1 font-medium', row.late ? 'text-red-700' : 'text-ink/70')}
            title={`Waiting ${row.ageDays} days`}
          >
            · {row.ageDays}d<span className="sr-only"> waiting</span>
          </span>
        )}
      </td>
      <td className={cn(td, 'order-2 min-w-0 text-ink')}>
        <div className="truncate md:max-w-[160px]">
        {admin && o?.userId ? (
          <Link
            href={`/portal/admin/members/${o.userId}`}
            className="underline decoration-transparent underline-offset-[3px] hover:decoration-ink/40"
          >
            {row.customer}
          </Link>
        ) : (
          row.customer
        )}
        </div>
        {showAge && row.reason && (
          <div className="truncate text-[14px] text-amber-800 md:max-w-[220px] md:text-[12px]" title={row.reason}>
            {row.reason}
          </div>
        )}
      </td>
      <td className={cn(td, 'order-4 min-w-0 basis-full text-ink/65')}>
        <div className="truncate md:max-w-[170px]">{row.items.join(' · ') || 'Care program'}</div>
      </td>
      {admin && (
        <td className={cn(td, 'order-3 ml-auto whitespace-nowrap tabular-nums text-ink md:text-right')}>
          {o ? formatMoney(Math.round(o.total * 100)) : <span className="hidden text-ink/35 md:inline">—</span>}
        </td>
      )}
      {admin && (
        <td className={cn(td, 'order-5', !payment && 'hidden')}>
          {payment ? <StatusBadge tone={payment[1]}>{payment[0]}</StatusBadge> : <span className="text-ink/35">—</span>}
        </td>
      )}
      <td className={cn(td, 'order-5')}>
        {status && <StatusBadge tone={status[1]}>{status[0]}</StatusBadge>}
      </td>
      <td className={cn(td, 'order-5', !pharmacy && 'hidden')}>
        {pharmacy ? <StatusBadge tone={pharmacy[1]}>{pharmacy[0]}</StatusBadge> : <span className="text-ink/35">—</span>}
      </td>
      <td className={cn(td, 'order-6 whitespace-nowrap text-[14px] text-ink/70 md:text-[12px]', !trackingNumber && 'hidden')}>
        {trackingNumber ? (
          <div className="truncate md:max-w-[110px]">
            {trackingCarrier}{' '}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
              >
                {trackingNumber}
              </a>
            ) : (
              trackingNumber
            )}
          </div>
        ) : (
          <span className="text-ink/35">—</span>
        )}
      </td>
    </tr>
  );
}
