'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useOrders } from './OrdersProvider';
import { useCatalog } from '@/components/catalog/CatalogProvider';
import {
  isFailedRefill,
  memberNote,
  memberStatusLabel,
  STATUS_TONE,
  trackingUrl,
  type Order,
} from '@/lib/orders';
import { EmptyState, StatusChip, btnPrimary, btnSecondary, inset, panel } from '@/components/portal/ui';
import { orderRef } from '@/lib/format';
import { ORDER_STEPS, orderProgress } from '@/lib/member-view';
import { cn } from '@/lib/utils';

/** Finished orders: the ones it makes sense to order again. In-flight ones are still coming. */
const REORDERABLE: string[] = ['delivered', 'canceled', 'refunded'];

interface MemberOrdersListProps {
  memberEmail: string;
  /** Products on an active or paused plan: "Manage plan" instead of "Reorder". */
  planProductIds?: string[];
  /** Dev-only sample orders (lib/dev-member-samples), used in place of the provider's. */
  sampleOrders?: Order[];
}

export function MemberOrdersList({ memberEmail, planProductIds = [], sampleOrders }: MemberOrdersListProps) {
  const { ordersByMember } = useOrders();
  const orders = sampleOrders ?? ordersByMember(memberEmail);

  if (orders.length === 0) {
    return (
      <EmptyState
        action={
          <Link href="/shop" className={btnPrimary}>
            Browse the shop
          </Link>
        }
      >
        No orders yet. Once your first cycle ships, your full history lives here.
      </EmptyState>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      {orders.map((o, i) => (
        <MemberOrderCard key={o.id} first={i < 2} order={o} onPlan={o.lines.some((l) => planProductIds.includes(l.productId))} />
      ))}
    </div>
  );
}

/** Reviewed → Approved → Being prepared → Shipped → Delivered. */
function Stepper({ step, paymentNeeded }: { step: number; paymentNeeded: boolean }) {
  return (
    <ol className="mt-5 grid grid-cols-5" aria-label="Order progress">
      {ORDER_STEPS.map((label, i) => {
        // Delivered is the end: it reads as done, not as "in progress".
        const done = i < step || step === ORDER_STEPS.length - 1;
        const current = i === step && !done;
        return (
          <li
            key={label}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'relative flex flex-col items-center text-center',
              // The connector from the previous step, behind the dots.
              i > 0 &&
                'before:absolute before:right-1/2 before:top-[11px] before:h-0.5 before:w-full before:bg-ink/15',
              i > 0 && (done || current) && 'before:bg-ink',
            )}
          >
            <span
              className={cn(
                'relative z-10 grid h-6 w-6 place-items-center rounded-full',
                done && 'bg-ink text-white',
                current && (paymentNeeded ? 'bg-amber-400 ring-4 ring-amber-100' : 'bg-butter ring-4 ring-butter-soft'),
                !done && !current && 'bg-white ring-2 ring-ink/15',
              )}
            >
              {done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" aria-hidden>
                  <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {current && <span aria-hidden className="h-2 w-2 rounded-full bg-ink" />}
            </span>
            <span
              className={cn(
                'mt-2 px-0.5 text-[12px] leading-tight sm:text-[13px]',
                done || current ? 'font-semibold text-ink' : 'font-medium text-ink/60',
              )}
            >
              {label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function MemberOrderCard({ order, onPlan, first }: { order: Order; onPlan: boolean; first: boolean }) {
  const { products } = useCatalog();
  const placed = new Date(order.placedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const progress = orderProgress(order);
  const owed = order.status === 'signed' && !order.paidAt;
  const refill = isFailedRefill(order);
  const line = order.lines[0];
  const productId = line?.productId;
  const image = products.find((p) => p.id === productId)?.image ?? line?.image;
  const updates = [...(order.updates ?? [])].sort((a, b) => b.at - a.at);

  return (
    <article id={`order-${order.id}`} className={`${panel} scroll-mt-24 p-4 sm:p-6`}>
      <div className="flex gap-4">
        {image && (
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-inner bg-milk-deep sm:h-20 sm:w-20">
            <Image src={image} alt="" fill sizes="80px" priority={first} className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-[14px] font-medium tabular-nums text-ink/70">
            <span className="text-ink">{orderRef(order.id)}</span>
            <span aria-hidden>·</span>
            <span>{placed}</span>
          </div>
          <h2 className="mt-0.5 text-[20px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[24px]">
            {order.lines.map((l) => l.productName).join(' + ')}
          </h2>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <StatusChip tone={STATUS_TONE[order.status] ?? 'neutral'}>{memberStatusLabel(order)}</StatusChip>
            <span className="text-[16px] font-medium tabular-nums text-ink">${order.total}</span>
          </div>
        </div>
      </div>

      {progress.ended ? (
        <div className={`${inset} mt-5 p-4`}>
          <p className="text-[16px] font-semibold text-ink">{progress.title}</p>
          <p className="mt-0.5 text-[15px] leading-relaxed text-ink/80">{progress.body}</p>
          {order.adminNote && order.status === 'denied-admin' && (
            <p className="mt-2 text-[15px] leading-relaxed text-red-800">{order.adminNote}</p>
          )}
        </div>
      ) : (
        <Stepper step={progress.step} paymentNeeded={progress.paymentNeeded} />
      )}

      {/* Approved and unpaid: the one thing to do. A refill restarts from a
          fixed card rather than a pay link (see refills.ts). */}
      {owed && (
        <div className={`${inset} mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="text-[15px] leading-relaxed text-ink/85">
            {refill
              ? 'Your card didn’t go through for this refill. Update it and we’ll restart your plan.'
              : 'Dr. Elder approved this order. Complete payment and we’ll send it to the pharmacy.'}
          </p>
          <Link
            href={refill ? '/portal/account' : `/portal/orders/pay/${encodeURIComponent(order.id)}`}
            prefetch={false}
            className={`${btnPrimary} flex-shrink-0`}
          >
            {refill ? 'Update your card' : 'Complete payment'}
          </Link>
        </div>
      )}

      {order.tracking && (
        <div className={`${inset} mt-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="min-w-0">
            <div className="text-[14px] font-medium text-ink/70">{order.carrier ? `${order.carrier} · ` : ''}Tracking</div>
            <div className="mt-0.5 truncate text-[15px] font-medium tabular-nums text-ink">{order.tracking}</div>
          </div>
          <Link
            href={trackingUrl(order.carrier, order.tracking)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnSecondary} flex-shrink-0`}
          >
            Track package →
          </Link>
        </div>
      )}

      {updates.length > 0 && (
        <details className="group mt-4">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="underline decoration-ink/30 underline-offset-[3px] group-open:hidden">See all updates</span>
            <span className="hidden underline decoration-ink/30 underline-offset-[3px] group-open:inline">Hide updates</span>
            <span className="text-ink/60">({updates.length})</span>
          </summary>
          <ol className="mt-2 space-y-2">
            {updates.map((u) => (
              <li key={u.id} className={`${inset} p-3`}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[13px] font-medium text-ink/70">
                  <span className="text-ink/85">{u.author}</span>
                  <span className="tabular-nums">{relativeTime(u.at)}</span>
                </div>
                <p className="text-[15px] leading-relaxed text-ink/85">{memberNote(u.note)}</p>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-4">
        {onPlan ? (
          <Link href="/portal/subscriptions" className={btnSecondary}>
            Manage plan
          </Link>
        ) : (
          productId &&
          REORDERABLE.includes(order.status) && (
            <Link href={`/shop/${encodeURIComponent(productId)}`} className={btnSecondary}>
              Reorder
            </Link>
          )
        )}
        <Link href="/portal/messages?thread=support" className={btnSecondary}>
          Issue with this order?
        </Link>
      </div>
    </article>
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
