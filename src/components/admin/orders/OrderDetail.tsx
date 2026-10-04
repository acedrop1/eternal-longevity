'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  markDeliveredAction,
  pharmacyAcceptOrder,
  pharmacyAddTracking,
  retrySendToPharmacyAction,
  type FulfillmentResult,
} from '@/lib/fulfillment-actions';
import { addOrderNoteAction } from '@/lib/orders-db';
import type { BoardRow } from '@/lib/fulfillment-core';
import type { OrderExtras } from '@/lib/order-detail';
import type { Economics } from '@/lib/profit';
import { trackingUrl, type Order, type UpdateAuthorRole } from '@/lib/orders';
import { paymentState } from '@/lib/order-health';
import { formatDateTime, formatMoney } from '@/lib/format';
import { CancelOrder, LIVE_ORDER_STATUSES, attentionFor, cancellable } from '@/components/admin/AdminLiveOrders';
import { SectionCard, StatusBadge, headerButton, secondaryButton } from '@/components/admin/IndexTable';
import { inset } from '@/components/portal/ui';
import { useConfirm } from '@/components/ui/useConfirm';
import {
  CARRIERS,
  PAYMENT,
  STAGE,
  STAGE_INFO,
  canRetry,
  displayRef,
  fulfillmentBadge,
  pharmacyBadge,
  pharmacyDetails,
} from '@/components/fulfillment/order-status';
import { cn } from '@/lib/utils';

/**
 * The order page (Shopify's order detail): header with the next step, items
 * and money, fulfillment, timeline; customer, address, prescription,
 * pharmacy details and notes on the right. Every button calls the same
 * server action the Orders index row used to.
 */

const money = (dollars: number) => formatMoney(Math.round(dollars * 100));

const ROLE: Record<UpdateAuthorRole, string> = {
  admin: 'Admin',
  physician: 'Prescriber',
  pharmacy: 'Pharmacy',
  system: 'System',
};

const input =
  'w-full rounded-inner bg-white px-3 py-2.5 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30 md:text-[14px]';

export function OrderDetail({
  board: b,
  order: o,
  extras,
  admin,
  profit = null,
}: {
  board?: BoardRow;
  order?: Order;
  extras: OrderExtras | null;
  /** Cancel and the member record are admin's; the prescriber gets the rest. */
  admin: boolean;
  /** Admin only: the page computes it on the server and passes null for the prescriber. */
  profit?: Economics | null;
}) {
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();

  // The fulfillment steps, as the index row ran them.
  const [pending, start] = useTransition();
  const [result, setResult] = useState<FulfillmentResult | null>(null);
  const [pharmacyRef, setPharmacyRef] = useState('');
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [tracking, setTracking] = useState('');
  const run = (fn: () => Promise<FulfillmentResult>) =>
    start(async () => {
      setResult(null);
      try {
        const r = await fn();
        setResult(r);
        // Refresh on "already done" too, so the page shows where it really is.
        router.refresh();
      } catch {
        setResult({ ok: false, message: 'Request failed. Try again.' });
      }
    });

  const ref = displayRef(b?.orderNumber ?? b?.orderRef ?? o?.id ?? '');
  const status = fulfillmentBadge(b, o);
  const payState = o ? paymentState(o) : null;
  const payment = payState ? PAYMENT[payState] : null;
  const attention = o && LIVE_ORDER_STATUSES.includes(o.status) ? attentionFor(o) : null;
  const late = !!b && b.ageDays >= STAGE_INFO[STAGE[b.status]].lateAfter;
  const refill = !!b?.cycleLabel?.startsWith('Refill');
  const toPlace = b?.status === 'draft' || b?.status === 'submitted';
  const retry = !!b && canRetry(b);
  const cancel = admin && !!o && cancellable(o);
  const trackingNumber = b?.trackingNumber ?? o?.tracking ?? null;
  const trackingCarrier = b?.trackingCarrier ?? o?.carrier ?? null;

  const markDelivered = async () => {
    if (!b) return;
    const ok = await confirm({
      title: `Mark ${ref} delivered?`,
      body: 'The patient is emailed that it arrived.',
      confirmLabel: 'Mark delivered',
    });
    if (ok) run(() => markDeliveredAction(b.id));
  };
  const retrySend = async () => {
    if (!b) return;
    const ok = await confirm({
      title: `Send ${ref} to the pharmacy again?`,
      body: 'It goes through the pharmacy API once more. If it fails again, place it by hand.',
      confirmLabel: 'Retry send',
    });
    if (ok) run(() => retrySendToPharmacyAction(b.id));
  };

  // Cancel opens the index's own cancel form (reason, refund, follow-up) in a dialog.
  const [cancelling, setCancelling] = useState(false);
  const cancelDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (cancelling) cancelDialog.current?.showModal();
  }, [cancelling]);

  return (
    <div className="space-y-5">
      {confirmDialog}

      <header className="space-y-2">
        <Link
          href={admin ? '/portal/admin/fulfillment' : '/portal/doctor/fulfillment'}
          className="inline-flex min-h-[32px] items-center gap-1 text-[14px] font-medium text-ink/65 hover:text-ink"
        >
          <span aria-hidden>←</span> Orders
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink">{ref}</h1>
              {payment && <StatusBadge tone={payment[1]}>{payment[0]}</StatusBadge>}
              {status && <StatusBadge tone={status[1]}>{status[0]}</StatusBadge>}
              {b && <StatusBadge tone={refill ? 'attention' : 'neutral'}>{refill ? 'Refill' : 'New order'}</StatusBadge>}
              {late && b && <StatusBadge tone="critical">Waiting {b.ageDays} days</StatusBadge>}
            </div>
            <p className="mt-1 text-[14px] text-ink/65">
              Placed {formatDateTime(o?.placedAt ?? b?.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MoreActions>
              {(close) => (
                <>
                  <MenuItem
                    disabled={!retry || pending}
                    hint={retry ? undefined : 'Only for an order the pharmacy API did not take'}
                    onClick={() => {
                      close();
                      retrySend();
                    }}
                  >
                    Retry send to pharmacy
                  </MenuItem>
                  {admin && o && (
                    <MenuItem
                      danger
                      disabled={!cancel}
                      hint={cancel ? undefined : 'Not once it has shipped or closed'}
                      onClick={() => {
                        close();
                        setCancelling(true);
                      }}
                    >
                      Cancel order
                    </MenuItem>
                  )}
                </>
              )}
            </MoreActions>
            {toPlace && (
              <button type="submit" form="mark-placed" disabled={pending} className={cn(headerButton, 'disabled:opacity-40')}>
                {pending ? 'Saving…' : 'Mark placed'}
              </button>
            )}
            {b?.status === 'accepted' && (
              <button type="submit" form="add-tracking" disabled={pending} className={cn(headerButton, 'disabled:opacity-40')}>
                {pending ? 'Saving…' : 'Add tracking'}
              </button>
            )}
            {b?.status === 'shipped' && (
              <button type="button" onClick={markDelivered} disabled={pending} className={cn(headerButton, 'disabled:opacity-40')}>
                {pending ? 'Saving…' : 'Mark delivered'}
              </button>
            )}
          </div>
        </div>
      </header>

      {result && (
        <p
          role="status"
          className={cn(
            'rounded-inner border px-4 py-2.5 text-[14px]',
            result.ok ? 'border-emerald-600/20 bg-emerald-50 text-emerald-900' : 'border-red-600/20 bg-red-50 text-red-800',
          )}
        >
          {result.message}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-5">
          <SectionCard title="Items" flush>
            {o ? (
              <>
                <ul className="divide-y divide-ink/10">
                  {o.lines.map((l, i) => (
                    <li key={i} className="flex items-start justify-between gap-4 px-4 py-3 text-[14px]">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{l.productName}</p>
                        <p className="text-[13px] text-ink/65">
                          {l.cadenceLabel}
                          {b?.cycleLabel ? ` · ${b.cycleLabel}` : ''}
                        </p>
                      </div>
                      <div className="flex-none text-right tabular-nums">
                        <p className="text-ink/65">
                          {money(l.perCycle)} × {l.quantity}
                        </p>
                        <p className="font-medium text-ink">{money(l.perCycle * l.quantity)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <dl className="space-y-1.5 border-t border-ink/10 px-4 py-3 text-[14px] tabular-nums">
                  <MoneyRow label="Subtotal" value={money(o.subtotal)} />
                  <MoneyRow label="Shipping" value={o.shippingCost ? money(o.shippingCost) : 'Free'} />
                  {!!extras?.discount && (
                    <MoneyRow
                      label={`Discount${extras.promoCode ? ` · ${extras.promoCode}` : ''}`}
                      value={`−${money(extras.discount)}`}
                    />
                  )}
                  {!!o.tax && <MoneyRow label="Tax" value={money(o.tax)} />}
                  <MoneyRow label="Total" value={money(o.total)} strong />
                  {payment && (
                    <div className="flex justify-between gap-4 pt-1 text-[13px] text-ink/65">
                      <dt>Payment</dt>
                      <dd>
                        {payment[0]}
                        {o.cardLast4 ? ` · card ending ${o.cardLast4}` : ''}
                      </dd>
                    </div>
                  )}
                </dl>
              </>
            ) : (
              <ul className="divide-y divide-ink/10">
                {(b?.items.length ? b.items : ['Care program']).map((item) => (
                  <li key={item} className="px-4 py-3 text-[14px] text-ink">
                    {item}
                    {b?.cycleLabel && <span className="text-ink/65"> · {b.cycleLabel}</span>}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Fulfillment"
            actions={status && <StatusBadge tone={status[1]}>{status[0]}</StatusBadge>}
          >
            {b ? (
              <div className="space-y-3 text-[14px]">
                {STAGE_INFO[STAGE[b.status]].note && b.status !== 'delivered' && (
                  <p className="text-ink/65">{STAGE_INFO[STAGE[b.status]].note}</p>
                )}
                <dl className={cn(inset, 'divide-y divide-ink/10')}>
                  <Field label="Shipment">{b.orderRef}</Field>
                  <Field label="Pharmacy">
                    {b.pharmacy ? (
                      <StatusBadge tone={pharmacyBadge(b.pharmacy)[1]}>{pharmacyBadge(b.pharmacy)[0]}</StatusBadge>
                    ) : (
                      'Not sent through the pharmacy API'
                    )}
                  </Field>
                  <Field label="Pharmacy order">{b.pharmacy?.orderId ?? '—'}</Field>
                  <Field label="Tracking">
                    {trackingNumber ? (
                      <>
                        {trackingCarrier}{' '}
                        <a
                          href={trackingUrl(trackingCarrier, trackingNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
                        >
                          {trackingNumber}
                        </a>
                      </>
                    ) : (
                      '—'
                    )}
                  </Field>
                </dl>
                {b.pharmacy && (b.pharmacy.reason ?? b.pharmacy.error) && (
                  <p className={cn(pharmacyBadge(b.pharmacy)[1] === 'critical' ? 'text-red-800' : 'text-ink/70')}>
                    {b.pharmacy.reason ?? b.pharmacy.error}
                  </p>
                )}

                {toPlace && (
                  <form
                    id="mark-placed"
                    className="space-y-2 border-t border-ink/10 pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(() => pharmacyAcceptOrder(b.id, pharmacyRef));
                    }}
                  >
                    <label className="block text-[14px] font-medium text-ink/70" htmlFor={`ref-${b.id}`}>
                      Pharmacy order number (optional)
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id={`ref-${b.id}`}
                        value={pharmacyRef}
                        onChange={(e) => setPharmacyRef(e.target.value)}
                        placeholder="e.g. 104233"
                        className={input}
                      />
                      <button type="submit" disabled={pending} className={cn(secondaryButton, 'disabled:opacity-40')}>
                        {pending ? 'Saving…' : 'Mark placed'}
                      </button>
                    </div>
                  </form>
                )}

                {b.status === 'accepted' && (
                  <form
                    id="add-tracking"
                    className="space-y-2 border-t border-ink/10 pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!tracking.trim()) return;
                      run(() => pharmacyAddTracking({ fulfillmentId: b.id, carrier, trackingNumber: tracking }));
                    }}
                  >
                    <p className="text-[14px] font-medium text-ink/70">Tracking</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        aria-label="Carrier"
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        className={cn(input, 'sm:w-28 sm:flex-none')}
                      >
                        {CARRIERS.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        aria-label="Tracking number"
                        required
                        value={tracking}
                        onChange={(e) => setTracking(e.target.value)}
                        placeholder="Tracking number"
                        className={input}
                      />
                      <button
                        type="submit"
                        disabled={pending || !tracking.trim()}
                        className={cn(secondaryButton, 'disabled:opacity-40')}
                      >
                        {pending ? 'Saving…' : 'Mark shipped'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <p className="text-[14px] text-ink/70">
                Not on the board yet; it joins To place once signed and paid.
              </p>
            )}
          </SectionCard>

          <Timeline order={o} />
        </div>

        {/* Sidebar */}
        <div className="min-w-0 space-y-5">
          <SectionCard title="Customer">
            <div className="space-y-1 text-[14px]">
              <p className="font-medium text-ink">
                {admin && o?.userId ? (
                  <Link
                    href={`/portal/admin/members/${o.userId}`}
                    className="underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
                  >
                    {o.memberName || b?.patientName}
                  </Link>
                ) : (
                  o?.memberName || b?.patientName
                )}
              </p>
              {o?.memberEmail && (
                <p>
                  <a href={`mailto:${o.memberEmail}`} className="break-all text-ink/70 hover:text-ink">
                    {o.memberEmail}
                  </a>
                </p>
              )}
              {b?.phone && <p className="text-ink/70">{b.phone}</p>}
              {admin && o?.userId && (
                <Link
                  href={`/portal/admin/members/${o.userId}`}
                  className="inline-block pt-1 font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
                >
                  Open member record
                </Link>
              )}
            </div>
          </SectionCard>

          {admin && profit && <ProfitCard e={profit} />}

          <SectionCard title="Shipping address">
            <address className="text-[14px] not-italic leading-relaxed text-ink">
              {o ? (
                <>
                  {o.shippingAddress.fullName}
                  <br />
                  {o.shippingAddress.line1}
                  {o.shippingAddress.line2 && (
                    <>
                      <br />
                      {o.shippingAddress.line2}
                    </>
                  )}
                  <br />
                  {[o.shippingAddress.city, o.shippingAddress.state].filter(Boolean).join(', ')} {o.shippingAddress.zip}
                </>
              ) : (
                b?.address || '—'
              )}
            </address>
          </SectionCard>

          <SectionCard title="Prescription">
            <dl className="space-y-2 text-[14px]">
              <div>
                <dt className="text-[13px] text-ink/65">Prescriber</dt>
                <dd className="text-ink">
                  {b?.prescriber ? `${b.prescriber}${b.npi ? ` · NPI ${b.npi}` : ''}` : '—'}
                </dd>
              </div>
              {extras?.prescription && (
                <div>
                  <dt className="text-[13px] text-ink/65">Protocol</dt>
                  <dd className="text-ink">{extras.prescription.protocol}</dd>
                </div>
              )}
              <div>
                <dt className="text-[13px] text-ink/65">Directions</dt>
                <dd className="text-ink">{extras?.prescription?.directions ?? '—'}</dd>
              </div>
            </dl>
          </SectionCard>

          {b && (
            <SectionCard title="Details for the pharmacy">
              <dl className={cn(inset, 'divide-y divide-ink/10 text-[14px]')}>
                {pharmacyDetails(b).map(([k, v]) => (
                  <Field key={k} label={k}>
                    {v}
                  </Field>
                ))}
              </dl>
              <CopyButton text={pharmacyDetails(b).map(([k, v]) => `${k}: ${v}`).join('\n')} />
            </SectionCard>
          )}

          <SectionCard title="Notes">
            <div className="space-y-2 text-[14px]">
              {attention && (
                <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-3 py-2 leading-relaxed text-amber-900">
                  {attention}
                </p>
              )}
              {b?.notes && <p className="text-ink/70">{b.notes}</p>}
              {!attention && !b?.notes && <p className="text-ink/55">No notes.</p>}
            </div>
          </SectionCard>
        </div>
      </div>

      {cancelling && o && (
        <dialog
          ref={cancelDialog}
          aria-label={`Cancel ${ref}`}
          onClose={() => setCancelling(false)}
          onClick={(e) => e.target === e.currentTarget && cancelDialog.current?.close()}
          className="!m-auto w-[calc(100%-32px)] max-w-md rounded-shell bg-transparent p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
        >
          <CancelOrder order={o} startOpen onClose={() => cancelDialog.current?.close()} />
        </dialog>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 px-3 py-2">
      <dt className="w-28 flex-none text-[13px] text-ink/65">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

/** Admin only. Revenue down to profit, each estimated figure marked "est.". */
function ProfitCard({ e }: { e: Economics }) {
  const est = <span className="ml-1 text-[12px] font-normal text-amber-800">est.</span>;
  const row = (label: string, cents: number, estimated = false) => (
    <div className="flex justify-between gap-4 text-ink/75">
      <dt>{label}</dt>
      <dd>
        {cents ? `−${formatMoney(cents)}` : formatMoney(0)}
        {estimated && est}
      </dd>
    </div>
  );
  return (
    <SectionCard
      title="Profit"
      actions={<span className="text-[12px] font-medium text-ink/55">Admin only</span>}
    >
      <dl className="space-y-1.5 text-[14px] tabular-nums">
        <div className="flex justify-between gap-4 text-ink/75">
          <dt>Revenue</dt>
          <dd>{formatMoney(e.revenue)}</dd>
        </div>
        {row('Product cost', e.productCost, e.est.cost)}
        {row('Pharmacy shipping', e.shippingCost, e.est.shipping)}
        {row('Stripe fee', e.stripeFee, e.est.fee)}
        {e.refunds > 0 && row('Refunds', e.refunds)}
        <div className="flex justify-between gap-4 border-t border-ink/10 pt-2 font-semibold text-ink">
          <dt>Profit</dt>
          <dd className={cn(e.profit < 0 && 'text-red-700')}>
            {e.profit < 0 ? `−${formatMoney(-e.profit)}` : formatMoney(e.profit)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-ink/75">
          <dt>Margin</dt>
          <dd>{e.margin === null ? '—' : `${Math.round(e.margin * 100)}%`}</dd>
        </div>
      </dl>
      {(e.estimated || e.closed) && (
        <p className="mt-2.5 text-[13px] leading-snug text-ink/60">
          {e.closed && 'Closed without shipping: no product or shipping cost. '}
          {e.estimated && 'est. = not recorded at payment, so worked out from today’s costs and Stripe’s 2.9% + 30¢.'}
        </p>
      )}
    </SectionCard>
  );
}

function MoneyRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4', strong ? 'pt-1 font-semibold text-ink' : 'text-ink/75')}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** "More actions": a <details> menu that closes on a choice, an outside click or Escape. */
function MoreActions({ children }: { children: (close: () => void) => ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute('open');
  useEffect(() => {
    const onDown = (e: Event) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  return (
    <details ref={ref} className="relative">
      <summary className={cn(secondaryButton, 'cursor-pointer list-none [&::-webkit-details-marker]:hidden')}>
        More actions
        <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m5.5 8 4.5 4.5L14.5 8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded-inner border border-ink/10 bg-white py-1 shadow-[0_12px_32px_-12px_rgba(17,17,17,0.3)] sm:left-auto sm:right-0">
        {children(close)}
      </div>
    </details>
  );
}

function MenuItem({
  onClick,
  disabled,
  danger,
  hint,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'block min-h-[40px] w-full px-3 py-2 text-left text-[14px] transition-colors hover:bg-milk disabled:cursor-not-allowed disabled:hover:bg-transparent',
        danger ? 'text-red-700' : 'text-ink',
        disabled && 'text-ink/40',
      )}
    >
      {children}
      {hint && <span className="block text-[13px] text-ink/50">{hint}</span>}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className="mt-2 text-[14px] text-ink/70 underline decoration-ink/30 underline-offset-[3px] hover:text-ink hover:decoration-ink"
    >
      {done ? 'Copied' : 'Copy all details'}
    </button>
  );
}

const NOTE_ERROR: Record<string, string> = {
  not_authorized: 'Your session has ended. Sign in again. Nothing was posted.',
  too_long: 'That is too long. Shorten it and try again.',
  not_found: 'This order is not in the database. Nothing was posted.',
};

/** The order's timeline, newest first, with a note box (addOrderNoteAction). The member reads these. */
function Timeline({ order: o }: { order?: Order }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updates = [...(o?.updates ?? [])].sort((a, b) => b.at - a.at);

  const post = async () => {
    if (!o || !note.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await addOrderNoteAction(o.id, note.trim());
      if (res.ok) {
        setNote('');
        router.refresh();
      } else {
        setError(NOTE_ERROR[res.error ?? ''] ?? 'Could not post that. Nothing was posted — try again.');
      }
    } catch {
      setError('Could not post that. Nothing was posted — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Timeline">
      {o && (
        <div className="mb-4">
          <label htmlFor="order-note" className="sr-only">
            Add a note to the timeline
          </label>
          <textarea
            id="order-note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError(null);
            }}
            rows={2}
            placeholder="Add a note. The member reads it on their order page."
            className={cn(input, 'resize-none')}
          />
          {error && <p className="mt-2 text-[14px] text-red-800">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={post}
              disabled={!note.trim() || busy}
              className={cn(secondaryButton, 'disabled:opacity-40')}
            >
              {busy ? 'Posting…' : 'Post note'}
            </button>
          </div>
        </div>
      )}
      {updates.length ? (
        <ol className="space-y-3 border-l border-ink/15 pl-4">
          {updates.map((u) => (
            <li key={u.id} className="relative text-[14px]">
              <span aria-hidden className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-ink/35" />
              <p className="text-ink">{u.note}</p>
              <p className="text-[13px] text-ink/60">
                {u.author}
                {u.author !== ROLE[u.role] ? ` · ${ROLE[u.role] ?? u.role}` : ''} · {formatDateTime(u.at)}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[14px] text-ink/55">{o ? 'Nothing on the timeline yet.' : 'No member order is linked to this shipment.'}</p>
      )}
    </SectionCard>
  );
}
