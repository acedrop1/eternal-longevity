'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/components/orders/OrdersProvider';
import { addOrderNoteAction, changePrescriptionAction, requestInfoFromPatientAction, requestPhotosAction } from '@/lib/orders-db';
import { replyMessageAction, type PortalMessage } from '@/lib/messages-db';
import { waited } from '@/lib/order-health';
import { STATUS_LABEL, type Order } from '@/lib/orders';
import { cn } from '@/lib/utils';
import type { PatientReview } from '@/lib/clinical-review';
import { orderRef } from '@/lib/format';
import { categoryFlagCount, type ThreadStatus } from '@/lib/prescriber-view';
import { CategoryAnswers, ReviewChip, ThreadChip } from '@/components/doctor/CategoryAnswers';
import { DetailHeader, InfoRow, detailGrid } from '@/components/admin/DetailHeader';
import { SectionCard, StatusBadge, headerButton, secondaryButton, type BadgeTone } from '@/components/admin/IndexTable';
import { sentenceCase } from '@/components/portal/ui';

/**
 * One case, Shopify record style: the patient record in the main column, the
 * patient, order and thread in the sidebar, and the decision in the header
 * (desktop) or a sticky bar at the bottom (phone). The sign, ask, photo and
 * decline flows are the queue card's, moved here unchanged.
 */

/** Body copy: 15px on a phone, the admin's 13px from md up. */
const body = 'text-[15px] leading-relaxed md:text-[14px]';
const primaryBtn = cn(headerButton, 'min-h-[44px] md:min-h-[34px] disabled:opacity-40');
const outlineBtn = cn(secondaryButton, 'min-h-[44px] md:min-h-[34px] disabled:opacity-60');
/** The decision button in the brand's butter, so the one action that matters is the one the eye finds. */
const signBtn =
  'inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-butter px-5 text-[15px] font-semibold text-ink ring-1 ring-butter-deep transition-colors hover:bg-butter-deep disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[38px] md:text-[14px]';
const dangerBtn =
  'inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full bg-white px-4 text-[14px] font-semibold text-red-700 ring-1 ring-red-600/25 transition-colors hover:bg-red-50 disabled:opacity-60 md:min-h-[34px]';
const textArea =
  'w-full resize-none rounded-inner bg-white px-3.5 py-2.5 text-[16px] text-ink ring-1 ring-ink/15 placeholder:text-ink/55 focus:outline-none focus:ring-2 focus:ring-ink/30 md:text-[14px]';
const alertBox = 'rounded-inner border border-red-600/20 bg-red-50 px-4 py-2.5 text-[15px] text-red-700 md:text-[14px]';

const ACTIVE = ['signed', 'compounding', 'shipped'];

/** What he can prescribe instead: each live product and its plans, priced from the catalogue. */
export interface RxOption {
  id: string;
  name: string;
  /** Product photo; shown whole (object-contain) on its swatch. */
  image?: string;
  swatch?: string;
  shot?: boolean;
  tiers: { key: string; label: string; total: number }[];
}

function statusBadge(status: Order['status']): [string, BadgeTone] {
  if (status === 'assigned') return ['Awaiting my review', 'info'];
  if (status === 'declined-clinical') return ['Declined', 'critical'];
  if (status === 'delivered') return ['Delivered', 'neutral'];
  return [sentenceCase(STATUS_LABEL[status] ?? status), ACTIVE.includes(status) || status === 'paid' ? 'success' : 'neutral'];
}

export function DoctorReview({
  order: initial,
  doctorName,
  signWindowOpen,
  review,
  thread,
  defaultSig,
  options = [],
  messages = [],
  sample = false,
}: {
  order: Order;
  doctorName: string;
  /** True while the password given at the last signature is still good. */
  signWindowOpen: boolean;
  review?: PatientReview;
  thread?: ThreadStatus;
  /** Approved default directions for this product (Admin → Products), to prefill the sig. */
  defaultSig: string;
  /** Products and plans he can switch the order to (Change prescription). */
  options?: RxOption[];
  /** His latest messages with this patient, for the Message patient pop-up. */
  messages?: PortalMessage[];
  /** Dev-only fixture order. */
  sample?: boolean;
}) {
  const { orders, signRx, declineClinical } = useOrders();
  // The provider's copy once it has one, so a sign or decline shows at once.
  const order = orders.find((o) => o.id === initial.id) ?? initial;
  const catFlags = review ? categoryFlagCount(review.categories) : 0;
  const router = useRouter();
  const [open, setOpen] = useState<null | 'sign' | 'decline' | 'ask' | 'change' | 'message'>(null);
  const [msgDraft, setMsgDraft] = useState('');
  const [msgError, setMsgError] = useState<string | null>(null);
  const [msgBusy, setMsgBusy] = useState(false);
  const [sentMsgs, setSentMsgs] = useState<PortalMessage[]>([]);
  // The server's copy arrived with the refresh: drop the optimistic ones.
  useEffect(() => setSentMsgs([]), [messages]);
  const [note, setNote] = useState('');
  const [password, setPassword] = useState('');
  // The sig, prefilled with the directions he approved for this product.
  const [directions, setDirections] = useState(defaultSig);
  // A changed prescription brings the new product's directions with the refresh.
  useEffect(() => setDirections(defaultSig), [defaultSig]);
  const line = order.lines[0];
  const [rxPick, setRxProduct] = useState(line?.productId ?? '');
  const [rxPlan, setRxPlan] = useState<string>(line?.cadence ?? '');
  // The ordered product if it's on the list, otherwise the first one shown.
  const rxProduct = options.some((o) => o.id === rxPick) ? rxPick : (options[0]?.id ?? '');
  const rxTiers = options.find((o) => o.id === rxProduct)?.tiers ?? [];
  const rxTier = rxTiers.find((t) => t.key === rxPlan) ?? rxTiers[0];
  const rxSame = rxProduct === line?.productId && rxTier?.key === line?.cadence;
  const [signError, setSignError] = useState<string | null>(null);
  // Starts from the server's view, and opens if the ten minutes ran out while he read.
  const [needPassword, setNeedPassword] = useState(!signWindowOpen);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'sign' | 'decline' | 'ask' | 'photos' | 'change'>(null);
  /** What he just did here, so the page answers even before the refresh lands. */
  const [done, setDone] = useState<null | 'signed' | 'declined'>(null);
  const hoursWaiting = Math.max(0, Math.floor((Date.now() - order.placedAt) / 3_600_000));
  const pending = order.status === 'assigned' && !done;
  const formRef = useRef<HTMLDivElement>(null);
  const choiceRef = useRef<HTMLDivElement>(null);
  // Change prescription: filter the product cards by name.
  const [rxQuery, setRxQuery] = useState('');
  const [badgeLabel, badgeTone] = statusBadge(done === 'signed' ? 'signed' : done === 'declined' ? 'declined-clinical' : order.status);

  // A form opened from the bottom bar lands at the top of the record: bring it into view.
  useEffect(() => {
    if (open === 'sign' || open === 'ask' || open === 'decline') formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [open]);

  const startSign = () => {
    setSignError(null);
    setPassword('');
    setOpen('sign');
  };

  const requestPhotos = async () => {
    if (busy) return;
    setBusy('photos');
    setActionError(null);
    try {
      const res = await requestPhotosAction(order.id);
      if (res.ok) router.refresh();
      else setActionError(actionErrorText(res.error));
    } catch {
      setActionError(actionErrorText());
    } finally {
      setBusy(null);
    }
  };

  const sign = async () => {
    if ((!password && needPassword) || !directions.trim() || busy) return;
    setBusy('sign');
    setSignError(null);
    try {
      const res = await signRx(order.id, doctorName, password, directions.trim());
      if (res.ok) {
        setOpen(null);
        setPassword('');
        setDone('signed');
      } else {
        setSignError(
          res.error === 'bad_password'
            ? needPassword
              ? 'That password is not right. Nothing was signed or charged.'
              : 'Your ten minutes ran out. Enter your password to sign. Nothing was signed or charged.'
            : res.error === 'no_directions'
              ? 'Add the directions. Nothing was signed or charged.'
              : res.error === 'product_unavailable'
                ? 'This product was pulled from sale; ask admin. Nothing was signed or charged.'
                : res.error === 'health_questions_open'
                  ? 'The patient hasn’t finished their health questions for this order yet. Nothing was signed or charged.'
                  : res.error === 'not_authorized'
                    ? 'This order is assigned to another prescriber. Nothing was signed or charged.'
                    : 'Could not sign. Nothing was charged — try again.',
        );
        if (res.error === 'bad_password') setNeedPassword(true);
      }
    } finally {
      setBusy(null);
    }
  };

  const ask = async () => {
    if (!note.trim() || busy) return;
    setBusy('ask');
    setActionError(null);
    try {
      const res = await requestInfoFromPatientAction(order.id, note.trim());
      if (res.ok) {
        setOpen(null);
        setNote('');
        router.refresh();
      } else {
        setActionError(actionErrorText(res.error));
      }
    } catch {
      setActionError(actionErrorText());
    } finally {
      setBusy(null);
    }
  };

  const change = async () => {
    if (!note.trim() || !rxTier || rxSame || busy) return;
    setBusy('change');
    setActionError(null);
    try {
      const res = await changePrescriptionAction(order.id, rxProduct, rxTier.key, note.trim());
      if (res.ok) {
        setOpen(null);
        setNote('');
        router.refresh();
      } else {
        setActionError(
          res.error === 'already_ordered'
            ? 'They already have that product on a plan or in another order. Nothing was changed.'
            : res.error === 'product_unavailable'
              ? 'That product is not on sale right now. Nothing was changed.'
              : res.error === 'not_open'
                ? 'This order is already signed or closed, so it can’t be changed here.'
                : actionErrorText(res.error),
        );
      }
    } catch {
      setActionError(actionErrorText());
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    if (!note.trim() || busy) return;
    setBusy('decline');
    try {
      await declineClinical(order.id, doctorName, note.trim());
      setOpen(null);
      setDone('declined');
    } finally {
      setBusy(null);
    }
  };

  // Tagged with this order, like his other messages, so the patient sees which order it's about.
  const orderTag = `About order #${order.id}${order.lines.length ? ` (${order.lines.map((l) => l.productName).join(', ')})` : ''}:`;
  const sendMessage = async () => {
    const text = msgDraft.trim();
    if (!text || !order.userId || msgBusy) return;
    setMsgBusy(true);
    setMsgError(null);
    const body = `${orderTag} ${text}`;
    try {
      const res = await replyMessageAction(order.userId, 'doctor', body);
      if (res.ok) {
        setSentMsgs((m) => [...m, { id: `sent-${Date.now()}`, senderRole: 'staff', body, createdAt: new Date().toISOString() }]);
        setMsgDraft('');
        router.refresh();
      } else {
        setMsgError(res.error ?? 'Could not send. Try again.');
      }
    } catch {
      setMsgError('Could not send. Try again.');
    } finally {
      setMsgBusy(false);
    }
  };

  const photosButton = review?.photosRequestable && (
    <button type="button" disabled={busy !== null} onClick={requestPhotos} className={outlineBtn}>
      {busy === 'photos' && <Spinner />}
      {busy === 'photos' ? 'Requesting…' : 'Request photos'}
    </button>
  );

  return (
    // Phones: the shared header and card titles run at the admin's desktop size; lift them here.
    <div className="space-y-5 max-md:[&>header>div>a]:h-11 max-md:[&>header_p]:text-[15px] max-md:[&_h2+p]:text-[15px] max-md:[&_h2]:text-[16px]">
      <DetailHeader
        backHref="/portal/doctor"
        backLabel="Queue"
        title={order.memberName}
        badges={
          <>
            <StatusBadge tone={badgeTone}>{badgeLabel}</StatusBadge>
            {catFlags > 0 && (
              <ReviewChip>
                {catFlags} {catFlags === 1 ? 'answer' : 'answers'} to review
              </ReviewChip>
            )}
            {review?.photosPending && <ReviewChip>Photos pending</ReviewChip>}
            <ThreadChip status={thread} />
          </>
        }
        meta={
          <>
            {orderRef(order.id)} · {order.state}
            {order.status === 'assigned' && (
              <>
                {' · '}
                <span className={cn(hoursWaiting >= 24 && 'font-medium text-red-700')}>waiting {waited(hoursWaiting)}</span>
              </>
            )}
          </>
        }
        actions={
          pending &&
          open === null && (
            <div className="hidden flex-wrap items-center gap-2 lg:flex">
              <button type="button" disabled={busy !== null} onClick={() => setOpen('decline')} className={dangerBtn}>
                Decline
              </button>
              {/* Photos are never required up front; he asks when he needs them. */}
              {photosButton}
              <button type="button" disabled={busy !== null} onClick={() => setOpen('ask')} className={outlineBtn}>
                Ask for more information
              </button>
              {options.length > 0 && (
                <button type="button" disabled={busy !== null} onClick={() => setOpen('change')} className={outlineBtn}>
                  Change prescription
                </button>
              )}
              {order.userId && (
                <button type="button" onClick={() => setOpen('message')} className={outlineBtn}>
                  Message patient
                </button>
              )}
              <button type="button" disabled={busy !== null} onClick={startSign} className={signBtn}>
                Approve &amp; sign prescription
              </button>
            </div>
          )
        }
      />

      {sample && (
        <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[15px] text-amber-900 md:text-[14px]">
          Sample data (dev only). Nothing here is a real patient, and actions need Supabase.
        </p>
      )}

      {done && (
        <p role="status" className="rounded-inner border border-emerald-600/20 bg-emerald-50 px-4 py-2.5 text-[15px] text-emerald-900 md:text-[14px]">
          {done === 'signed' ? 'Signed. The order is on its way to the pharmacy.' : 'Declined. Your reason went to the patient.'}{' '}
          <Link href="/portal/doctor" className="font-semibold underline underline-offset-[3px]">
            Back to the queue
          </Link>
        </p>
      )}

      {actionError && open === null && (
        <p role="alert" className={alertBox}>
          {actionError}
        </p>
      )}

      <div className={detailGrid}>
        <div className="min-w-0 space-y-4">
          {open && (
            <div ref={formRef} className="scroll-mt-40 md:scroll-mt-28">
              {open === 'sign' && (
                <SectionCard title="Sign the prescription" className="border-butter-deep bg-butter-soft">
                  <p className={cn(body, 'mb-4 text-ink/75')}>
                    Signing writes the prescription under your licence, charges{' '}
                    <span className="font-semibold text-ink">${order.total.toFixed(2)}</span> to the card on file and
                    releases the order to the pharmacy.
                  </p>
                  <label htmlFor={`sig-${order.id}`} className="mb-1 block text-[15px] font-medium text-ink/75 md:text-[14px]">
                    Directions
                  </label>
                  <p className={cn(body, 'mb-2 text-ink/65')}>
                    Printed on the label. The pharmacist verifies the compound against them, and every refill on this
                    prescription ships with them.
                  </p>
                  <textarea
                    id={`sig-${order.id}`}
                    value={directions}
                    onChange={(e) => {
                      setDirections(e.target.value);
                      setSignError(null);
                    }}
                    rows={3}
                    maxLength={1000}
                    required
                    placeholder="e.g. Inject 0.25 mL (50 mg) subcutaneously twice weekly."
                    className={cn(textArea, 'mb-4')}
                  />

                  {!needPassword ? (
                    <p className={cn(body, 'text-ink/65')}>
                      Your password is still good for a few more minutes, so you are not asked again for this one.
                    </p>
                  ) : (
                    <>
                      <p className={cn(body, 'mb-4 text-ink/65')}>
                        Your password is required again here. A session left open is not evidence that you are the one
                        signing. It then holds for ten minutes, so a morning&apos;s queue is one password.
                      </p>
                      <label htmlFor={`pw-${order.id}`} className="mb-1 block text-[15px] font-medium text-ink/75 md:text-[14px]">
                        Your password
                      </label>
                      <input
                        id={`pw-${order.id}`}
                        type="password"
                        value={password}
                        autoComplete="current-password"
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setSignError(null);
                        }}
                        className="h-11 w-full rounded-inner bg-white px-3.5 text-[16px] text-ink ring-1 ring-ink/15 focus:outline-none focus:ring-2 focus:ring-ink/30 md:h-9 md:text-[14px]"
                      />
                    </>
                  )}

                  {signError && <p className={cn(alertBox, 'mt-3')}>{signError}</p>}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={(!password && needPassword) || !directions.trim() || busy !== null}
                      onClick={sign}
                      className={signBtn}
                    >
                      {busy === 'sign' && <Spinner />}
                      {busy === 'sign' ? 'Processing payment…' : 'Confirm and sign'}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        setOpen(null);
                        setPassword('');
                        setSignError(null);
                      }}
                      className={outlineBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </SectionCard>
              )}

              {open === 'ask' && (
                <SectionCard title="What do you need from them?">
                  {actionError && (
                    <p role="alert" className={cn(alertBox, 'mb-3')}>
                      {actionError}
                    </p>
                  )}
                  <p className={cn(body, 'mb-3 text-ink/65')}>
                    Goes to their portal thread with you, and they are emailed that a message is waiting. The order
                    stays here, nothing is charged, and their reply comes back to you.
                  </p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    aria-label="Question for the patient"
                    placeholder="What dose of tadalafil are you on, and how long have you been taking it?"
                    className={textArea}
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button type="button" disabled={!note.trim() || busy !== null} onClick={ask} className={primaryBtn}>
                      {busy === 'ask' && <Spinner />}
                      {busy === 'ask' ? 'Sending…' : 'Send question'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(null);
                        setNote('');
                      }}
                      className={outlineBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </SectionCard>
              )}

              {open === 'decline' && (
                <SectionCard title="Reason for clinical decline" className="border-red-600/25 bg-red-50">
                  <p className={cn(body, 'mb-3 text-ink/65')}>
                    Write this to the patient. It goes to their portal thread with you and on their chart; the email
                    only tells them a message is waiting. Anything charged is refunded in full.
                  </p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    aria-label="Reason for clinical decline"
                    placeholder="Your blood pressure readings are too high for this treatment to be safe. Please see your primary physician, and we can revisit this once it is controlled."
                    className={cn(textArea, 'focus:ring-red-500/40')}
                  />
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={decline}
                      disabled={!note.trim() || busy !== null}
                      className={cn(
                        'inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-semibold transition-colors md:min-h-[34px]',
                        note.trim() && !busy ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-ink/10 text-ink/65',
                      )}
                    >
                      {busy === 'decline' && <Spinner />}
                      {busy === 'decline' ? 'Sending…' : 'Confirm decline'}
                    </button>
                    <button type="button" onClick={() => setOpen(null)} className={outlineBtn}>
                      Cancel
                    </button>
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {order.status === 'declined-clinical' && order.physicianNote && (
            <SectionCard title="Your decline reason">
              <p className={cn(body, 'whitespace-pre-wrap text-ink/85')}>{order.physicianNote}</p>
            </SectionCard>
          )}

          {review ? (
            <ReviewSections review={review} />
          ) : (
            <SectionCard title="Patient record">
              <p className={cn(body, 'text-ink/65')}>No intake on file for this order.</p>
            </SectionCard>
          )}

          {ACTIVE.includes(order.status) && <PostUpdate orderId={order.id} />}

          {order.updates && order.updates.length > 0 && (
            <SectionCard title="Case timeline">
              <Timeline updates={order.updates} />
            </SectionCard>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <SectionCard title="Patient">
            <p className="text-[16px] font-semibold text-ink md:text-[14px]">{order.memberName}</p>
            {review && (
              <p className={cn(body, 'text-ink/65')}>
                {[review.age !== '—' && `${review.age} yrs`, review.sex !== '—' && review.sex].filter(Boolean).join(' · ') || '—'}
              </p>
            )}
            <dl className="mt-2 [&_div]:text-[15px] md:[&_div]:text-[14px]">
              <InfoRow label="Email">{order.memberEmail || '—'}</InfoRow>
              <InfoRow label="State">{order.state || '—'}</InfoRow>
            </dl>
          </SectionCard>

          <SectionCard title="Order">
            {order.lines.map((l) => (
              <div key={l.productId} className="flex items-center gap-3 py-1">
                <div className="relative h-16 w-16 flex-none overflow-hidden rounded-thumb border border-ink/10 bg-milk">
                  {l.image && <Image src={l.image} alt={l.productName} fill priority sizes="64px" className="object-contain p-1" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink md:text-[14px]">{l.productName}</p>
                  <p className="text-[15px] text-ink/65 md:text-[14px]">
                    {l.cadenceLabel}
                    {l.quantity > 1 ? ` · ×${l.quantity}` : ''} {'·'} ${l.perCycle}
                  </p>
                </div>
              </div>
            ))}
            {/* The product price and the amount charged are different numbers.
                Showing only the second one invites the question this answers. */}
            <dl className="mt-3 border-t border-ink/10 pt-2">
              <Money label="Subtotal" value={order.subtotal} />
              {!!order.discount && (
                <Money label={`Discount${order.promoCode ? ` · ${order.promoCode}` : ''}`} value={-order.discount} />
              )}
              <Money label="Shipping" value={order.shippingCost} zeroLabel="Included" />
              <Money label="Estimated tax" value={order.tax} />
              <Money label={order.status === 'assigned' ? 'Charged on signing' : 'Total'} value={order.total} strong />
            </dl>
            {order.status !== 'assigned' && (
              <Link
                href={`/portal/admin/orders/${encodeURIComponent(order.id)}`}
                className="mt-3 inline-flex min-h-[44px] items-center text-[15px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink md:min-h-0 md:text-[14px]"
              >
                Open order page
              </Link>
            )}
          </SectionCard>

          {order.adminNote && (
            <SectionCard title="Admin note">
              <p className={cn(body, 'text-ink/85')}>{order.adminNote}</p>
            </SectionCard>
          )}

          <SectionCard title="Prescriber and thread">
            <dl className="[&_div]:text-[15px] md:[&_div]:text-[14px]">
              <InfoRow label="Prescriber">{doctorName}</InfoRow>
            </dl>
            <div className="mt-2">
              {thread ? (
                <ThreadChip status={thread} />
              ) : (
                <p className={cn(body, 'text-ink/65')}>No messages with this patient yet.</p>
              )}
            </div>
            {order.userId && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setOpen('message')} className={signBtn}>
                  Message patient
                </button>
                <Link
                  href={`/portal/doctor/messages?u=${encodeURIComponent(order.userId)}`}
                  className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink md:min-h-0 md:text-[14px]"
                >
                  Open in Messages
                </Link>
              </div>
            )}
          </SectionCard>
        </aside>
      </div>

      {open === 'change' && (
        <Modal
          wide
          title="Change prescription"
          subtitle="The order switches to what you pick. Your note, the change and the new price go to the patient; nothing is charged until you sign."
          onClose={() => {
            setOpen(null);
            setNote('');
            setActionError(null);
          }}
          footer={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {rxSame && <span className={cn(body, 'mr-auto text-ink/60')}>Pick a different product or plan.</span>}
              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  setNote('');
                }}
                className={outlineBtn}
              >
                Cancel
              </button>
              <button type="button" disabled={!note.trim() || !rxTier || rxSame || busy !== null} onClick={change} className={signBtn}>
                {busy === 'change' && <Spinner />}
                {busy === 'change' ? 'Changing…' : 'Change and tell the patient'}
              </button>
            </div>
          }
        >
          {actionError && (
            <p role="alert" className={cn(alertBox, 'mb-4')}>
              {actionError}
            </p>
          )}
          {/* Desktop: products scroll on the left, the choice (plan, note) stays in view on the right. */}
          <div className="md:grid md:grid-cols-[minmax(0,1fr)_340px] md:gap-6">
          <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink/55">1 · Product</p>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Search products</span>
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/50">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={rxQuery}
                onChange={(e) => setRxQuery(e.target.value)}
                placeholder="Search products…"
                className="h-11 w-full rounded-full bg-white pl-9 pr-4 text-[16px] text-ink ring-1 ring-ink/15 placeholder:text-ink/50 focus:outline-none focus:ring-2 focus:ring-ink/30 md:h-10 md:text-[14px]"
              />
            </label>
          </div>
          {(() => {
            const q = rxQuery.trim().toLowerCase();
            return q && !options.some((o) => o.name.toLowerCase().includes(q)) ? (
              <p className="rounded-inner bg-milk px-4 py-6 text-center text-[15px] text-ink/65">No product matches “{rxQuery.trim()}”.</p>
            ) : null;
          })()}
          <div role="radiogroup" aria-label="Product" className="grid grid-cols-3 gap-2.5 lg:grid-cols-4">
            {options.filter((o) => o.name.toLowerCase().includes(rxQuery.trim().toLowerCase())).map((o) => {
              const on = o.id === rxProduct;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setRxProduct(o.id);
                    setRxPlan(o.tiers.find((x) => x.key === rxPlan)?.key ?? o.tiers[0]?.key ?? '');
                    // Phone (one column): bring the plan and note into view.
                    if (window.matchMedia('(max-width: 767px)').matches) {
                      window.setTimeout(() => choiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
                    }
                  }}
                  className={cn(
                    'group flex flex-col overflow-hidden rounded-inner bg-white text-left ring-1 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
                    on ? 'ring-2 ring-ink shadow-[0_6px_20px_-10px_rgba(17,17,17,0.45)]' : 'ring-ink/12 hover:ring-ink/30',
                  )}
                >
                  <span className="relative block aspect-square w-full bg-milk" style={o.swatch && !o.shot ? { background: o.swatch } : undefined}>
                    {o.image && <Image src={o.image} alt="" fill sizes="(min-width: 1024px) 150px, 30vw" className="object-contain p-1.5" />}
                    {o.id === line?.productId && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-butter px-1.5 py-0.5 text-[11px] font-semibold text-ink">Ordered</span>
                    )}
                    {on && (
                      <span aria-hidden className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-[13px] text-white">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="px-2.5 py-2 text-[13px] font-semibold leading-snug text-ink">{o.name}</span>
                </button>
              );
            })}
          </div>

          </div>

          {/* The choice: sticky beside the grid on desktop, under it on a phone. */}
          <div ref={choiceRef} className="mt-6 scroll-mt-4 md:sticky md:top-0 md:mt-0 md:self-start">
          {(() => {
            const picked = options.find((o) => o.id === rxProduct);
            return (
              picked && (
                <div className="mb-5 flex items-center gap-3 rounded-inner bg-butter-soft p-3 ring-1 ring-butter-deep/40">
                  <span className="relative h-16 w-16 flex-none overflow-hidden rounded-thumb bg-milk" style={picked.swatch && !picked.shot ? { background: picked.swatch } : undefined}>
                    {picked.image && <Image src={picked.image} alt="" fill sizes="64px" className="object-contain p-1" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-ink/55">
                      {picked.id === line?.productId ? 'Ordered' : 'Switching to'}
                    </span>
                    <span className="block text-[16px] font-semibold leading-snug text-ink">{picked.name}</span>
                  </span>
                </div>
              )
            );
          })()}
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink/55">2 · Plan</p>
          <div role="radiogroup" aria-label="Plan" className="flex flex-wrap gap-2">
            {rxTiers.map((t) => {
              const on = t.key === rxTier?.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setRxPlan(t.key)}
                  className={cn(
                    'min-h-[44px] rounded-full px-4 text-[14px] font-semibold ring-1 transition-colors',
                    on ? 'bg-butter text-ink ring-butter-deep' : 'bg-white text-ink ring-ink/15 hover:bg-milk',
                  )}
                >
                  {t.label} · ${t.total.toLocaleString('en-US')}
                </button>
              );
            })}
          </div>

          <label className="mt-6 block">
            <span className="mb-2 block text-[13px] font-semibold uppercase tracking-[0.06em] text-ink/55">3 · Note to the patient</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="As we discussed, a lower strength suits you better to start. We can step up at your next refill."
              className={textArea}
            />
          </label>
          </div>
          </div>
        </Modal>
      )}

      {open === 'message' && order.userId && (
        <Modal
          title={`Message ${order.memberName}`}
          subtitle={`Tagged with ${orderRef(order.id)}. They're emailed that a message is waiting.`}
          onClose={() => {
            setOpen(null);
            setMsgError(null);
          }}
          footer={
            <div>
              {msgError && <p className={cn(alertBox, 'mb-2')}>{msgError}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={msgDraft}
                  onChange={(e) => setMsgDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={2}
                  aria-label="Message to the patient"
                  placeholder="Write to the patient…"
                  className={cn(textArea, 'flex-1')}
                />
                <button type="button" disabled={!msgDraft.trim() || msgBusy} onClick={sendMessage} className={signBtn}>
                  {msgBusy && <Spinner />}
                  {msgBusy ? 'Sending…' : 'Send'}
                </button>
              </div>
              <Link
                href={`/portal/doctor/messages?u=${encodeURIComponent(order.userId)}`}
                className="mt-3 inline-flex min-h-[44px] items-center text-[14px] font-semibold text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink md:min-h-0"
              >
                Open in Messages →
              </Link>
            </div>
          }
        >
          <MessageList messages={[...messages, ...sentMsgs]} />
        </Modal>
      )}

      {/* Phone and tablet: the decision stays in reach under the record. Sticky,
          not fixed, so it takes its own room at the end and never covers it. */}
      {pending && open === null && (
        <div className="sticky bottom-0 z-30 -mx-2 lg:hidden">
          <div className="flex items-center gap-2 border-t border-ink/10 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
            <button type="button" disabled={busy !== null} onClick={startSign} className={cn(signBtn, 'flex-1')}>
              Approve &amp; sign
            </button>
            <MoreMenu>
              {(close) => (
                <>
                  <MenuItem
                    disabled={busy !== null}
                    onClick={() => {
                      close();
                      setOpen('ask');
                    }}
                  >
                    Ask for more information
                  </MenuItem>
                  {options.length > 0 && (
                    <MenuItem
                      disabled={busy !== null}
                      onClick={() => {
                        close();
                        setOpen('change');
                      }}
                    >
                      Change prescription
                    </MenuItem>
                  )}
                  {order.userId && (
                    <MenuItem
                      onClick={() => {
                        close();
                        setOpen('message');
                      }}
                    >
                      Message patient
                    </MenuItem>
                  )}
                  {review?.photosRequestable && (
                    <MenuItem
                      disabled={busy !== null}
                      onClick={() => {
                        close();
                        requestPhotos();
                      }}
                    >
                      {busy === 'photos' ? 'Requesting…' : 'Request photos'}
                    </MenuItem>
                  )}
                  <MenuItem
                    danger
                    disabled={busy !== null}
                    onClick={() => {
                      close();
                      setOpen('decline');
                    }}
                  >
                    Decline
                  </MenuItem>
                </>
              )}
            </MoreMenu>
          </div>
        </div>
      )}
    </div>
  );
}

/** "More" on the phone bar: a menu that opens upward, closed by a tap outside or Escape. */
function MoreMenu({ children }: { children: (close: () => void) => React.ReactNode }) {
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
    <details ref={ref} className="relative flex-none">
      <summary className={cn(outlineBtn, 'cursor-pointer list-none text-[15px] [&::-webkit-details-marker]:hidden')}>More</summary>
      <div className="absolute bottom-full right-0 z-20 mb-2 w-64 overflow-hidden rounded-inner border border-ink/10 bg-white py-1 shadow-[0_12px_32px_-12px_rgba(17,17,17,0.3)]">
        {children(close)}
      </div>
    </details>
  );
}

function MenuItem({
  onClick,
  disabled,
  danger,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'block min-h-[48px] w-full px-4 py-2 text-left text-[15px] transition-colors hover:bg-milk disabled:opacity-50',
        danger ? 'text-red-700' : 'text-ink',
      )}
    >
      {children}
    </button>
  );
}

/** Update for member and care team on a signed case (was the Active case card's "Add update"). */
function PostUpdate({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async () => {
    if (!note.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await addOrderNoteAction(orderId, note.trim());
      if (res.ok) {
        setNote('');
        router.refresh();
      } else {
        setError(actionErrorText(res.error));
      }
    } catch {
      setError(actionErrorText());
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Post update" description="Update for member + care team.">
      <textarea
        rows={3}
        value={note}
        maxLength={2000}
        onChange={(e) => {
          setNote(e.target.value);
          setError(null);
        }}
        aria-label="Update for member and care team"
        placeholder="e.g. Pharmacy delayed by a day — shipment moves to Friday."
        className={textArea}
      />
      {error && (
        <p role="alert" className={cn(alertBox, 'mt-3')}>
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={post} disabled={!note.trim() || busy} className={primaryBtn}>
          {busy && <Spinner />}
          {busy ? 'Posting…' : 'Post update'}
        </button>
        {note && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setNote('');
              setError(null);
            }}
            className={outlineBtn}
          >
            Cancel
          </button>
        )}
      </div>
    </SectionCard>
  );
}

/** What a failed ask, photo request or note says. Nothing was sent when this shows. */
function actionErrorText(error?: string): string {
  if (error === 'no_patient') return 'This order has no patient account to message. Nothing was sent.';
  if (error === 'no_intake') return 'No intake on file to attach photos to. Nothing was sent.';
  if (error === 'not_authorized') return 'Your session has ended. Sign in again. Nothing was sent.';
  if (error === 'too_long') return 'That is too long. Shorten it and try again.';
  return 'Could not send that. Nothing was sent — try again.';
}

function Timeline({ updates }: { updates: Order['updates'] }) {
  if (!updates || updates.length === 0) return null;
  // Reverse so newest is at the top
  const ordered = [...updates].sort((a, b) => b.at - a.at);
  return (
    <ol className="space-y-3">
      {ordered.map((u) => (
        <li key={u.id} className="border-l-2 border-ink/10 pl-3">
          <div className="mb-0.5 flex flex-wrap items-center justify-between gap-x-2 text-[14px] text-ink/65 md:text-[13px]">
            <span className="text-ink/85">
              {u.author} · {u.role}
            </span>
            <span suppressHydrationWarning>{relativeTime(u.at)}</span>
          </div>
          <p className={cn(body, 'text-ink/85')}>{u.note}</p>
          {u.statusChange && (
            <p className="mt-1 text-[14px] font-medium text-ink/70 md:text-[13px]">Status · {STATUS_LABEL[u.statusChange]}</p>
          )}
        </li>
      ))}
    </ol>
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

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The record the prescriber decides on, open in full: on its own page there
 * is no queue to keep scannable. What was flagged leads, so nothing that
 * should change a decision sits below the fold unannounced.
 */
function ReviewSections({ review }: { review: PatientReview }) {
  // Every flagged answer, with where it came from, read first.
  const flags = [
    ...review.categories.flatMap((c) => c.items.map((i) => ({ ...i, where: c.title }))),
    ...review.safety.map((l) => ({ ...l, where: 'Safety screen' })),
    ...review.history.map((l) => ({ ...l, where: 'History' })),
    ...review.context.map((l) => ({ ...l, where: 'Before you sign' })),
  ].filter((l) => l.flag);

  return (
    <>
      <SectionCard title="Patient summary" className="border-butter-deep/50 bg-butter-soft">
        <Strip
          items={[
            ['Date of birth', review.dob],
            ['Age', review.age],
            ['Sex at birth', review.sex],
            ['Height / weight', review.body],
            ['Intake completed', review.submittedAt],
          ]}
        />
      </SectionCard>

      {flags.length > 0 ? (
        <SectionCard title={`Needs your attention (${flags.length})`} className="border-amber-600/25 bg-amber-50/60">
          <ul className="divide-y divide-amber-600/15">
            {flags.map((f) => (
              <li key={`${f.where}-${f.label}`} className="py-3 first:pt-0 last:pb-0">
                <p className="text-[13px] font-medium text-amber-900/70">{f.where}</p>
                <p className="mt-0.5 text-[15px] leading-snug text-ink/75">{f.label}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-[17px] font-semibold leading-snug text-amber-900 md:text-[16px]">{f.value}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : (
        <p className="rounded-inner border border-emerald-600/20 bg-emerald-50 px-4 py-2.5 text-[15px] text-emerald-900 md:text-[14px]">
          Nothing flagged in this assessment.
        </p>
      )}

      {review.categories.length > 0 && (
        <SectionCard title="Category answers">
          <CategoryAnswers sections={review.categories} />
        </SectionCard>
      )}

      <SectionCard title="Safety screen">
        <Answers lines={review.safety} />
      </SectionCard>
      <SectionCard title="History">
        <Answers lines={review.history} />
      </SectionCard>
      <SectionCard title="Before you sign">
        <Answers lines={review.context} />
      </SectionCard>
      <SectionCard title="Patient contact">
        <Answers lines={review.contact} />
      </SectionCard>
    </>
  );
}

/** Short facts, read across in one line rather than stacked into rows. */
function Strip({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-inner bg-white/80 px-3.5 py-2.5 ring-1 ring-butter-deep/30">
          <div className="text-[13px] font-medium text-ink/65">{label}</div>
          <div className="mt-0.5 text-[18px] font-semibold tabular-nums text-ink">{value}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Question above answer, left-aligned, like a chart: the eye reads down, never
 * across a wide card. Short answers pair up two to a row on wide screens; long
 * ones (free text) take the full width. A flagged answer is tinted and tagged
 * where it sits, as well as in "Needs your attention".
 */
function Answers({ lines }: { lines: { label: string; value: string; flag?: boolean }[] }) {
  return <AnswerGrid items={lines} />;
}

function Money({ label, value, strong, zeroLabel }: { label: string; value: number; strong?: boolean; zeroLabel?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1', strong && 'mt-1 border-t border-ink/10 pt-2')}>
      <dt className={cn('text-[15px] md:text-[14px]', strong ? 'font-semibold text-ink' : 'text-ink/60')}>{label}</dt>
      <dd className={cn('tabular-nums text-[15px] md:text-[14px]', strong ? 'font-semibold text-ink' : 'text-ink/85')}>
        {value === 0 && zeroLabel ? zeroLabel : `${value < 0 ? '−' : ''}$${Math.abs(value)}`}
      </dd>
    </div>
  );
}

/**
 * Question and answer as a tile: the question small, the answer large, so the
 * eye reads the answers down the page. Short answers sit two to a row; long
 * ones span. A flagged answer is amber and tagged where it sits.
 */
export function AnswerGrid({ items }: { items: { label: string; value: string; flag?: boolean }[] }) {
  return (
    <dl className="grid gap-2.5 sm:grid-cols-2">
      {items.map((l) => (
        <div
          key={l.label}
          className={cn(
            'rounded-inner px-4 py-3',
            l.value.length > 40 && 'sm:col-span-2',
            l.flag ? 'bg-amber-50 ring-1 ring-amber-600/30' : 'bg-milk',
          )}
        >
          <dt className="flex items-start justify-between gap-3 text-[14px] leading-snug text-ink/65">
            <span>{l.label}</span>
            {l.flag && <ReviewChip />}
          </dt>
          <dd className={cn('mt-1 whitespace-pre-wrap break-words text-[17px] font-semibold leading-snug', l.flag ? 'text-amber-900' : 'text-ink')}>
            {l.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A centred pop-up over the record: Esc or the backdrop closes it, the page behind stops scrolling.
 * Portalled to <body>: the portal's route animation transforms the content column, which would
 * make `fixed` relative to the page instead of the screen.
 */
function Modal({
  title,
  subtitle,
  onClose,
  footer,
  wide = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  /** Room for a two-column body (Change prescription). */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn('flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl focus:outline-none sm:rounded-[24px]', wide ? 'max-w-6xl' : 'max-w-3xl')}
      >
        <div className="flex items-start gap-3 border-b border-ink/10 bg-butter-soft px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-semibold leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-[14px] leading-snug text-ink/70">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 flex-none place-items-center rounded-full bg-white text-ink ring-1 ring-ink/10 hover:bg-milk"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-ink/10 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** His thread with the patient, newest at the bottom; order tags shown as tags. */
function MessageList({ messages }: { messages: PortalMessage[] }) {
  const end = useRef<HTMLDivElement>(null);
  // Braces on purpose: newer browsers return a Promise from scrollIntoView, and React would call it as a cleanup.
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);
  if (!messages.length) {
    return <p className="py-8 text-center text-[15px] text-ink/60">No messages with this patient yet. Write the first one below.</p>;
  }
  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const mine = m.senderRole !== 'member';
        const tag = m.body.match(/^About order #(\d+)(?: \(([^)]*)\))?:\s*/);
        return (
          <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-[18px] px-4 py-2.5', mine ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-milk text-ink')}>
              {tag && (
                <span className={cn('mb-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold', mine ? 'bg-white/15' : 'bg-white')}>
                  Order #{tag[1]}
                  {tag[2] ? ` · ${tag[2]}` : ''}
                </span>
              )}
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{tag ? m.body.slice(tag[0].length) : m.body}</p>
              <span className={cn('mt-1 block text-[12px] tabular-nums', mine ? 'text-white/60' : 'text-ink/55')}>
                {new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}
