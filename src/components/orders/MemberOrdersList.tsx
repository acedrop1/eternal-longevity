'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useOrders } from './OrdersProvider';
import {
  getPhysicianName,
  STATUS_LABEL,
  type Order,
  type OrderStatus,
} from '@/lib/orders';
import { cn } from '@/lib/utils';

const STATUS_THEME: Record<OrderStatus, string> = {
  'pending-admin': 'bg-foreground/5 text-foreground/85 border-line',
  'denied-admin': 'bg-red-500/10 text-red-300 border-red-500/40',
  assigned: 'bg-accent/10 text-accent border-accent/40',
  signed: 'bg-accent/10 text-accent border-accent/40',
  'declined-clinical': 'bg-red-500/10 text-red-300 border-red-500/40',
  compounding: 'bg-sky-500/10 text-sky-300 border-sky-400/40',
  shipped: 'bg-accent/10 text-accent border-accent/40',
  delivered: 'bg-foreground/5 text-foreground/65 border-line',
};

interface MemberOrdersListProps {
  memberEmail: string;
}

export function MemberOrdersList({ memberEmail }: MemberOrdersListProps) {
  const { ordersByMember } = useOrders();
  const orders = ordersByMember(memberEmail);

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-10 text-center">
        <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
          No orders yet
        </h2>
        <p className="mb-6 text-sm text-foreground/65">
          Once your first cycle ships, your full history lives here.
        </p>
        <Link
          href="/portal/shop"
          className="inline-flex rounded-full bg-accent text-black font-semibold px-5 py-2.5 text-sm hover:bg-accent-soft transition-colors"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

  return (
    <article className="rounded-3xl border border-line bg-surface p-5 md:p-7">
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
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] tracking-widest text-foreground/55">
              <span className="font-semibold text-foreground/80">
                {order.id.toUpperCase()}
              </span>
              <span>·</span>
              <span>PLACED {placed.toUpperCase()}</span>
            </div>
            <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
              {order.lines.map((l) => l.productName).join(' + ')}
            </h2>
            {physician && (
              <p className="mt-0.5 text-xs text-foreground/55">
                Quality review
              </p>
            )}
            {order.adminNote && order.status === 'denied-admin' && (
              <p className="mt-2 text-xs text-red-300 leading-relaxed max-w-md">
                {order.adminNote}
              </p>
            )}
          </div>
        </div>
        <div className="text-right md:flex-shrink-0">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] tracking-widest font-semibold',
              STATUS_THEME[order.status]
            )}
          >
            {STATUS_LABEL[order.status]}
          </span>
          <div className="mt-2 text-sm md:text-base font-semibold text-foreground tabular-nums">
            ${order.total}
          </div>
        </div>
      </div>

      {order.tracking && (
        <div className="mt-5 rounded-2xl border border-line bg-background p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] tracking-widest text-foreground/55">
              {order.carrier?.toUpperCase()} · TRACKING
            </div>
            <div className="text-sm font-mono text-foreground/85 truncate mt-0.5">
              {order.tracking}
            </div>
          </div>
          <Link
            href={`https://fedex.com/fedextrack/?trknbr=${encodeURIComponent(
              order.tracking.replace(/\s/g, '')
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-line bg-surface px-4 py-2 text-xs tracking-wider text-foreground/85 hover:text-foreground hover:border-foreground/30 transition-colors text-center flex-shrink-0"
          >
            TRACK PACKAGE →
          </Link>
        </div>
      )}

      {/* Recent updates (latest 2) */}
      {order.updates && order.updates.length > 0 && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="mb-3 text-[10px] tracking-widest text-foreground/55">
            RECENT UPDATES
          </div>
          <ol className="space-y-2">
            {[...order.updates]
              .sort((a, b) => b.at - a.at)
              .slice(0, 2)
              .map((u) => (
                <li
                  key={u.id}
                  className="rounded-2xl border border-line bg-background p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] tracking-widest text-foreground/55">
                    <span className="font-semibold text-foreground/80">
                      {u.author.toUpperCase()}
                    </span>
                    <span>{relativeTime(u.at)}</span>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed">
                    {u.note}
                  </p>
                </li>
              ))}
          </ol>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <Link
          href="/portal/shop"
          className="rounded-full border border-line bg-background text-foreground/85 font-medium px-4 py-2 text-xs hover:border-foreground/30 transition-colors"
        >
          Reorder
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-line bg-background text-foreground/65 font-medium px-4 py-2 text-xs hover:text-foreground hover:border-foreground/30 transition-colors"
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
