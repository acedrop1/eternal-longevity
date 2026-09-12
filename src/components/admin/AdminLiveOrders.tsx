'use client';

import { useOrders } from '@/components/orders/OrdersProvider';
import { STATUS_LABEL, type Order } from '@/lib/orders';
import { cn } from '@/lib/utils';

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
