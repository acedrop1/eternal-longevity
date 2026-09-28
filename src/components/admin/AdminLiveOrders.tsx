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
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/10 pb-3">
        <div>
          <p className="text-[13px] font-medium text-ink/55">
            In flight
          </p>
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
            Every live order
          </h2>
        </div>
        <span
          className={cn(
            'text-[13px]',
            needing ? 'font-medium text-amber-800' : 'text-ink/60',
          )}
        >
          {live.length} open
          {needing > 0 && ` · ${needing} need attention`}
        </span>
      </div>

      {live.length === 0 ? (
        <div className="rounded-shell bg-milk p-8 text-center">
          <p className="text-sm text-ink/55">
            Nothing in flight. Orders appear here from checkout until they are
            delivered.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-shell bg-milk">
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
    <div className="border-b border-ink/10 px-4 py-3.5 last:border-0 md:px-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-[12px] text-ink/60">
          {orderRef(order.id)}
        </span>
        {order.userId ? (
          <Link
            href={`/portal/admin/members/${order.userId}`}
            className="font-medium text-ink underline-offset-4 hover:underline"
          >
            {order.memberName}
          </Link>
        ) : (
          <span className="font-medium text-ink">
            {order.memberName}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-ink/60">
          {order.lines.map((l) => l.productName).join(' + ')}
        </span>
        <span className="tabular-nums text-sm text-ink/85">
          ${order.total}
        </span>
        <span className="text-[12px] text-ink/60">
          {describeAge(order.placedAt)}
        </span>
        <span
          className={cn(
            'inline-flex flex-none items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px]',
            order.status === 'assigned'
              ? 'border-sky-600/25 bg-sky-50 text-sky-800'
              : order.status === 'shipped'
                ? 'border-emerald-600/20 bg-emerald-50 text-emerald-800'
                : 'border-ink/10 bg-white text-ink/60',
          )}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>
      {attention && (
        <p className="mt-2 rounded-inner border border-amber-600/25 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
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
          className="mt-2 text-[12px] text-ink/60 transition-colors hover:text-red-700"
        >
          Cancel order
        </button>
      )}

      {open && (
        <div className="mt-3 rounded-inner border border-red-600/20 bg-red-50 p-4">
          <div className="mb-2 text-[13px] font-medium text-red-700">
            Why are you cancelling?
          </div>
          <p className="mb-3 text-xs leading-relaxed text-ink/55">
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
            className="w-full resize-none rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/40 focus:outline-none focus:ring-red-500/40"
          />
          {error && (
            <p className="mt-3 rounded-inner border border-red-600/20 bg-red-50 px-4 py-2.5 text-sm text-red-700">
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
                'rounded-full px-5 py-2 text-[13px] font-semibold transition-colors',
                reason.trim() && !busy
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-ink/10 text-ink/55',
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
              className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25 disabled:opacity-60"
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
