'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useOrders } from '@/components/orders/OrdersProvider';
import { STATUS_LABEL, type Order } from '@/lib/orders';
import { cn } from '@/lib/utils';

export function AdminQueueList() {
  const { pendingAdminOrders, orders } = useOrders();
  const pending = pendingAdminOrders();
  const inMotion = orders.filter((o) =>
    ['assigned', 'signed', 'compounding', 'shipped'].includes(o.status)
  );

  return (
    <>
      {/* These count orders, not intakes. They used to sit directly beneath the
          intake cards with no heading, reading as though they described them —
          and a fourth tile reported an average turnaround that nothing measured. */}
      <div className="mb-4 mt-12 border-b border-line pb-3">
        <p className="text-[11px] tracking-widest text-foreground/50">
          SHOP ORDERS
        </p>
      </div>
      <div className="grid gap-3 mb-8 sm:grid-cols-3">
        <MetricCard label="Awaiting admin" value={String(pending.length)} tone="amber" />
        <MetricCard
          label="In motion"
          value={String(inMotion.length)}
          tone="accent"
        />
        <MetricCard
          label="Total open"
          value={String(pending.length + inMotion.length)}
          tone="neutral"
        />
      </div>

      {pending.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center">
          <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
            Queue is clear
          </h2>
          <p className="text-sm text-foreground/65">
            No orders are awaiting admin review right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((o) => (
            <AdminQueueRow key={o.id} order={o} />
          ))}
        </div>
      )}

      <LiveBoard orders={orders} />
    </>
  );
}

/** Anything about an order that someone non-clinical has to deal with. */
function attentionFor(order: Order): string | null {
  const notes = (order.updates ?? []).map((u) => `${u.note} ${u.author}`);
  if (notes.some((n) => /charge failed/i.test(n))) {
    return 'Charge failed — member sent a pay link';
  }
  if (notes.some((n) => /missing NPI/i.test(n))) {
    return 'Held before the pharmacy — prescriber has no NPI';
  }
  if (order.adminNote) return order.adminNote;
  if (
    order.status === 'assigned' &&
    Date.now() - order.placedAt > 24 * 60 * 60 * 1000
  ) {
    return 'Waiting on the prescriber for over a day';
  }
  return null;
}

/**
 * Every order still in motion, and what is wrong with any of them.
 *
 * The admin screen only ever listed orders waiting on admin — a queue that is
 * empty by design now that orders go straight to the prescriber. Meanwhile a
 * failed charge, an order held for a missing NPI, or one the prescriber had not
 * touched in two days showed up nowhere at all.
 */
function LiveBoard({ orders }: { orders: Order[] }) {
  const live = orders
    .filter((o) =>
      ['assigned', 'signed', 'paid', 'compounding', 'shipped'].includes(
        o.status,
      ),
    )
    .sort((a, b) => b.placedAt - a.placedAt);

  const rows = live.map((o) => ({ order: o, attention: attentionFor(o) }));
  const needing = rows.filter((r) => r.attention).length;

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="text-[11px] tracking-widest text-foreground/50">
            IN FLIGHT
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Every live order
          </h2>
        </div>
        <span
          className={cn(
            'text-[11px] tracking-widest',
            needing ? 'text-accent' : 'text-foreground/45',
          )}
        >
          {live.length} OPEN
          {needing > 0 && ` · ${needing} NEED ATTENTION`}
        </span>
      </div>

      {live.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-foreground/55">
            Nothing in flight. Orders appear here from checkout until they are
            delivered.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          {rows.map(({ order, attention }) => (
            <div
              key={order.id}
              className="border-b border-line px-4 py-3.5 last:border-0 md:px-5"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-mono text-[11px] tracking-wider text-foreground/50">
                  {order.id.toUpperCase()}
                </span>
                <span className="font-medium text-foreground">
                  {order.memberName}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground/60">
                  {order.lines.map((l) => l.productName).join(' + ')}
                </span>
                <span className="tabular-nums text-sm text-foreground/85">
                  ${order.total}
                </span>
                <span className="text-[10px] tracking-widest text-foreground/40">
                  {describeAge(order.placedAt)}
                </span>
                <span
                  className={cn(
                    'flex-none rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-widest',
                    order.status === 'assigned'
                      ? 'border-sky-400/40 bg-sky-500/10 text-sky-300'
                      : order.status === 'shipped'
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-line bg-background text-foreground/60',
                  )}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              {attention && (
                <p className="mt-2 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs leading-relaxed text-accent">
                  {attention}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminQueueRow({ order }: { order: Order }) {
  const { approve, denyAdmin } = useOrders();
  const [open, setOpen] = useState<null | 'approve' | 'deny'>(null);
  const [note, setNote] = useState('');

  const age = describeAge(order.placedAt);

  return (
    <article className="rounded-3xl border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        {/* Left */}
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
              <span>{age}</span>
            </div>
            <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
              {order.memberName}{' '}
              <span className="text-foreground/55 font-normal">· {order.state}</span>
            </h2>
            <p className="text-sm text-foreground/65 mt-0.5">
              {order.lines.map((l) => `${l.productName} (${l.cadenceLabel})`).join(' + ')}
            </p>
            <p className="text-xs text-foreground/45 mt-1">
              ${order.total} · {order.shippingAddress.line1}, {order.shippingAddress.city},{' '}
              {order.shippingAddress.state} {order.shippingAddress.zip}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="md:text-right md:flex-shrink-0">
          <span className="inline-flex items-center rounded-full border border-foreground/20 bg-foreground/5 text-foreground/85 px-2.5 py-1 text-[10px] tracking-widest font-semibold">
            AWAITING ADMIN
          </span>
        </div>
      </div>

      {/* Actions */}
      {open === null && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <button
            type="button"
            onClick={() => setOpen('approve')}
            className="rounded-full bg-accent text-black font-semibold px-5 py-2 text-sm hover:bg-accent-soft transition-colors"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setOpen('deny')}
            className="rounded-full border border-red-500/30 bg-red-500/5 text-red-300 font-medium px-5 py-2 text-sm hover:bg-red-500/10 transition-colors"
          >
            Deny
          </button>
          <span className="ml-auto text-[11px] text-foreground/45">
            Tap a button to act
          </span>
        </div>
      )}

      {/* Approve panel */}
      {open === 'approve' && (
        <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-4 md:p-5">
          <div className="mb-3 text-[10px] tracking-widest text-accent">
            NOTE FOR THE PHYSICIAN (OPTIONAL)
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything the physician should know before sign-off…"
            className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                approve(order.id, note.trim() || undefined);
                setOpen(null);
              }}
              className="rounded-full bg-accent text-black font-semibold px-5 py-2 text-sm hover:bg-accent-soft transition-colors"
            >
              Confirm approval
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

      {/* Deny panel */}
      {open === 'deny' && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 md:p-5">
          <div className="mb-3 text-[10px] tracking-widest text-red-300">
            REASON FOR DENIAL
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="The member will see this reason. Be clear and respectful…"
            className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!note.trim()) return;
                denyAdmin(order.id, note.trim());
                setOpen(null);
              }}
              disabled={!note.trim()}
              className="rounded-full bg-red-500 text-foreground font-semibold px-5 py-2 text-sm hover:bg-red-600 transition-colors disabled:bg-foreground/15 disabled:text-foreground/40"
            >
              Confirm denial
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

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'accent' | 'amber' | 'neutral';
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[10px] tracking-widest text-foreground/55 mb-1.5">
        {label.toUpperCase()}
      </div>
      <div
        className={cn(
          'text-2xl font-semibold tracking-tight tabular-nums',
          tone === 'accent' && 'text-accent',
          tone === 'amber' && 'text-amber-300',
          tone === 'neutral' && 'text-foreground'
        )}
      >
        {value}
      </div>
    </div>
  );
}

function describeAge(placedAt: number): string {
  const diff = Date.now() - placedAt;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}
