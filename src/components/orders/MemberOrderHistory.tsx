import { cn } from '@/lib/utils';

export interface MemberOrderView {
  id: string;
  ref: string;
  status: string;
  placedAt: string;
  items: { label: string; detail: string }[];
  trackingCarrier: string | null;
  trackingNumber: string | null;
}

const STATUS: Record<string, { label: string; class: string }> = {
  draft: {
    label: 'PREPARING',
    class: 'border-line bg-surface text-foreground/55',
  },
  submitted: {
    label: 'WITH PHARMACY',
    class: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
  },
  accepted: {
    label: 'COMPOUNDING',
    class: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  },
  shipped: {
    label: 'SHIPPED',
    class: 'border-accent/40 bg-accent/10 text-accent',
  },
  delivered: {
    label: 'DELIVERED',
    class: 'border-accent/40 bg-accent/10 text-accent',
  },
  canceled: {
    label: 'CANCELED',
    class: 'border-line bg-surface text-foreground/45',
  },
};

export function MemberOrderHistory({
  orders,
}: {
  orders: MemberOrderView[];
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-10 text-center">
        <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
          No orders yet
        </h2>
        <p className="text-sm text-foreground/65">
          Once your physician signs your protocol, your first order appears
          here with live shipment tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const status = STATUS[order.status] ?? STATUS.draft;
        return (
          <article
            key={order.id}
            className="rounded-3xl border border-line bg-surface p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-sm text-foreground/85">
                  {order.ref}
                </span>
                <span className="ml-3 text-xs text-foreground/55">
                  {order.placedAt}
                </span>
              </div>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-widest',
                  status.class,
                )}
              >
                {status.label}
              </span>
            </div>

            {order.items.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
                {order.items.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground">{it.label}</span>
                    {it.detail && (
                      <span className="text-foreground/55">{it.detail}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {order.trackingNumber && (
              <div className="mt-4 rounded-2xl border border-line bg-background px-4 py-3">
                <div className="text-[10px] tracking-widest text-foreground/50">
                  TRACKING
                </div>
                <p className="mt-0.5 font-mono text-sm text-foreground/90">
                  {order.trackingCarrier ? `${order.trackingCarrier} · ` : ''}
                  {order.trackingNumber}
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
