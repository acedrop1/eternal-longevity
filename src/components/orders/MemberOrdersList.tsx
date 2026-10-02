'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useOrders } from './OrdersProvider';
import {
  getPhysicianName,
  isFailedRefill,
  memberNote,
  statusLabel,
  trackingUrl,
  type Order,
  type OrderStatus,
} from '@/lib/orders';
import {
  EmptyState,
  StatusChip,
  btnPrimary,
  btnSecondary,
  inset,
  panel,
  sentenceCase,
  type Tone,
} from '@/components/portal/ui';
import { orderRef } from '@/lib/format';

// Same semantic colours as before, as dot + label chips.
const STATUS_TONE: Record<OrderStatus, Tone> = {
  pending: 'neutral',
  'pending-admin': 'neutral',
  'denied-admin': 'error',
  assigned: 'gold',
  // Waiting on the member: the one state they have to act on.
  signed: 'warn',
  paid: 'info',
  'declined-clinical': 'error',
  compounding: 'info',
  shipped: 'gold',
  delivered: 'muted',
  canceled: 'muted',
  refunded: 'muted',
};

/** Ended without shipping on a decision: nothing to reorder from here. */
const NO_REORDER: string[] = ['denied-admin', 'declined-clinical'];

interface MemberOrdersListProps {
  memberEmail: string;
}

export function MemberOrdersList({ memberEmail }: MemberOrdersListProps) {
  const { ordersByMember } = useOrders();
  const orders = ordersByMember(memberEmail);

  if (orders.length === 0) {
    return (
      <EmptyState
        action={
          <Link href="/shop" className={btnPrimary}>
            Browse the shop
          </Link>
        }
      >
        No orders yet. Once your first cycle ships, your full history lives
        here.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <MemberOrderCard key={o.id} order={o} />
      ))}
    </div>
  );
}

function MemberOrderCard({ order }: { order: Order }) {
  const placed = new Date(order.placedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const physician = getPhysicianName(order.assignedToPhysicianId);
  const owed = order.status === 'signed';
  const refill = isFailedRefill(order);
  const productId = order.lines[0]?.productId;

  return (
    <article className={`${panel} p-5 md:p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4 min-w-0 flex-1">
          {order.lines[0] && (
            <div
              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-inner bg-milk"
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
            <div className="mb-1 flex flex-wrap items-center gap-x-2 text-[13px] font-medium tabular-nums text-ink/55">
              <span className="text-ink">{orderRef(order.id)}</span>
              <span aria-hidden>·</span>
              <span>Placed {placed}</span>
            </div>
            <h2
              className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]"
            >
              {order.lines.map((l) => l.productName).join(' + ')}
            </h2>
            {physician && (
              <p className="mt-1 text-[14px] text-ink/60">
                Quality review
              </p>
            )}
            {order.adminNote && order.status === 'denied-admin' && (
              <p className="mt-2 max-w-md text-[14px] leading-relaxed text-red-800">
                {order.adminNote}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:block sm:flex-shrink-0 sm:text-right">
          <StatusChip tone={STATUS_TONE[order.status] ?? 'neutral'}>
            {sentenceCase(statusLabel(order.status))}
          </StatusChip>
          <div className="text-[17px] font-medium text-ink tabular-nums sm:mt-2">
            ${order.total}
          </div>
        </div>
      </div>

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
            <div className="font-medium text-[12px] text-ink/55">
              {order.carrier ? `${order.carrier} · ` : ''}Tracking
            </div>
            <div className="mt-0.5 truncate font-medium text-[14px] text-ink">
              {order.tracking}
            </div>
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

      {/* Recent updates (latest 2) */}
      {order.updates && order.updates.length > 0 && (
        <div className="mt-5 border-t border-ink/10 pt-5">
          <h3 className="mb-3 text-[13px] font-medium text-ink/60">
            Recent updates
          </h3>
          <ol className="space-y-2">
            {[...order.updates]
              .sort((a, b) => b.at - a.at)
              .slice(0, 2)
              .map((u) => (
                <li
                  key={u.id}
                  className={`${inset} p-3`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 font-medium text-[12px] text-ink/55">
                    <span className="text-ink/80">{u.author}</span>
                    <span className="tabular-nums">{relativeTime(u.at)}</span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-ink/85">
                    {memberNote(u.note)}
                  </p>
                </li>
              ))}
          </ol>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-5">
        {productId && !NO_REORDER.includes(order.status) && (
          <Link
            href={`/shop/${encodeURIComponent(productId)}`}
            className={btnSecondary}
          >
            Reorder
          </Link>
        )}
        <Link
          href="/portal/messages?thread=support"
          className={btnSecondary}
        >
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
