'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  markDeliveredAction,
  pharmacyAcceptOrder,
  pharmacyAddTracking,
  type FulfillmentResult,
} from '@/lib/fulfillment-actions';
import type { BoardRow } from '@/lib/fulfillment-core';
import { SectionTitle, StatusChip, btnPrimary, btnSecondary, inset, panel, type Tone } from '@/components/portal/ui';
import { cn } from '@/lib/utils';

/**
 * The orders board admin and the prescriber share. Every paid order, first
 * cycle or refill, lands in "To place" until someone places it on the
 * pharmacy's platform and marks it here; then tracking, then delivery. Both
 * portals see the same rows, and whoever marks a step first owns it.
 */

const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL'];

const GROUPS: {
  key: string;
  statuses: BoardRow['status'][];
  title: string;
  note: string;
  /** Flag a row once it has waited this many days. */
  lateAfter: number;
}[] = [
  {
    key: 'place',
    statuses: ['draft', 'submitted'],
    title: 'To place in Formula',
    note: 'Paid and approved. Place each one in the Formula Health portal, then mark it placed.',
    lateAfter: 1,
  },
  {
    key: 'track',
    statuses: ['accepted'],
    title: 'Placed · waiting for tracking',
    note: 'Add the tracking number when Formula ships it. The patient is emailed automatically.',
    lateAfter: 3,
  },
  {
    key: 'transit',
    statuses: ['shipped'],
    title: 'Shipped · in transit',
    note: 'Mark delivered once the carrier shows it arrived. The patient is emailed.',
    lateAfter: 7,
  },
  {
    key: 'done',
    statuses: ['delivered'],
    title: 'Delivered · last 14 days',
    note: '',
    lateAfter: Infinity,
  },
];

export function FulfillmentBoard({ rows }: { rows: BoardRow[] }) {
  return (
    <div className="space-y-10">
      {GROUPS.map((g) => {
        const list = rows.filter((r) => g.statuses.includes(r.status));
        if (g.key === 'done' && list.length === 0) return null;
        return (
          <section key={g.key}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <SectionTitle>
                {g.title} <span className="font-mono text-[13px] text-black/50">{list.length}</span>
              </SectionTitle>
              {g.note && <p className="text-[14px] text-black/60">{g.note}</p>}
            </div>
            {list.length === 0 ? (
              <p className={cn(panel, 'px-5 py-6 text-[14px] text-black/60')}>Nothing here.</p>
            ) : (
              <ul className="space-y-3">
                {list.map((r) => (
                  <BoardCard key={r.id} row={r} late={r.ageDays >= g.lateAfter} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

const STATUS: Record<BoardRow['status'], [string, Tone]> = {
  draft: ['To place', 'warn'],
  submitted: ['To place', 'warn'],
  accepted: ['Placed', 'info'],
  shipped: ['Shipped', 'gold'],
  delivered: ['Delivered', 'success'],
  canceled: ['Canceled', 'muted'],
};

function BoardCard({ row, late }: { row: BoardRow; late: boolean }) {
  const [label, tone] = STATUS[row.status];
  const refill = row.cycleLabel?.startsWith('Refill');
  const details: [string, string][] = [
    ['Patient', row.patientName],
    ['Date of birth', row.patientDob ?? '—'],
    ['Phone', row.phone ?? '—'],
    ['Ship to', row.address || '—'],
    ['Items', row.items.join('; ') || '—'],
    ['Plan', row.cycleLabel ?? '—'],
    ['Prescriber', row.prescriber ? `${row.prescriber}${row.npi ? ` · NPI ${row.npi}` : ''}` : '—'],
  ];

  return (
    <li className={cn(panel, 'p-4 md:p-5')}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-medium text-black">{row.patientName}</span>
            <StatusChip tone={tone}>{label}</StatusChip>
            <StatusChip tone={refill ? 'gold' : 'neutral'}>{refill ? 'Refill' : 'New order'}</StatusChip>
            {late && <StatusChip tone="error">Waiting {row.ageDays} days</StatusChip>}
          </div>
          <p className="mt-1.5 text-[15px] text-black/80">{row.items.join(' · ') || 'Care program'}</p>
          <p className="mt-1 font-mono text-[12px] text-black/55">
            {row.orderRef} · {row.address.split(' · ').slice(-2).join(' · ')}
          </p>
          {row.notes && <p className="mt-1 font-mono text-[12px] text-black/55">{row.notes}</p>}
          {row.trackingNumber && (
            <p className="mt-1 font-mono text-[12px] text-black/70">
              {row.trackingCarrier} {row.trackingNumber}
            </p>
          )}

          <details className="mt-3 group">
            <summary className="cursor-pointer select-none font-mono text-[13px] text-black/70 hover:text-black">
              Details for Formula
            </summary>
            <dl className={cn(inset, 'mt-2 divide-y divide-black/10 text-[14px]')}>
              {details.map(([k, v]) => (
                <div key={k} className="flex gap-4 px-3 py-2">
                  <dt className="w-28 flex-none font-mono text-[12px] text-black/55">{k}</dt>
                  <dd className="min-w-0 break-words text-black">{v}</dd>
                </div>
              ))}
            </dl>
            <CopyButton text={details.map(([k, v]) => `${k}: ${v}`).join('\n')} />
          </details>
        </div>

        <div className="w-full flex-none md:w-[320px]">
          <Actions row={row} />
        </div>
      </div>
    </li>
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
      className="mt-2 font-mono text-[12px] text-black/60 underline underline-offset-2 hover:text-black"
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
    'w-full rounded-[2px] bg-white px-3 py-2.5 text-[15px] text-black ring-1 ring-black/15 placeholder:text-black/35 focus:outline-none focus:ring-2 focus:ring-black';

  return (
    <div className="space-y-2">
      {(row.status === 'submitted' || row.status === 'draft') && (
        <>
          <label className="block font-mono text-[12px] text-black/60" htmlFor={`ref-${row.id}`}>
            Formula order number (optional)
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
            {pending ? 'Saving…' : 'Mark placed in Formula'}
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
