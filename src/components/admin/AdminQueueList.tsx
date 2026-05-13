'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useOrders } from '@/components/orders/OrdersProvider';
import {
  physiciansForState,
  PHYSICIANS,
  type Order,
} from '@/lib/orders';
import { cn } from '@/lib/utils';

export function AdminQueueList() {
  const { pendingAdminOrders, orders } = useOrders();
  const pending = pendingAdminOrders();
  const inMotion = orders.filter((o) =>
    ['assigned', 'signed', 'compounding', 'shipped'].includes(o.status)
  );

  return (
    <>
      <div className="grid gap-3 mb-8 sm:grid-cols-4">
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
        <MetricCard label="Avg admin TAT" value="12m" tone="neutral" />
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
    </>
  );
}

function AdminQueueRow({ order }: { order: Order }) {
  const { approveAndAssign, denyAdmin } = useOrders();
  const [open, setOpen] = useState<null | 'approve' | 'deny'>(null);
  const candidates =
    physiciansForState(order.state).length > 0
      ? physiciansForState(order.state)
      : PHYSICIANS;
  const [picked, setPicked] = useState<string>(candidates[0]?.id ?? '');
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
            Approve &amp; assign
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
            ASSIGN TO PHYSICIAN
          </div>
          <div className="grid gap-2 mb-4">
            {candidates.map((p) => {
              const isActive = picked === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPicked(p.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                    isActive
                      ? 'border-accent bg-background'
                      : 'border-line bg-background hover:border-foreground/30'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2',
                      isActive ? 'border-accent' : 'border-line'
                    )}
                  >
                    {isActive && (
                      <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="text-sm font-semibold text-foreground">
                      {p.name}
                    </span>
                    <span className="block text-xs text-foreground/55 mt-0.5">
                      Licensed in {p.states.join(', ')}
                      {!p.states.includes(order.state) && (
                        <span className="ml-1 text-amber-300">
                          · Order state not in panel
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mb-4">
            <label className="block text-[10px] tracking-widest text-foreground/55 mb-1.5">
              NOTE FOR PHYSICIAN (OPTIONAL)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Anything the physician should know before reviewing…"
              className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                approveAndAssign(order.id, picked, note || undefined);
                setOpen(null);
              }}
              disabled={!picked}
              className="rounded-full bg-accent text-black font-semibold px-5 py-2 text-sm hover:bg-accent-soft transition-colors disabled:bg-foreground/15 disabled:text-foreground/40"
            >
              Confirm &amp; route
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
