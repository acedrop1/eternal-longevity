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
import {
  addOrderNoteAction,
  setOrderVisibilityAction,
  previewHealthReminderAction,
  remindHealthQuestionsAction,
  type HealthReminderPreview,
} from '@/lib/orders-db';
import { adminRefundOrder } from '@/lib/admin-billing-actions';
import { setOrderShippingCostAction } from '@/lib/settings-actions';
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
  visibility = null,
}: {
  /** Admin: archived or deleted (lib/order-visibility). */
  visibility?: 'archived' | 'deleted' | null;
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
  const [reminder, setReminder] = useState<string | null>(null);
  const closed = Boolean(o && ['denied-admin', 'declined-clinical', 'canceled', 'refunded', 'delivered'].includes(o.status));
  const setVisibility = async (to: 'archived' | 'deleted' | null) => {
    if (!o) return;
    if (to === 'deleted') {
      const ok = await confirm({
        title: `Delete ${ref}?`,
        body: 'For test orders. It disappears from every list, and from revenue and profit. The record is kept, so it can be restored if needed.',
        confirmLabel: 'Delete order',
        danger: true,
      });
      if (!ok) return;
    }
    start(async () => {
      const res = await setOrderVisibilityAction(o.id, to);
      if (!res.ok) return setResult({ ok: false, message: res.error ?? 'Could not save.' });
      if (to === 'deleted') router.push('/portal/admin/orders');
      else router.refresh();
    });
  };
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
      title: `Send ${ref} to the pharmacy?`,
      body: 'It is placed with the pharmacy now, and its cost comes out of your pharmacy wallet. If it fails, the reason shows here and you can place it by hand.',
      confirmLabel: 'Send to pharmacy',
    });
    if (ok) run(() => retrySendToPharmacyAction(b.id));
  };

  // Cancel opens the index's own cancel form (reason, refund, follow-up) in a dialog.
  const [cancelling, setCancelling] = useState(false);
  const cancelDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (cancelling) cancelDialog.current?.showModal();
  }, [cancelling]);
  // Refund is its own action: money back (full or part) without cancelling, unless admin asks.
  const [refunding, setRefunding] = useState(false);
  const refundDialog = useRef<HTMLDialogElement>(null);
  const [reminding, setReminding] = useState<'email' | 'text' | null>(null);
  const remindDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (reminding) remindDialog.current?.showModal();
  }, [reminding]);
  useEffect(() => {
    if (refunding) refundDialog.current?.showModal();
  }, [refunding]);

  return (
    <div className="space-y-5">
      {confirmDialog}

      <header className="space-y-2">
        <Link
          href={admin ? '/portal/admin/orders' : '/portal/doctor/fulfillment'}
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
              {visibility && <StatusBadge tone="neutral">{visibility === 'deleted' ? 'Deleted' : 'Archived'}</StatusBadge>}
            </div>
            <p className="mt-1 text-[14px] text-ink/65">
              Placed {formatDateTime(o?.placedAt ?? b?.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {admin && o && (
              <MoreActions>
                {(close) => (
                  <>
                    <MenuItem
                      disabled={!o.paidAt}
                      hint={o.paidAt ? undefined : 'Nothing was charged'}
                      onClick={() => {
                        close();
                        setRefunding(true);
                      }}
                    >
                      Refund…
                    </MenuItem>
                    <MenuItem
                      disabled={!visibility && !closed && o.status !== 'shipped'}
                      hint={!visibility && !closed && o.status !== 'shipped' ? 'Only once it has shipped or closed' : undefined}
                      onClick={() => {
                        close();
                        void setVisibility(visibility === 'archived' || visibility === 'deleted' ? null : 'archived');
                      }}
                    >
                      {visibility === 'archived' || visibility === 'deleted' ? 'Restore' : 'Archive'}
                    </MenuItem>
                    <MenuItem
                      danger
                      disabled={!closed || visibility === 'deleted'}
                      hint={closed ? 'For test orders' : 'Cancel it first'}
                      onClick={() => {
                        close();
                        void setVisibility('deleted');
                      }}
                    >
                      Delete…
                    </MenuItem>
                    <MenuItem
                      danger
                      disabled={!cancel}
                      hint={cancel ? undefined : 'Not once it has shipped or closed'}
                      onClick={() => {
                        close();
                        setCancelling(true);
                      }}
                    >
                      Cancel order…
                    </MenuItem>
                  </>
                )}
              </MoreActions>
            )}
            {retry && (
              <button type="button" onClick={retrySend} disabled={pending} className={cn(headerButton, 'disabled:opacity-40')}>
                {pending ? 'Sending…' : 'Send to pharmacy'}
              </button>
            )}
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
          {admin && o?.status === 'awaiting-visit' && (
            <SectionCard title="Waiting on health questions">
              <p className="text-[14px] leading-relaxed text-ink/70">
                Dr. Elder can&apos;t review this order until they answer the health questions. Automatic email reminders go out
                with the daily noon (ET) run: the first once the order is 2 hours old, then at 1 and 3 days. Send one now; you see it
                before it goes.
              </p>
              {reminder && (
                <p role="status" className="mt-2 text-[14px] font-medium text-ink">
                  {reminder}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setReminding('email')} className={headerButton}>
                  Email reminder…
                </button>
                <button type="button" onClick={() => setReminding('text')} className={secondaryButton}>
                  Text reminder…
                </button>
              </div>
            </SectionCard>
          )}

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

          {admin && profit && o && <ProfitCard e={profit} orderNumber={o.id} />}

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

      {reminding && o && (
        <dialog
          ref={remindDialog}
          aria-label={`Health-question reminder for ${ref}`}
          onClose={() => setReminding(null)}
          onClick={(e) => e.target === e.currentTarget && remindDialog.current?.close()}
          className="!m-auto w-[calc(100%-32px)] max-w-2xl rounded-shell bg-transparent p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
        >
          <ReminderPreview
            channel={reminding}
            orderNumber={o.id}
            onClose={() => remindDialog.current?.close()}
            onSent={(message) => {
              setReminder(message);
              remindDialog.current?.close();
              router.refresh();
            }}
          />
        </dialog>
      )}

      {refunding && o && (
        <dialog
          ref={refundDialog}
          aria-label={`Refund ${ref}`}
          onClose={() => setRefunding(false)}
          onClick={(e) => e.target === e.currentTarget && refundDialog.current?.close()}
          className="!m-auto w-[calc(100%-32px)] max-w-md rounded-shell bg-transparent p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
        >
          <RefundOrder order={o} canCancel={Boolean(cancel)} onClose={() => refundDialog.current?.close()} />
        </dialog>
      )}
    </div>
  );
}

/** The reminder email and text exactly as they will go out, with a choice of which to send. */
function ReminderPreview({
  channel,
  orderNumber,
  onClose,
  onSent,
}: {
  channel: 'email' | 'text';
  orderNumber: string;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [preview, setPreview] = useState<HealthReminderPreview | null>(null);
  const email = channel === 'email';
  const text = channel === 'text';
  const [error, setError] = useState('');
  const [sending, startSend] = useTransition();

  useEffect(() => {
    previewHealthReminderAction(orderNumber)
      .then(setPreview)
      .catch(() => setPreview({ ok: false, error: 'Could not load the preview. Check your connection and try again.' }));
  }, [orderNumber]);

  const send = () =>
    startSend(async () => {
      const anyway = text && Boolean(preview?.smsNoConsent);
      const res = await remindHealthQuestionsAction(orderNumber, { email, text, anyway }).catch(() => null);
      if (!res) return setError('Could not reach the server. Nothing was sent; try again.');
      if (!res.ok) return setError(res.error ?? 'Could not send.');
      onSent(res.message ?? 'Reminder sent.');
    });

  return (
    <div className="max-h-[90vh] overflow-y-auto rounded-inner bg-white p-5 ring-1 ring-ink/10">
      <h2 className="text-[17px] font-semibold text-ink">{email ? 'Email' : 'Text'} reminder: health questions</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink/65">This is exactly what they will get.</p>

      {!preview && <p className="mt-5 text-[14px] text-ink/65">Loading preview…</p>}
      {preview && !preview.ok && <p role="alert" className="mt-5 text-[14px] text-red-700">{preview.error}</p>}
      {preview?.ok && (
        <div className="mt-5 space-y-5">
          {email && (
          <section>
            <dl className="space-y-0.5 text-[13px] text-ink/70">
              <div>
                <dt className="inline text-ink/55">To: </dt>
                <dd className="inline">{preview.to}</dd>
              </div>
              <div>
                <dt className="inline text-ink/55">Subject: </dt>
                <dd className="inline font-medium text-ink">{preview.subject}</dd>
              </div>
            </dl>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.html}
              className="mt-2 h-[420px] w-full rounded-inner bg-white ring-1 ring-ink/10"
            />
          </section>
          )}

          {text && (
          <section>
            <p className="text-[13px] text-ink/70">
              <span className="text-ink/55">To: </span>
              {preview.phoneLast4 ? `•••• ${preview.phoneLast4}` : 'no number on file'}
            </p>
            {preview.smsNoConsent && (
              <p className="mt-2 text-[13px] leading-relaxed text-amber-800">
                They didn&apos;t agree to texts at checkout. It&apos;s about their own order and has no health details, so you can
                send it anyway. It&apos;s logged.
              </p>
            )}
            {preview.smsBlocked ? (
              <p className="mt-2 text-[13px] text-ink/65">{preview.smsBlocked}</p>
            ) : (
              <p className="mt-2 max-w-sm whitespace-pre-wrap rounded-[18px] rounded-bl-[6px] bg-milk px-4 py-3 text-[14px] leading-snug text-ink">
                {preview.sms}
              </p>
            )}
          </section>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-[13px] text-red-700">{error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryButton}>
          Cancel
        </button>
        <button
          type="button"
          onClick={send}
          disabled={!preview?.ok || sending || (text && Boolean(preview?.smsBlocked))}
          className={cn(headerButton, 'disabled:opacity-40')}
        >
          {sending ? 'Sending…' : text ? (preview?.smsNoConsent ? 'Send text anyway' : 'Send text') : 'Send email'}
        </button>
      </div>
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
function ProfitCard({ e, orderNumber }: { e: Economics; orderNumber: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [ship, setShip] = useState(String(e.shippingCost / 100));
  const [error, setError] = useState('');
  const [saving, startSave] = useTransition();
  const saveShip = () =>
    startSave(async () => {
      const res = await setOrderShippingCostAction(orderNumber, Number(ship));
      if (!res.ok) return setError(res.message);
      setError('');
      setEditing(false);
      router.refresh();
    });
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
        {editing ? (
          <div className="flex items-center justify-between gap-3 text-ink/75">
            <dt>Pharmacy shipping</dt>
            <dd className="flex items-center gap-2">
              <span className="relative">
                <span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/60">
                  $
                </span>
                <input
                  inputMode="numeric"
                  aria-label="Pharmacy shipping, whole dollars"
                  value={ship}
                  onChange={(ev) => setShip(ev.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                  className="w-20 rounded-inner bg-white py-1.5 pl-6 pr-2 text-[16px] tabular-nums text-ink ring-1 ring-ink/15 focus:outline-none focus:ring-ink/35"
                />
              </span>
              <button type="button" onClick={saveShip} disabled={saving || ship === ''} className="text-[13px] font-semibold text-ink underline underline-offset-2 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-[13px] text-ink/60">
                Cancel
              </button>
            </dd>
          </div>
        ) : (
          <div className="flex justify-between gap-4 text-ink/75">
            <dt>
              Pharmacy shipping{' '}
              <button type="button" onClick={() => setEditing(true)} className="ml-1 text-[12px] text-ink/55 underline underline-offset-2 hover:text-ink">
                Edit
              </button>
            </dt>
            <dd>
              {e.shippingCost ? `−${formatMoney(e.shippingCost)}` : formatMoney(0)}
              {e.est.shipping && est}
            </dd>
          </div>
        )}
        {error && <p role="alert" className="text-[13px] text-red-700">{error}</p>}
        {row('Processing fee', e.stripeFee, e.est.fee)}
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
          {e.estimated && 'est. = not recorded at payment, so worked out from today’s costs and the estimated processing fee.'}
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

/**
 * Refund, separate from cancel: full or part of the payment back. The order carries on unless
 * "Also cancel" is ticked (unshipped orders only), which stops the pharmacy and the plan too.
 */
function RefundOrder({ order, canCancel, onClose }: { order: Order; canCancel: boolean; onClose: () => void }) {
  const router = useRouter();
  const [full, setFull] = useState(true);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [alsoCancel, setAlsoCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const part = Number(amount);
  const partOk = Number.isFinite(part) && part > 0 && part <= order.total;
  const ready = !busy && (full || partOk);

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await adminRefundOrder({
        orderNumber: order.id,
        amountDollars: full ? undefined : part,
        reason: reason.trim() || undefined,
        alsoCancel: full && canCancel && alsoCancel,
        notify,
      });
      setResult(res);
      if (res.ok) router.refresh();
    } catch {
      setResult({ ok: false, message: 'Could not refund just now. Nothing was refunded. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="rounded-inner bg-white p-5 text-[14px] leading-relaxed text-ink ring-1 ring-ink/10">
        <p className="font-semibold">Done.</p>
        <p className="mt-1 text-ink/75">{result.message}</p>
        <button type="button" onClick={onClose} className={cn(headerButton, 'mt-4')}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-inner bg-white p-5 ring-1 ring-ink/10">
      <h2 className="text-[17px] font-semibold text-ink">Refund {order.id.match(/^\d+$/) ? `#${order.id}` : order.id}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink/65">
        Returns money to their card. The order itself carries on unless you also cancel it.
      </p>

      <div role="radiogroup" aria-label="Amount" className="mt-4 space-y-2 text-[14px] text-ink">
        <label className="flex items-center gap-2">
          <input type="radio" checked={full} onChange={() => setFull(true)} className="accent-ink" />
          Full payment: ${order.total.toFixed(2)}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={!full} onChange={() => setFull(false)} className="accent-ink" />
          Part of it:
          <span className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/50">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              max={order.total}
              value={amount}
              onFocus={() => setFull(false)}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Refund amount"
              className="h-9 w-28 rounded-thumb bg-white pl-6 pr-2 text-[15px] ring-1 ring-ink/15 focus:outline-none focus:ring-2 focus:ring-ink/30"
            />
          </span>
        </label>
        {!full && amount && !partOk && (
          <p className="text-[13px] text-red-700">Enter an amount between $0.01 and ${order.total.toFixed(2)}.</p>
        )}
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-[13px] font-medium text-ink/70">Reason (optional, shown on their receipt)</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Test order."
          className="w-full resize-none rounded-inner bg-white px-3 py-2 text-[15px] text-ink ring-1 ring-ink/15 placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-ink/30"
        />
      </label>

      {full && canCancel && (
        <label className="mt-3 flex items-start gap-2 text-[14px] text-ink/85">
          <input type="checkbox" checked={alsoCancel} onChange={(e) => setAlsoCancel(e.target.checked)} className="mt-1 accent-ink" />
          <span>
            Also cancel the order
            <span className="block text-[13px] text-ink/60">
              It hasn&rsquo;t shipped. Without this, it still goes to the pharmacy and ships, and its plan keeps renewing.
            </span>
          </span>
        </label>
      )}
      <label className="mt-3 flex items-start gap-2 text-[14px] text-ink/85">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-1 accent-ink" />
        <span>Email them the refund receipt.</span>
      </label>

      {result && !result.ok && (
        <p role="alert" className="mt-3 rounded-inner border border-red-600/20 bg-red-50 px-3 py-2 text-[14px] text-red-700">
          {result.message}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!ready} onClick={submit} className={cn(headerButton, 'disabled:opacity-40')}>
          {busy ? 'Refunding…' : full ? `Refund $${order.total.toFixed(2)}` : partOk ? `Refund $${part.toFixed(2)}` : 'Refund'}
        </button>
        <button type="button" disabled={busy} onClick={onClose} className={secondaryButton}>
          Keep as is
        </button>
      </div>
    </div>
  );
}
