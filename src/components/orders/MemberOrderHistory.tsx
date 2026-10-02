import { EmptyState, SectionTitle, StatusChip, inset, panel, type Tone } from '@/components/portal/ui';

export interface MemberOrderView {
  id: string;
  ref: string;
  status: string;
  placedAt: string;
  items: { label: string; detail: string }[];
  trackingCarrier: string | null;
  trackingNumber: string | null;
}

// Same semantic colours as before (amber with the pharmacy, sky while
// compounding, gold once it ships), now as dot + label chips.
const STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Preparing', tone: 'neutral' },
  submitted: { label: 'Preparing', tone: 'warn' },
  accepted: { label: 'With pharmacy', tone: 'info' },
  shipped: { label: 'Shipped', tone: 'gold' },
  delivered: { label: 'Delivered', tone: 'gold' },
  canceled: { label: 'Canceled', tone: 'muted' },
};

export function MemberOrderHistory({
  orders,
}: {
  orders: MemberOrderView[];
}) {
  if (orders.length === 0) {
    return (
      <EmptyState>
        Once your protocol is confirmed, your first order appears here with
        live shipment tracking.
      </EmptyState>
    );
  }

  return (
    <section className="space-y-4">
      <SectionTitle>Pharmacy shipments</SectionTitle>
      <div className="space-y-3">
        {orders.map((order) => {
          const status = STATUS[order.status] ?? STATUS.draft;
          return (
            <article key={order.id} className={`${panel} p-5 md:p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-medium text-[14px] text-ink">
                    {order.ref}
                  </span>
                  <span className="text-[13px] font-medium tabular-nums text-ink/65">
                    {order.placedAt}
                  </span>
                </div>
                <StatusChip tone={status.tone}>{status.label}</StatusChip>
              </div>

              {order.items.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-ink/10 pt-4">
                  {order.items.map((it, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-4 text-[15px]"
                    >
                      <span className="text-ink">{it.label}</span>
                      {it.detail && (
                        <span className="text-right text-ink/60">{it.detail}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {order.trackingNumber && (
                <div className={`${inset} mt-4 px-4 py-3`}>
                  <div className="font-medium text-[12px] text-ink/65">
                    Tracking
                  </div>
                  <p className="mt-0.5 break-all font-medium text-[14px] text-ink">
                    {order.trackingCarrier ? `${order.trackingCarrier} · ` : ''}
                    {order.trackingNumber}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
