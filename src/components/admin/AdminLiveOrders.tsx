'use client';

import { useState } from 'react';
import { useOrders } from '@/components/orders/OrdersProvider';
import type { Order } from '@/lib/orders';
import { cn } from '@/lib/utils';

/**
 * Admin-only pieces of the Orders index (FulfillmentBoard renders them):
 * which orders are still in motion, what is wrong with any of them, and the
 * way to cancel one.
 *
 * The admin screen once only listed orders waiting on admin — a queue that is
 * empty by design now that orders go straight to the prescriber. Meanwhile a
 * failed charge, an order held for a missing NPI, or one the prescriber had not
 * touched in two days showed up nowhere at all.
 */

/** Order statuses that are still in motion. 'paid' is a legacy database value. */
export const LIVE_ORDER_STATUSES: string[] = ['assigned', 'signed', 'paid', 'compounding', 'shipped'];

/** Anything about an order that someone non-clinical has to deal with. */
export function attentionFor(order: Order): string | null {
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
 * One order, and the way to stop it.
 *
 * Cancelling refunds whatever was charged and emails the member, so it asks
 * for a reason first — the member reads that sentence, and "cancelled" with no
 * explanation is the thing that generates the phone call.
 */
export function CancelOrder({ order }: { order: Order }) {
  const { denyAdmin } = useOrders();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only orders still in motion, and never once the package has left.
  const cancellable =
    LIVE_ORDER_STATUSES.includes(order.status) && !['shipped', 'delivered'].includes(order.status);
  if (!cancellable) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="text-[13px] text-ink/60 underline decoration-ink/20 underline-offset-[3px] transition-colors hover:text-red-700 hover:decoration-red-700/40"
      >
        Cancel order
      </button>
    );
  }

  return (
    <div className="rounded-inner border border-red-600/20 bg-red-50 p-4">
      <div className="mb-2 text-[13px] font-medium text-red-700">
        Why are you cancelling?
      </div>
      <p className="mb-3 text-xs leading-relaxed text-ink/55">
        The member is emailed this sentence and anything charged is refunded
        in full. It is not recorded as a clinical decision.
      </p>
      <textarea
        aria-label="Reason for cancelling"
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
  );
}
