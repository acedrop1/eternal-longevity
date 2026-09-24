'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useOrders } from '@/components/orders/OrdersProvider';
import { STATUS_LABEL, type Order } from '@/lib/orders';
import { cn } from '@/lib/utils';
import { orderRef } from '@/lib/format';

export function AdminLiveOrders() {
  const { orders } = useOrders();
  return <LiveBoard orders={orders} />;
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
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="font-mono text-[12px] text-foreground/60">
            In flight
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Every live order
          </h2>
        </div>
        <span
          className={cn(
            'font-mono text-[12px]',
            needing ? 'text-accent' : 'text-foreground/60',
          )}
        >
          {live.length} open
          {needing > 0 && ` · ${needing} need attention`}
        </span>
      </div>

      {live.length === 0 ? (
        <div className="rounded-[4px] border border-line bg-surface p-8 text-center">
          <p className="text-sm text-foreground/55">
            Nothing in flight. Orders appear here from checkout until they are
            delivered.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[4px] border border-line bg-surface">
          {rows.map(({ order, attention }) => (
            <OrderRow key={order.id} order={order} attention={attention} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * One order, and the way to stop it.
 *
 * Cancelling refunds whatever was charged and emails the member, so it asks
 * for a reason first — the member reads that sentence, and "cancelled" with no
 * explanation is the thing that generates the phone call.
 */
function OrderRow({
  order,
  attention,
}: {
  order: Order;
  attention: string | null;
}) {
  const { denyAdmin } = useOrders();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancellable = !['shipped', 'delivered'].includes(order.status);

  return (
    <div className="border-b border-line px-4 py-3.5 last:border-0 md:px-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-[12px] text-foreground/60">
          {orderRef(order.id)}
        </span>
        {order.userId ? (
          <Link
            href={`/portal/admin/members/${order.userId}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {order.memberName}
          </Link>
        ) : (
          <span className="font-medium text-foreground">
            {order.memberName}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-foreground/60">
          {order.lines.map((l) => l.productName).join(' + ')}
        </span>
        <span className="tabular-nums text-sm text-foreground/85">
          ${order.total}
        </span>
        <span className="font-mono text-[12px] text-foreground/60">
          {describeAge(order.placedAt)}
        </span>
        <span
          className={cn(
            'inline-flex flex-none items-center gap-1.5 rounded-[2px] border px-2.5 py-0.5 font-mono text-[12px]',
            order.status === 'assigned'
              ? 'border-sky-400/40 bg-sky-500/10 text-sky-300'
              : order.status === 'shipped'
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line bg-background text-foreground/60',
          )}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>
      {attention && (
        <p className="mt-2 rounded-[4px] border border-accent/40 bg-accent/5 px-3 py-2 text-xs leading-relaxed text-accent">
          {attention}
        </p>
      )}

      {cancellable && !open && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="mt-2 font-mono text-[12px] text-foreground/60 transition-colors hover:text-red-300"
        >
          Cancel order
        </button>
      )}

      {open && (
        <div className="mt-3 rounded-[4px] border border-red-500/30 bg-red-500/5 p-4">
          <div className="mb-2 font-mono text-[12px] text-red-300">
            Why are you cancelling?
          </div>
          <p className="mb-3 text-xs leading-relaxed text-foreground/55">
            The member is emailed this sentence and anything charged is refunded
            in full. It is not recorded as a clinical decision.
          </p>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            rows={3}
            placeholder="The pharmacy cannot ship to the address on this order. Please add a street address and place it again."
            className="w-full resize-none rounded-[2px] border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          {error && (
            <p className="mt-3 rounded-[4px] border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!reason.trim() || busy}
              onClick={async () => {
                if (!reason.trim() || busy) return;
                setBusy(true);
                setError(null);
                try {
                  const res = await denyAdmin(order.id, reason.trim());
                  if (res.ok) {
                    setOpen(false);
                    setReason('');
                  } else {
                    setError(
                      'Could not cancel this order. Nothing was refunded or sent.',
                    );
                  }
                } finally {
                  setBusy(false);
                }
              }}
              className={cn(
                'rounded-full px-5 py-2 font-mono text-[13px] transition-colors',
                reason.trim() && !busy
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-foreground/10 text-foreground/55',
              )}
            >
              {busy ? 'Cancelling…' : 'Cancel and refund'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setReason('');
                setError(null);
              }}
              className="rounded-full border border-line bg-surface px-4 py-2 font-mono text-[12px] text-foreground/85 transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-60"
            >
              Keep it
            </button>
          </div>
        </div>
      )}
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
