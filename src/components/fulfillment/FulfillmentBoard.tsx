'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  markDeliveredAction,
  pharmacyAcceptOrder,
  pharmacyAddTracking,
  retrySendToPharmacyAction,
  type FulfillmentResult,
} from '@/lib/fulfillment-actions';
import type { BoardRow } from '@/lib/fulfillment-core';
import { STATUS_LABEL, type Order } from '@/lib/orders';
import { useOrders } from '@/components/orders/OrdersProvider';
import { CancelOrder, LIVE_ORDER_STATUSES, attentionFor } from '@/components/admin/AdminLiveOrders';
import { paymentState, type PaymentState } from '@/lib/order-health';
import { formatMoney } from '@/lib/format';
import {
  Chevron,
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  StatusBadge,
  detailCell,
  detailRow,
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
import { btnPrimary, btnSecondary, inset, sentenceCase } from '@/components/portal/ui';
import { cn } from '@/lib/utils';

/**
 * The orders index admin and the prescriber share. Every paid order, first
 * cycle or refill, lands in "To place" until someone places it on the
 * pharmacy's platform and marks it here; then tracking, then delivery. Both
 * portals see the same rows, and whoever marks a step first owns it.
 *
 * With `admin`, the live orders (OrdersProvider) join in: totals, payment,
 * anything needing attention, the cancel action, and orders still with the
 * prescriber that have not reached the board yet.
 */

const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL'];

type Stage = 'review' | 'place' | 'placed' | 'shipped' | 'delivered' | 'other';
type Tab = 'all' | Exclude<Stage, 'other'> | 'issues';

const STAGE: Record<BoardRow['status'], Stage> = {
  draft: 'place',
  submitted: 'place',
  accepted: 'placed',
  shipped: 'shipped',
  delivered: 'delivered',
  canceled: 'other',
};

/** Per stage: when a row counts as late, and the one-line instruction for that tab. */
const STAGE_INFO: Record<Stage, { lateAfter: number; note: string }> = {
  review: { lateAfter: Infinity, note: 'With the prescriber. They join To place once signed and paid.' },
  place: {
    lateAfter: 1,
    note: 'Paid and approved. Orders with a pharmacy SKU are sent automatically. Place any others in the pharmacy portal, then mark them placed.',
  },
  placed: {
    lateAfter: 3,
    note: 'Add the tracking number when the pharmacy ships it. The patient is emailed automatically.',
  },
  shipped: { lateAfter: 7, note: 'Mark delivered once the carrier shows it arrived. The patient is emailed.' },
  delivered: { lateAfter: Infinity, note: 'Delivered in the last 14 days.' },
  other: { lateAfter: Infinity, note: '' },
};

const STATUS: Record<BoardRow['status'], [string, BadgeTone]> = {
  draft: ['To place', 'attention'],
  submitted: ['To place', 'attention'],
  accepted: ['Placed', 'info'],
  shipped: ['Shipped', 'success'],
  delivered: ['Delivered', 'neutral'],
  canceled: ['Canceled', 'neutral'],
};

/** The pharmacy API's status words (and our own: SENDING, ERROR, MANUAL, DRY_RUN). */
const PHARMACY: Record<string, [string, BadgeTone]> = {
  SENDING: ['Sending to pharmacy', 'info'],
  COMPOUNDING: ['Compounding', 'info'],
  QA_PENDING: ['Pharmacy QA', 'info'],
  SHIPPED: ['Shipped by pharmacy', 'success'],
  IN_TRANSIT: ['In transit', 'success'],
  OUT_FOR_DELIVERY: ['Out for delivery', 'success'],
  DELIVERED: ['Delivered', 'neutral'],
  HOLD: ['Pharmacy hold', 'critical'],
  EXCEPTION: ['Carrier exception', 'critical'],
  CANCELLED: ['Pharmacy cancelled', 'critical'],
  ERROR: ['Pharmacy error', 'critical'],
  MANUAL: ['Place by hand', 'attention'],
  DRY_RUN: ['Dry run · not sent', 'attention'],
};
const RETRYABLE = ['ERROR', 'MANUAL', 'DRY_RUN'];

/** Anything the pharmacy says before verification (AWAITING_VERIFICATION…) reads as sent. */
const pharmacyBadge = (p: NonNullable<BoardRow['pharmacy']>): [string, BadgeTone] =>
  PHARMACY[p.status] ?? ['Sent to pharmacy', 'info'];

function trackingHref(carrier: string | null, n: string): string | null {
  return /fedex/i.test(carrier ?? '') ? `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}` : null;
}

const displayRef = (n: string) => (/^\d+$/.test(n) ? `#${n}` : n.toUpperCase());

interface IndexRow {
  key: string;
  board?: BoardRow;
  order?: Order;
  stage: Stage;
  ref: string;
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

/** Paid is paid_confirmed_at and nothing else (lib/order-health). */
const PAYMENT: Record<PaymentState, [string, BadgeTone]> = {
  paid: ['Paid', 'neutral'],
  pending: ['Pending', 'attention'],
  awaiting: ['Awaiting payment', 'attention'],
  failed: ['Payment failed', 'critical'],
};

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

  const [tab, setTabState] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'new' | 'refill'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  // What is waiting is worked oldest first; everything else reads newest first.
  const waitingTab = (t: Tab) => t === 'issues' || t === 'review';
  const setTab = (t: Tab) => {
    setTabState(t);
    setSort(waitingTab(t) ? 'oldest' : 'newest');
  };
  const [openKey, setOpenKey] = useState<string | null>(null);

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

  const cols = admin ? 10 : 8;
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
      {note && <p className="border-b border-ink/10 px-4 py-2 text-[12px] text-ink/65">{note}</p>}

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
            <th className={th}>
              <span className="sr-only">Details</span>
            </th>
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
                cols={cols}
                open={openKey === r.key}
                onToggle={() => setOpenKey((k) => (k === r.key ? null : r.key))}
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
  cols,
  open,
  onToggle,
}: {
  row: IndexRow;
  admin: boolean;
  showAge: boolean;
  cols: number;
  open: boolean;
  onToggle: () => void;
}) {
  const b = row.board;
  const o = row.order;
  const status: [string, BadgeTone] | null = b
    ? STATUS[b.status]
    : o
      ? [sentenceCase(STATUS_LABEL[o.status] ?? o.status), o.status === 'assigned' ? 'info' : 'neutral']
      : null;
  const pharmacy = b?.pharmacy ? pharmacyBadge(b.pharmacy) : null;
  const payment = paymentOf(row);
  const trackingNumber = b?.trackingNumber ?? o?.tracking ?? null;
  const trackingCarrier = b?.trackingCarrier ?? o?.carrier ?? null;
  const href = trackingNumber ? trackingHref(trackingCarrier, trackingNumber) : null;

  return (
    <Fragment>
      <tr
        className={cn(rowClass, open && 'bg-milk/70')}
        onClick={(e) => {
          if (!fromControl(e.target)) onToggle();
        }}
      >
        <td className={cn(td, 'order-1 whitespace-nowrap font-medium text-ink')}>
          {row.ref}
          {row.refill && <span className="ml-1.5 text-[12px] font-normal text-ink/60">Refill</span>}
        </td>
        <td className={cn(td, 'order-7 basis-full whitespace-nowrap text-[12px] text-ink/60 md:text-[13px]')}>
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
            <div className="truncate text-[12px] text-amber-800 md:max-w-[220px]" title={row.reason}>
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
        <td className={cn(td, 'order-6 whitespace-nowrap text-[12px] text-ink/70', !trackingNumber && 'hidden')}>
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
        <td className={cn(td, 'absolute right-2 top-2 md:static md:w-10 md:pl-0 md:text-right')}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} details for ${row.ref}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-thumb text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
          >
            <Chevron open={open} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className={detailRow}>
          <td colSpan={cols} className={detailCell}>
            <Detail row={row} admin={admin} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function Detail({ row, admin }: { row: IndexRow; admin: boolean }) {
  const b = row.board;
  const o = row.order;
  const details: [string, string][] = b
    ? [
        ['Patient', b.patientName],
        ['Date of birth', b.patientDob ?? '—'],
        ['Phone', b.phone ?? '—'],
        ['Ship to', b.address || '—'],
        ['Items', b.items.join('; ') || '—'],
        ['Plan', b.cycleLabel ?? '—'],
        ['Prescriber', b.prescriber ? `${b.prescriber}${b.npi ? ` · NPI ${b.npi}` : ''}` : '—'],
      ]
    : [];

  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        {row.attention && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-900">
            {row.attention}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink/60">
          <StatusBadge tone={row.refill ? 'attention' : 'neutral'}>{row.refill ? 'Refill' : 'New order'}</StatusBadge>
          {row.late && b && <StatusBadge tone="critical">Waiting {b.ageDays} days</StatusBadge>}
          {b && <span>{b.orderRef}</span>}
          {b?.pharmacy?.orderId && <span>· Pharmacy order {b.pharmacy.orderId}</span>}
        </div>
        {b?.pharmacy && (b.pharmacy.reason ?? b.pharmacy.error) && (
          <p className={cn('text-[13px]', pharmacyBadge(b.pharmacy)[1] === 'critical' ? 'text-red-800' : 'text-ink/70')}>
            {b.pharmacy.reason ?? b.pharmacy.error}
          </p>
        )}
        {b?.notes && <p className="text-[13px] text-ink/60">{b.notes}</p>}

        {b ? (
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink/65">Details for the pharmacy</p>
            <dl className={cn(inset, 'divide-y divide-ink/10 text-[13px]')}>
              {details.map(([k, v]) => (
                <div key={k} className="flex gap-4 px-3 py-2">
                  <dt className="w-28 flex-none text-[12px] text-ink/65">{k}</dt>
                  <dd className="min-w-0 break-words text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <CopyButton text={details.map(([k, v]) => `${k}: ${v}`).join('\n')} />
          </div>
        ) : (
          o && (
            <p className="text-[13px] text-ink/70">
              {o.lines.map((l) => `${l.productName} · ${l.cadenceLabel}`).join('; ')} · {formatMoney(Math.round(o.total * 100))}. Not on the
              board yet; it joins To place once signed and paid.
            </p>
          )
        )}

        {admin && o?.userId && (
          <Link
            href={`/portal/admin/members/${o.userId}`}
            className="inline-block text-[13px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
          >
            Open member record
          </Link>
        )}
      </div>

      <div className="w-full flex-none space-y-3 md:w-[320px]">
        {b && <Actions row={b} />}
        {admin && o && <CancelOrder order={o} />}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className="mt-2 text-[13px] text-ink/70 underline decoration-ink/30 underline-offset-[3px] hover:text-ink hover:decoration-ink"
    >
      {done ? 'Copied' : 'Copy all details'}
    </button>
  );
}

function Actions({ row }: { row: BoardRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<FulfillmentResult | null>(null);
  const [ref, setRef] = useState('');
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [tracking, setTracking] = useState('');

  const run = (fn: () => Promise<FulfillmentResult>) =>
    start(async () => {
      setResult(null);
      try {
        const r = await fn();
        setResult(r);
        // Refresh on "already done" too, so the row moves to where it really is.
        router.refresh();
      } catch {
        setResult({ ok: false, message: 'Request failed. Try again.' });
      }
    });

  const input =
    'w-full rounded-inner bg-white px-3 py-2.5 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30';

  const canRetry =
    (row.status === 'submitted' || row.status === 'draft') &&
    !!row.pharmacy &&
    !row.pharmacy.orderId &&
    RETRYABLE.includes(row.pharmacy.status);

  return (
    <div className="space-y-2">
      {canRetry && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => retrySendToPharmacyAction(row.id))}
          className={cn(btnSecondary, 'w-full')}
        >
          {pending ? 'Sending…' : 'Retry send to pharmacy'}
        </button>
      )}
      {(row.status === 'submitted' || row.status === 'draft') && (
        <>
          <label className="block text-[13px] font-medium text-ink/70" htmlFor={`ref-${row.id}`}>
            Pharmacy order number (optional)
          </label>
          <input
            id={`ref-${row.id}`}
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. 104233"
            className={input}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => pharmacyAcceptOrder(row.id, ref))}
            className={cn(btnPrimary, 'w-full')}
          >
            {pending ? 'Saving…' : 'Mark placed'}
          </button>
        </>
      )}

      {row.status === 'accepted' && (
        <>
          <div className="flex gap-2">
            <select
              aria-label="Carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className={cn(input, 'w-28 flex-none')}
            >
              {CARRIERS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              aria-label="Tracking number"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Tracking number"
              className={input}
            />
          </div>
          <button
            type="button"
            disabled={pending || !tracking.trim()}
            onClick={() =>
              run(() => pharmacyAddTracking({ fulfillmentId: row.id, carrier, trackingNumber: tracking }))
            }
            className={cn(btnPrimary, 'w-full disabled:opacity-40')}
          >
            {pending ? 'Saving…' : 'Mark shipped'}
          </button>
        </>
      )}

      {row.status === 'shipped' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markDeliveredAction(row.id))}
          className={cn(btnSecondary, 'w-full')}
        >
          {pending ? 'Saving…' : 'Mark delivered'}
        </button>
      )}

      {result && (
        <p role="status" className={cn('text-[13px]', result.ok ? 'text-emerald-800' : 'text-red-800')}>
          {result.message}
        </p>
      )}
    </div>
  );
}
