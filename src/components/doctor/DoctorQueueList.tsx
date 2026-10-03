'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/components/orders/OrdersProvider';
import { waited } from '@/lib/order-health';
import { STATUS_LABEL, type Order } from '@/lib/orders';
import { cn } from '@/lib/utils';
import type { PatientReview } from '@/lib/clinical-review';
import { orderRef } from '@/lib/format';
import type { ThreadStatus } from '@/lib/prescriber-view';
import { ReviewChip, ThreadChip } from '@/components/doctor/CategoryAnswers';
import {
  IndexFooter,
  IndexTabs,
  MetricCard,
  StatusBadge,
  fromControl,
  indexCard,
  row as rowClass,
  table,
  tbody,
  td,
  th,
  thead,
} from '@/components/admin/IndexTable';
import { sentenceCase } from '@/components/portal/ui';

/**
 * The clinical queue, Shopify index style: four numbers, then the cases in
 * tabs, oldest first. Each row opens the case (/portal/doctor/review/[ref]),
 * where the record is read and the prescription signed or declined.
 */

type Tab = 'review' | 'waiting' | 'active';

interface DoctorQueueListProps {
  /** The intake behind each waiting order, keyed by order number. */
  reviews: Record<string, PatientReview>;
  /** Doctor-thread state per patient (user id): waiting on them, or they replied. */
  threads: Record<string, ThreadStatus>;
  /** Patient threads whose newest message is the patient's. */
  messagesAwaiting: number;
  /** Dev only: sample orders, shown beside whatever the provider holds. */
  sampleOrders?: Order[];
}

const hoursSince = (at: number) => Math.max(0, Math.floor((Date.now() - at) / 3_600_000));

/** Every flagged answer in a record, as the case page's summary counts them. */
const flagCount = (r?: PatientReview) =>
  r
    ? [...r.categories.flatMap((c) => c.items), ...r.safety, ...r.history, ...r.context].filter((l) => l.flag).length
    : 0;

export function DoctorQueueList({ reviews, threads, messagesAwaiting, sampleOrders }: DoctorQueueListProps) {
  const [tab, setTab] = useState<Tab>('review');
  const provider = useOrders();
  const orders = sampleOrders
    ? [...sampleOrders.filter((s) => !provider.orders.some((o) => o.id === s.id)), ...provider.orders]
    : provider.orders;

  // One medical director handles every case — no per-physician routing.
  // Oldest first: the case that has waited longest is the one to sign next.
  const oldestFirst = (a: Order, b: Order) => a.placedAt - b.placedAt;
  const allQueue = orders.filter((o) => o.status === 'assigned').sort(oldestFirst);
  const isWaiting = (o: Order) => threads[o.userId ?? '']?.state === 'waiting';
  const waitingOnPatient = allQueue.filter(isWaiting);
  const active = orders.filter((o) => ['signed', 'paid', 'compounding', 'shipped'].includes(o.status)).sort(oldestFirst);
  const overDay = allQueue.filter((o) => hoursSince(o.placedAt) >= 24).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const approvedToday = orders.filter((o) =>
    o.updates?.some((u) => u.statusChange === 'signed' && u.at >= today.getTime()),
  ).length;

  const rows = tab === 'review' ? allQueue : tab === 'waiting' ? waitingOnPatient : active;
  const empty: Record<Tab, [string, string]> = {
    review: ['Queue is clear', 'New orders appear here as soon as a member checks out.'],
    waiting: ['Nobody to wait on', 'Cases you have asked a question on appear here until the patient replies.'],
    active: [
      'Nothing to manage',
      "Cases you've signed appear here until they are delivered. Placing, tracking and delivery are marked on Orders.",
    ],
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 max-md:[&_p:first-child]:text-[14px]">
        <MetricCard label="Awaiting review" value={allQueue.length} />
        <MetricCard
          label="Waiting over 24h"
          value={<span suppressHydrationWarning className={cn(overDay > 0 && 'text-red-700')}>{overDay}</span>}
        />
        <MetricCard label="Approved today" value={<span suppressHydrationWarning>{approvedToday}</span>} />
        <MetricCard label="Messages awaiting reply" value={messagesAwaiting} href="/portal/doctor/messages" />
      </div>

      {/* Phones: the shared tabs are 36px tall; 44px here. */}
      <div className={cn(indexCard, 'max-md:[&_[role=tab]]:min-h-[44px] max-md:[&_[role=tab]]:text-[15px]')}>
        <IndexTabs
          label="Cases"
          tabs={[
            { key: 'review', label: 'Awaiting review', count: allQueue.length },
            { key: 'waiting', label: 'Waiting on patient', count: waitingOnPatient.length },
            { key: 'active', label: 'Active cases', count: active.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <h2 className="mb-1 text-[16px] font-semibold text-ink md:text-[14px]">{empty[tab][0]}</h2>
            <p className="mx-auto max-w-md text-[15px] leading-relaxed text-ink/65 md:text-[13px]">{empty[tab][1]}</p>
          </div>
        ) : (
          // A narrow tablet scrolls the card sideways, never the page.
          <div className="md:overflow-x-auto">
          <table className={table}>
            <thead className={thead}>
              <tr>
                <th className={th}>Patient</th>
                <th className={th}>Product</th>
                <th className={th}>State</th>
                <th className={th}>{tab === 'active' ? 'Status' : 'Waiting'}</th>
                <th className={th}>Flags</th>
                <th className={th}>Thread</th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {rows.map((o) => (
                <CaseRow key={o.id} order={o} review={reviews[o.id]} thread={threads[o.userId ?? '']} active={tab === 'active'} />
              ))}
            </tbody>
          </table>
          </div>
        )}
        <IndexFooter shown={rows.length} total={rows.length} noun={rows.length === 1 ? 'case' : 'cases'} />
      </div>
    </div>
  );
}

function CaseRow({
  order: o,
  review,
  thread,
  active,
}: {
  order: Order;
  review?: PatientReview;
  thread?: ThreadStatus;
  active: boolean;
}) {
  const router = useRouter();
  const href = `/portal/doctor/review/${encodeURIComponent(o.id)}`;
  const hours = hoursSince(o.placedAt);
  const flags = flagCount(review);
  const product = o.lines.map((l) => `${l.productName} (${l.cadenceLabel})`).join(' + ') || '—';
  const waiting = (
    <span suppressHydrationWarning className={cn(hours >= 24 && 'font-medium text-red-700')}>
      waiting {waited(hours)}
    </span>
  );
  const status = <StatusBadge tone="success">{sentenceCase(STATUS_LABEL[o.status])}</StatusBadge>;
  const chips = (
    <>
      {flags > 0 && <ReviewChip>{flags} to weigh</ReviewChip>}
      {review?.photosPending && <ReviewChip>Photos pending</ReviewChip>}
      <ThreadChip status={thread} />
    </>
  );

  return (
    <tr
      className={cn(rowClass, 'gap-y-1 py-3.5 pr-4 text-[15px] md:text-[13px]')}
      onClick={(e) => {
        if (!fromControl(e.target)) router.push(href);
      }}
    >
      <td className={cn(td, 'block min-w-0 basis-full')}>
        <div className="flex items-baseline justify-between gap-3">
          <Link
            href={href}
            className="min-w-0 truncate text-[16px] font-semibold text-ink underline decoration-transparent underline-offset-[3px] hover:decoration-ink/40 md:text-[13px] md:font-medium"
          >
            {o.memberName || o.memberEmail}
          </Link>
          <span className="flex-none text-[15px] text-ink/65 md:hidden">{active ? null : waiting}</span>
        </div>
        <p className="text-[15px] text-ink/60 md:text-[12px]">{orderRef(o.id)}</p>
        {/* Phones: one stacked card, everything the columns say. */}
        <p className="mt-1 text-[15px] text-ink/85 md:hidden">
          {product} · {o.state}
        </p>
        {active && o.tracking && (
          <p className="break-all text-[15px] text-ink/65 md:hidden">
            {o.carrier} · {o.tracking}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5 md:hidden">
          {active && status}
          {chips}
        </div>
      </td>
      <td className={cn(td, 'hidden max-w-[220px] text-ink/85 md:table-cell')}>
        <span className="line-clamp-2">{product}</span>
      </td>
      <td className={cn(td, 'hidden text-ink/85 md:table-cell')}>{o.state}</td>
      <td className={cn(td, 'hidden whitespace-nowrap text-ink/70 md:table-cell')}>
        {active ? (
          <>
            {status}
            {o.tracking && (
              <span className="mt-0.5 block text-[12px] text-ink/60">
                {o.carrier} · {o.tracking}
              </span>
            )}
          </>
        ) : (
          waiting
        )}
      </td>
      <td className={cn(td, 'hidden md:table-cell')}>
        {flags > 0 || review?.photosPending ? (
          <span className="flex flex-wrap gap-1">
            {flags > 0 && <ReviewChip>{flags}</ReviewChip>}
            {review?.photosPending && <ReviewChip>Photos</ReviewChip>}
          </span>
        ) : (
          <span className="text-ink/45">—</span>
        )}
      </td>
      <td className={cn(td, 'hidden md:table-cell')}>{thread ? <ThreadChip status={thread} /> : <span className="text-ink/45">—</span>}</td>
    </tr>
  );
}
