'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useOrders } from '@/components/orders/OrdersProvider';
import { STATUS_LABEL, type Order } from '@/lib/orders';
import { cn } from '@/lib/utils';

interface DoctorQueueListProps {
  doctorName: string;
}

export function DoctorQueueList({ doctorName }: DoctorQueueListProps) {
  const { orders, clinicalQueue, activeClinicalCases, recentClinicalCases } =
    useOrders();

  // One medical director handles every case — no per-physician routing.
  const queue = clinicalQueue();
  const active = activeClinicalCases();
  const recent = recentClinicalCases(4);

  // Cases handled (signed onward) — shown as a stat.
  const handled = orders.filter((o) =>
    [
      'signed',
      'declined-clinical',
      'compounding',
      'shipped',
      'delivered',
    ].includes(o.status)
  );

  return (
    <>
      <div className="grid gap-3 mb-8 sm:grid-cols-3">
        <Metric label="Awaiting my review" value={String(queue.length)} tone="blue" />
        <Metric label="Active cases" value={String(active.length)} tone="accent" />
        <Metric label="Handled total" value={String(handled.length)} tone="neutral" />
      </div>

      {/* === AWAITING REVIEW === */}
      <section className="mb-10">
        <SectionHeader
          eyebrow="AWAITING REVIEW"
          title="Sign or decline"
          count={queue.length}
        />
        {queue.length === 0 ? (
          <EmptySection
            title="Queue is clear"
            body="New cases appear here once an admin approves them."
          />
        ) : (
          <div className="space-y-3">
            {queue.map((o) => (
              <DoctorQueueRow key={o.id} order={o} doctorName={doctorName} />
            ))}
          </div>
        )}
      </section>

      {/* === ACTIVE CASES === */}
      <section className="mb-10">
        <SectionHeader
          eyebrow="ACTIVE CASES"
          title="Manage post-sign"
          count={active.length}
        />
        {active.length === 0 ? (
          <EmptySection
            title="Nothing to manage"
            body="Cases you've signed appear here so you can mark compounding, add tracking, and confirm delivery."
          />
        ) : (
          <div className="space-y-3">
            {active.map((o) => (
              <ActiveCaseRow key={o.id} order={o} doctorName={doctorName} />
            ))}
          </div>
        )}
      </section>

      {/* === RECENT === */}
      {recent.length > 0 && (
        <section>
          <SectionHeader
            eyebrow="RECENT"
            title="Closed cases"
            count={recent.length}
          />
          <div className="space-y-3">
            {recent.map((o) => (
              <RecentCaseRow key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <p className="text-[10px] tracking-widest text-foreground/55">
          {eyebrow}
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      <span className="text-[10px] tracking-widest text-foreground/55">
        {count} {count === 1 ? 'CASE' : 'CASES'}
      </span>
    </div>
  );
}

function EmptySection({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-8 text-center">
      <h3 className="mb-1 text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="text-xs text-foreground/55 leading-relaxed max-w-md mx-auto">
        {body}
      </p>
    </div>
  );
}

function DoctorQueueRow({
  order,
  doctorName,
}: {
  order: Order;
  doctorName: string;
}) {
  const { signRx, declineClinical } = useOrders();
  const [open, setOpen] = useState<null | 'decline'>(null);
  const [note, setNote] = useState('');

  return (
    <article className="rounded-3xl border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4 min-w-0 flex-1">
          {order.lines[0] && (
            <div
              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-line"
              style={{ background: order.lines[0].swatch }}
            >
              <Image
                src={order.lines[0].image}
                alt={order.lines[0].productName}
                fill
                sizes="64px"
                className="object-cover opacity-50"
              />
            </div>
          )}
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] tracking-widest text-foreground/55">
              <span className="font-semibold text-foreground/80">
                {order.id.toUpperCase()}
              </span>
              <span>·</span>
              <span>{order.state}</span>
            </div>
            <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
              {order.memberName}
            </h2>
            <p className="text-sm text-foreground/85 mt-0.5">
              {order.lines.map((l) => `${l.productName} (${l.cadenceLabel})`).join(' + ')}
            </p>

            {order.adminNote && (
              <div className="mt-3 rounded-xl border border-foreground/15 bg-background p-3">
                <div className="text-[10px] tracking-widest text-foreground/55 mb-1">
                  ADMIN NOTE
                </div>
                <p className="text-xs text-foreground/85 leading-relaxed">
                  {order.adminNote}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="md:text-right md:flex-shrink-0">
          <span className="inline-flex items-center rounded-full border border-sky-400/40 bg-sky-500/10 text-sky-300 px-2.5 py-1 text-[10px] tracking-widest font-semibold">
            AWAITING MY REVIEW
          </span>
        </div>
      </div>

      {open === null && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <button
            type="button"
            onClick={() => signRx(order.id, doctorName)}
            className="rounded-full bg-accent text-black font-semibold px-5 py-2 text-sm hover:bg-accent-soft transition-colors"
          >
            Sign Rx
          </button>
          <button
            type="button"
            onClick={() => setOpen('decline')}
            className="rounded-full border border-red-500/30 bg-red-500/5 text-red-300 font-medium px-5 py-2 text-sm hover:bg-red-500/10 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            className="rounded-full border border-line bg-background text-foreground/65 font-medium px-4 py-2 text-xs hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            Request more info
          </button>
        </div>
      )}

      {open === 'decline' && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 md:p-5">
          <div className="mb-3 text-[10px] tracking-widest text-red-300">
            REASON FOR CLINICAL DECLINE
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Note logged on the member's chart and visible to the care team…"
            className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!note.trim()) return;
                declineClinical(order.id, doctorName, note.trim());
                setOpen(null);
              }}
              disabled={!note.trim()}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                note.trim()
                  ? 'bg-red-500 text-foreground hover:bg-red-600'
                  : 'bg-foreground/15 text-foreground/40'
              )}
            >
              Confirm decline
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-full border border-line bg-surface text-foreground/85 px-4 py-2 text-xs tracking-wider hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'accent' | 'neutral';
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[10px] tracking-widest text-foreground/55 mb-1.5">
        {label.toUpperCase()}
      </div>
      <div
        className={cn(
          'text-2xl font-semibold tracking-tight tabular-nums',
          tone === 'blue' && 'text-sky-300',
          tone === 'accent' && 'text-accent',
          tone === 'neutral' && 'text-foreground'
        )}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// Active case row — post-sign progression
// ============================================================================

function ActiveCaseRow({
  order,
  doctorName,
}: {
  order: Order;
  doctorName: string;
}) {
  const { markCompounding, markShipped, markDelivered, addUpdate } =
    useOrders();
  const [open, setOpen] = useState<null | 'tracking' | 'note'>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [tracking, setTracking] = useState(order.tracking ?? '');
  const [carrier, setCarrier] = useState(order.carrier ?? 'FedEx');
  const [note, setNote] = useState('');

  return (
    <article className="rounded-3xl border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4 min-w-0 flex-1">
          {order.lines[0] && (
            <div
              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-line"
              style={{ background: order.lines[0].swatch }}
            >
              <Image
                src={order.lines[0].image}
                alt={order.lines[0].productName}
                fill
                sizes="64px"
                className="object-cover opacity-50"
              />
            </div>
          )}
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] tracking-widest text-foreground/55">
              <span className="font-semibold text-foreground/80">
                {order.id.toUpperCase()}
              </span>
              <span>·</span>
              <span>{order.state}</span>
            </div>
            <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
              {order.memberName}
            </h2>
            <p className="text-sm text-foreground/85 mt-0.5">
              {order.lines.map((l) => l.productName).join(' + ')}
            </p>
            {order.tracking && (
              <p className="mt-2 text-xs text-foreground/65 font-mono break-all">
                {order.carrier} · {order.tracking}
              </p>
            )}
          </div>
        </div>

        <div className="md:text-right md:flex-shrink-0">
          <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 text-accent px-2.5 py-1 text-[10px] tracking-widest font-semibold">
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {/* Action buttons — visible status-progression */}
      {open === null && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          {order.status === 'signed' && (
            <button
              type="button"
              onClick={() => markCompounding(order.id, doctorName)}
              className="rounded-full bg-accent text-black font-semibold px-5 py-2 text-sm hover:bg-accent-soft transition-colors"
            >
              Mark compounding
            </button>
          )}
          {(order.status === 'signed' || order.status === 'compounding') && (
            <button
              type="button"
              onClick={() => setOpen('tracking')}
              className="rounded-full bg-foreground text-background font-semibold px-5 py-2 text-sm hover:bg-accent hover:text-black transition-colors"
            >
              Add tracking &amp; ship
            </button>
          )}
          {order.status === 'shipped' && (
            <button
              type="button"
              onClick={() => markDelivered(order.id, doctorName)}
              className="rounded-full bg-accent text-black font-semibold px-5 py-2 text-sm hover:bg-accent-soft transition-colors"
            >
              Mark delivered
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen('note')}
            className="rounded-full border border-line bg-background text-foreground/85 font-medium px-4 py-2 text-xs hover:border-foreground/30 transition-colors"
          >
            Add update
          </button>
          <button
            type="button"
            onClick={() => setShowTimeline((v) => !v)}
            className="ml-auto text-[11px] tracking-widest text-foreground/55 hover:text-foreground transition-colors"
          >
            {showTimeline ? 'HIDE TIMELINE ↑' : 'TIMELINE ↓'}
          </button>
        </div>
      )}

      {/* Add tracking panel */}
      {open === 'tracking' && (
        <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-4 md:p-5">
          <div className="mb-3 text-[10px] tracking-widest text-accent">
            SHIPMENT DETAILS
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
                CARRIER
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground"
              >
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="USPS">USPS</option>
                <option value="DHL">DHL</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
                TRACKING NUMBER
              </label>
              <input
                type="text"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="1Z A99 7W2 03 8329 7104"
                className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
              MESSAGE TO MEMBER (OPTIONAL)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the member should know about this shipment…"
              className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!tracking.trim()) return;
                markShipped(
                  order.id,
                  doctorName,
                  tracking.trim(),
                  carrier,
                  note.trim() || undefined
                );
                setOpen(null);
                setNote('');
              }}
              disabled={!tracking.trim()}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                tracking.trim()
                  ? 'bg-accent text-black hover:bg-accent-soft'
                  : 'bg-foreground/15 text-foreground/40'
              )}
            >
              Save &amp; mark shipped
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                setNote('');
              }}
              className="rounded-full border border-line bg-surface text-foreground/85 px-4 py-2 text-xs tracking-wider hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add free-form note panel */}
      {open === 'note' && (
        <div className="mt-5 rounded-2xl border border-line bg-background p-4 md:p-5">
          <div className="mb-3 text-[10px] tracking-widest text-foreground/55">
            UPDATE FOR MEMBER + CARE TEAM
          </div>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Pharmacy delayed by a day — shipment moves to Friday."
            className="w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!note.trim()) return;
                addUpdate(order.id, doctorName, 'physician', note.trim());
                setOpen(null);
                setNote('');
              }}
              disabled={!note.trim()}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                note.trim()
                  ? 'bg-accent text-black hover:bg-accent-soft'
                  : 'bg-foreground/15 text-foreground/40'
              )}
            >
              Post update
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                setNote('');
              }}
              className="rounded-full border border-line bg-surface text-foreground/85 px-4 py-2 text-xs tracking-wider hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline (collapsible) */}
      {showTimeline && order.updates && order.updates.length > 0 && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="mb-3 text-[10px] tracking-widest text-foreground/55">
            CASE TIMELINE
          </div>
          <Timeline updates={order.updates} />
        </div>
      )}
    </article>
  );
}

function RecentCaseRow({ order }: { order: Order }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground truncate">
          {order.memberName}{' '}
          <span className="text-foreground/55 font-normal">· {order.state}</span>
        </div>
        <div className="text-xs text-foreground/55 mt-0.5">
          {order.lines.map((l) => l.productName).join(' + ')}
        </div>
      </div>
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] tracking-widest font-semibold flex-shrink-0',
          order.status === 'delivered'
            ? 'bg-foreground/5 text-foreground/65 border-line'
            : 'bg-red-500/10 text-red-300 border-red-500/40'
        )}
      >
        {STATUS_LABEL[order.status]}
      </span>
    </div>
  );
}

function Timeline({ updates }: { updates: Order['updates'] }) {
  if (!updates || updates.length === 0) return null;
  // Reverse so newest is at the top
  const ordered = [...updates].sort((a, b) => b.at - a.at);
  return (
    <ol className="space-y-3">
      {ordered.map((u) => (
        <li
          key={u.id}
          className="rounded-2xl border border-line bg-background p-3"
        >
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px] tracking-widest text-foreground/55">
            <span className="font-semibold text-foreground/85">
              {u.author.toUpperCase()} · {u.role.toUpperCase()}
            </span>
            <span>{relativeTime(u.at)}</span>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">
            {u.note}
          </p>
          {u.statusChange && (
            <p className="mt-1.5 text-[10px] tracking-widest text-accent">
              STATUS · {STATUS_LABEL[u.statusChange]}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

function relativeTime(at: number): string {
  const diff = Date.now() - at;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}
