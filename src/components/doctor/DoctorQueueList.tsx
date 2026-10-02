'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useOrders } from '@/components/orders/OrdersProvider';
import { addOrderNoteAction, requestInfoFromPatientAction, requestPhotosAction } from '@/lib/orders-db';
import { waited } from '@/lib/order-health';
import { STATUS_LABEL, type Order } from '@/lib/orders';
import { cn } from '@/lib/utils';
import type { PatientReview } from '@/lib/clinical-review';
import { orderRef } from '@/lib/format';
import { categoryFlagCount, type ThreadStatus } from '@/lib/prescriber-view';
import { CategoryAnswers, ReviewChip, ThreadChip } from '@/components/doctor/CategoryAnswers';

interface DoctorQueueListProps {
  doctorName: string;
  /** True while the password given at the last signature is still good. */
  signWindowOpen: boolean;
  /** The intake behind each waiting order, keyed by order number. */
  reviews: Record<string, PatientReview>;
  /** Doctor-thread state per patient (user id): waiting on them, or they replied. */
  threads: Record<string, ThreadStatus>;
  /** Approved default directions per product id (Admin → Products), to prefill the sig. */
  defaultSigs: Record<string, string>;
}

export function DoctorQueueList({
  doctorName,
  reviews,
  signWindowOpen,
  threads,
  defaultSigs,
}: DoctorQueueListProps) {
  const [filter, setFilter] = useState<'all' | 'waiting'>('all');
  const { orders, clinicalQueue, activeClinicalCases, recentClinicalCases } =
    useOrders();

  // One medical director handles every case — no per-physician routing.
  // Oldest first: the case that has waited longest is the one to sign next.
  const allQueue = [...clinicalQueue()].sort((a, b) => a.placedAt - b.placedAt);
  const isWaiting = (o: Order) => threads[o.userId ?? '']?.state === 'waiting';
  const waitingCount = allQueue.filter(isWaiting).length;
  const queue = filter === 'waiting' ? allQueue.filter(isWaiting) : allQueue;
  const active = activeClinicalCases();
  const recent = recentClinicalCases(4);

  // Cases handled (signed onward) — shown as a stat.
  const handled = orders.filter((o) =>
    [
      'signed',
      'declined-clinical',
      'compounding',
      'shipped',
      'delivered',
    ].includes(o.status),
  );

  return (
    <>
      <div className="grid gap-3 mb-8 sm:grid-cols-3">
        <Metric
          label="Awaiting my review"
          value={String(allQueue.length)}
          tone="blue"
        />
        <Metric
          label="Active cases"
          value={String(active.length)}
          tone="accent"
        />
        <Metric
          label="Handled total"
          value={String(handled.length)}
          tone="neutral"
        />
      </div>

      {/* === AWAITING REVIEW === */}
      <section>
        <SectionHeader
          eyebrow="Awaiting review"
          title="Sign or decline"
          count={queue.length}
        />
        <div role="group" aria-label="Filter queue" className="mb-4 flex flex-wrap gap-1.5">
          {(
            [
              ['all', `All · ${allQueue.length}`],
              ['waiting', `Waiting on patient · ${waitingCount}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                'min-h-[36px] rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors',
                filter === key ? 'bg-ink text-white' : 'bg-milk text-ink hover:bg-milk-deep',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {queue.length === 0 ? (
          <EmptySection
            title={filter === 'waiting' ? 'Nobody to wait on' : 'Queue is clear'}
            body={
              filter === 'waiting'
                ? 'Cases you have asked a question on appear here until the patient replies.'
                : 'New orders appear here as soon as a member checks out.'
            }
          />
        ) : (
          <div className="space-y-3">
            {queue.map((o) => (
              <DoctorQueueRow
                key={o.id}
                order={o}
                doctorName={doctorName}
                signWindowOpen={signWindowOpen}
                review={reviews[o.id]}
                thread={threads[o.userId ?? '']}
                defaultSig={defaultSigs[o.lines[0]?.productId ?? ''] ?? ''}
              />
            ))}
          </div>
        )}
      </section>

      {/* === ACTIVE CASES === */}
      <section>
        <SectionHeader
          eyebrow="Active cases"
          title="Manage post-sign"
          count={active.length}
        />
        {active.length === 0 ? (
          <EmptySection
            title="Nothing to manage"
            body="Cases you've signed appear here until they are delivered. Placing, tracking and delivery are marked on Orders."
          />
        ) : (
          <div className="space-y-3">
            {active.map((o) => (
              <ActiveCaseRow key={o.id} order={o} />
            ))}
          </div>
        )}
      </section>

      {/* === RECENT === */}
      {recent.length > 0 && (
        <section>
          <SectionHeader
            eyebrow="Recent"
            title="Closed cases"
            count={recent.length}
          />
          <div className="space-y-3">
            {recent.map((o) => (
              <RecentCaseRow key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SectionHeader({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <p className="text-[13px] font-medium text-ink/65">
          {eyebrow}
        </p>
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
          {title}
        </h2>
      </div>
      <span className="text-[13px] text-ink/65">
        {count} {count === 1 ? 'case' : 'cases'}
      </span>
    </div>
  );
}

function EmptySection({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-shell bg-milk p-8 text-center">
      <h3 className="mb-1 text-[17px] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h3>
      <p className="text-xs text-ink/65 leading-relaxed max-w-md mx-auto">
        {body}
      </p>
    </div>
  );
}

function DoctorQueueRow({
  order,
  doctorName,
  signWindowOpen,
  review,
  thread,
  defaultSig,
}: {
  order: Order;
  doctorName: string;
  signWindowOpen: boolean;
  review?: PatientReview;
  thread?: ThreadStatus;
  defaultSig: string;
}) {
  const catFlags = review ? categoryFlagCount(review.categories) : 0;
  const { signRx, declineClinical } = useOrders();
  const router = useRouter();
  const [open, setOpen] = useState<null | 'sign' | 'decline' | 'ask'>(null);
  const [note, setNote] = useState('');
  const [password, setPassword] = useState('');
  // The sig, prefilled with the directions he approved for this product.
  const [directions, setDirections] = useState(defaultSig);
  const [signError, setSignError] = useState<string | null>(null);
  // Starts from the server's view, and opens if the ten minutes ran out while he read.
  const [needPassword, setNeedPassword] = useState(!signWindowOpen);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'sign' | 'decline' | 'ask' | 'photos'>(null);
  const hoursWaiting = Math.max(0, Math.floor((Date.now() - order.placedAt) / 3_600_000));

  return (
    <article className="rounded-shell bg-milk p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4 min-w-0 flex-1">
          {order.lines[0] && (
            <div
              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-thumb border border-ink/10"
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
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-ink/65">
              <span className="text-ink/80">
                {orderRef(order.id)}
              </span>
              <span>·</span>
              <span>{order.state}</span>
              <span>·</span>
              <span className={cn(hoursWaiting >= 24 && 'font-medium text-red-700')}>
                waiting {waited(hoursWaiting)}
              </span>
            </div>
            <h2 className="text-base md:text-[20px] font-semibold tracking-[-0.03em] text-ink">
              {order.memberName}
            </h2>
            <p className="text-sm text-ink/85 mt-0.5">
              {order.lines
                .map((l) => `${l.productName} (${l.cadenceLabel})`)
                .join(' + ')}
            </p>

            {order.adminNote && (
              <div className="mt-3 rounded-inner border border-ink/10 bg-white p-3">
                <div className="text-[12px] text-ink/65 mb-1">
                  Admin note
                </div>
                <p className="text-xs text-ink/85 leading-relaxed">
                  {order.adminNote}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 md:flex-shrink-0 md:flex-col md:items-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-600/25 bg-sky-50 text-sky-800 px-2.5 py-1 text-[12px]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            Awaiting my review
          </span>
          {catFlags > 0 && (
            <ReviewChip>
              {catFlags} {catFlags === 1 ? 'answer' : 'answers'} to review
            </ReviewChip>
          )}
          {review?.photosPending && <ReviewChip>Photos pending</ReviewChip>}
          <ThreadChip status={thread} />
        </div>
      </div>

      {review && <ReviewPanel review={review} order={order} />}

      {actionError && open === null && (
        <p role="alert" className="mt-5 rounded-inner border border-red-600/20 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {actionError}
        </p>
      )}

      {open === null && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-5">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setSignError(null);
              setPassword('');
              setOpen('sign');
            }}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
          >
            Approve &amp; sign prescription
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setOpen('ask')}
            className="rounded-full bg-white px-5 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25 disabled:opacity-60"
          >
            Ask for more information
          </button>
          {/* Photos are never required up front; he asks when he needs them. */}
          {review?.photosRequestable && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={async () => {
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
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25 disabled:opacity-60"
            >
              {busy === 'photos' && <Spinner />}
              {busy === 'photos' ? 'Requesting…' : 'Request photos'}
            </button>
          )}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setOpen('decline')}
            className="rounded-full border border-red-600/20 bg-red-50 px-5 py-2 text-[13px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60 sm:ml-auto"
          >
            Decline
          </button>
        </div>
      )}

      {open === 'sign' && (
        <div className="mt-5 rounded-inner border border-butter-deep bg-butter-soft p-4 md:p-5">
          <div className="mb-3 text-[13px] font-semibold text-ink">
            Sign the prescription
          </div>
          <p className="mb-4 text-sm leading-relaxed text-ink/75">
            Signing writes the prescription under your licence, charges{' '}
            <span className="font-semibold text-ink">
              ${order.total.toFixed(2)}
            </span>{' '}
            to the card on file and releases the order to the pharmacy.
          </p>
          <label
            htmlFor={`sig-${order.id}`}
            className="mb-1.5 block text-[13px] font-medium text-ink/70"
          >
            Directions
          </label>
          <p className="mb-2 text-xs leading-relaxed text-ink/65">
            Printed on the label. The pharmacist verifies the compound against
            them, and every refill on this prescription ships with them.
          </p>
          <textarea
            id={`sig-${order.id}`}
            value={directions}
            onChange={(e) => {
              setDirections(e.target.value);
              setSignError(null);
            }}
            rows={2}
            maxLength={1000}
            required
            placeholder="e.g. Inject 0.25 mL (50 mg) subcutaneously twice weekly."
            className="mb-4 w-full resize-none rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30"
          />

          {!needPassword ? (
            <p className="text-xs leading-relaxed text-ink/65">
              Your password is still good for a few more minutes, so you are not
              asked again for this one.
            </p>
          ) : (
            <>
              <p className="mb-4 text-xs leading-relaxed text-ink/65">
                Your password is required again here. A session left open is not
                evidence that you are the one signing. It then holds for ten
                minutes, so a morning&apos;s queue is one password.
              </p>

              <label
                htmlFor={`pw-${order.id}`}
                className="mb-1.5 block text-[13px] font-medium text-ink/70"
              >
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
                className="w-full rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30"
              />
            </>
          )}

          {signError && (
            <p className="mt-3 rounded-inner border border-red-600/20 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {signError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={(!password && needPassword) || !directions.trim() || busy !== null}
              onClick={async () => {
                if ((!password && needPassword) || !directions.trim() || busy) return;
                setBusy('sign');
                setSignError(null);
                try {
                  const res = await signRx(order.id, doctorName, password, directions.trim());
                  if (res.ok) {
                    setOpen(null);
                    setPassword('');
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
                            : 'Could not sign. Nothing was charged — try again.',
                    );
                    if (res.error === 'bad_password') setNeedPassword(true);
                  }
                } finally {
                  setBusy(null);
                }
              }}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-40"
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
              className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {open === 'ask' && (
        <div className="mt-5 rounded-inner border border-ink/10 bg-white p-4 md:p-5">
          <div className="mb-2 text-[13px] font-medium text-ink/65">
            What do you need from them?
          </div>
          {actionError && (
            <p role="alert" className="mb-3 rounded-inner border border-red-600/20 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {actionError}
            </p>
          )}
          <p className="mb-3 text-xs leading-relaxed text-ink/65">
            Goes to their portal thread with you, and they are emailed that a message is waiting. The order
            stays here, nothing is charged, and their reply comes back to you.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What dose of tadalafil are you on, and how long have you been taking it?"
            className="w-full resize-none rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!note.trim() || busy !== null}
              onClick={async () => {
                if (!note.trim() || busy) return;
                setBusy('ask');
                setActionError(null);
                try {
                  const res = await requestInfoFromPatientAction(
                    order.id,
                    note.trim(),
                  );
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
              }}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-40"
            >
              {busy === 'ask' && <Spinner />}
              {busy === 'ask' ? 'Sending…' : 'Send question'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                setNote('');
              }}
              className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {open === 'decline' && (
        <div className="mt-5 rounded-inner border border-red-600/20 bg-red-50 p-4 md:p-5">
          <div className="mb-3 text-[13px] font-semibold text-red-700">
            Reason for clinical decline
          </div>
          <p className="mb-3 text-xs leading-relaxed text-ink/65">
            Write this to the patient. It goes to their portal thread with you
            and on their chart; the email only tells them a message is waiting.
            Anything charged is refunded in full.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Your blood pressure readings are too high for this treatment to be safe. Please see your primary physician, and we can revisit this once it is controlled."
            className="w-full resize-none rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-red-500/40"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!note.trim() || busy) return;
                setBusy('decline');
                try {
                  await declineClinical(order.id, doctorName, note.trim());
                  setOpen(null);
                } finally {
                  setBusy(null);
                }
              }}
              disabled={!note.trim() || busy !== null}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold transition-colors',
                note.trim() && !busy
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-ink/10 text-ink/65',
              )}
            >
              {busy === 'decline' && <Spinner />}
              {busy === 'decline' ? 'Sending…' : 'Confirm decline'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-full bg-milk px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-milk-deep"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'accent' | 'neutral';
}) {
  return (
    <div className={cn('rounded-shell p-4', tone === 'accent' ? 'bg-butter-soft' : 'bg-milk')}>
      <div className="mb-1.5 text-[13px] font-medium text-ink/65">
        {label}
      </div>
      <div
        className={cn(
          'text-[28px] font-semibold tracking-[-0.04em] tabular-nums',
          tone === 'blue' && 'text-sky-800',
          tone !== 'blue' && 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// Active case row: signed and not yet delivered. Read-only on status:
// placing, tracking and delivery are marked on Orders, which checks payment.
// ============================================================================

function ActiveCaseRow({ order }: { order: Order }) {
  const router = useRouter();
  const [writing, setWriting] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async () => {
    if (!note.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await addOrderNoteAction(order.id, note.trim());
      if (res.ok) {
        setWriting(false);
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
    <article className="rounded-shell bg-milk p-5 md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4 min-w-0 flex-1">
          {order.lines[0] && (
            <div
              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-thumb border border-ink/10"
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
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-ink/65">
              <span className="text-ink/80">
                {orderRef(order.id)}
              </span>
              <span>·</span>
              <span>{order.state}</span>
            </div>
            <h2 className="text-base md:text-[20px] font-semibold tracking-[-0.03em] text-ink">
              {order.memberName}
            </h2>
            <p className="text-sm text-ink/85 mt-0.5">
              {order.lines.map((l) => l.productName).join(' + ')}
            </p>
            {order.tracking && (
              <p className="mt-2 text-xs text-ink/65 break-all">
                {order.carrier} · {order.tracking}
              </p>
            )}
          </div>
        </div>

        <div className="md:text-right md:flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-50 text-emerald-800 px-2.5 py-1 text-[12px]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      {!writing && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-5">
          <button
            type="button"
            onClick={() => setWriting(true)}
            className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25"
          >
            Add update
          </button>
          <button
            type="button"
            onClick={() => setShowTimeline((v) => !v)}
            className="ml-auto text-[12px] text-ink/65 hover:text-ink transition-colors"
          >
            {showTimeline ? 'Hide timeline ↑' : 'Timeline ↓'}
          </button>
        </div>
      )}

      {writing && (
        <div className="mt-5 rounded-inner border border-ink/10 bg-white p-4 md:p-5">
          <div className="mb-3 text-[13px] font-medium text-ink/65">
            Update for member + care team
          </div>
          <textarea
            rows={3}
            value={note}
            maxLength={2000}
            onChange={(e) => {
              setNote(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Pharmacy delayed by a day — shipment moves to Friday."
            className="w-full resize-none rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30"
          />
          {error && (
            <p role="alert" className="mt-3 rounded-inner border border-red-600/20 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={post}
              disabled={!note.trim() || busy}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold transition-colors',
                note.trim() && !busy
                  ? 'bg-ink text-white hover:bg-ink/85'
                  : 'bg-ink/10 text-ink/65',
              )}
            >
              {busy && <Spinner />}
              {busy ? 'Posting…' : 'Post update'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setWriting(false);
                setNote('');
                setError(null);
              }}
              className="rounded-full bg-milk px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-milk-deep"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline (collapsible) */}
      {showTimeline && order.updates && order.updates.length > 0 && (
        <div className="mt-5 border-t border-ink/10 pt-5">
          <div className="mb-3 text-[13px] font-medium text-ink/65">
            Case timeline
          </div>
          <Timeline updates={order.updates} />
        </div>
      )}
    </article>
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

function RecentCaseRow({ order }: { order: Order }) {
  return (
    <div className="flex items-center gap-4 rounded-shell bg-milk p-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink truncate">
          {order.memberName}{' '}
          <span className="text-ink/65 font-normal">
            · {order.state}
          </span>
        </div>
        <div className="text-xs text-ink/65 mt-0.5">
          {order.lines.map((l) => l.productName).join(' + ')}
        </div>
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] flex-shrink-0',
          order.status === 'delivered'
            ? 'bg-ink/5 text-ink/65 border-ink/10'
            : 'bg-red-50 text-red-700 border-red-600/25',
        )}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
        {STATUS_LABEL[order.status]}
      </span>
    </div>
  );
}

function Timeline({ updates }: { updates: Order['updates'] }) {
  if (!updates || updates.length === 0) return null;
  // Reverse so newest is at the top
  const ordered = [...updates].sort((a, b) => b.at - a.at);
  return (
    <ol className="space-y-3">
      {ordered.map((u) => (
        <li
          key={u.id}
          className="rounded-inner border border-ink/10 bg-white p-3"
        >
          <div className="mb-1 flex items-center justify-between gap-2 text-[12px] text-ink/65">
            <span className="text-ink/85">
              {u.author} · {u.role}
            </span>
            <span>{relativeTime(u.at)}</span>
          </div>
          <p className="text-sm text-ink/85 leading-relaxed">{u.note}</p>
          {u.statusChange && (
            <p className="mt-1.5 text-[12px] font-medium text-ink/70">
              Status · {STATUS_LABEL[u.statusChange]}
            </p>
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
    <svg
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The record the prescriber decides on.
 *
 * Open by default, because a collapsed record is one people sign past, but
 * collapsible so a queue of ten stays navigable. Labels sit above their values
 * rather than across a stretched row — a question pinned left with its answer
 * pinned right leaves a gap wide enough to read the wrong line.
 */
function ReviewPanel({
  review,
  order,
}: {
  review: PatientReview;
  order: Order;
}) {
  /*
   * Closed to start. With ten cases waiting, ten open records is a page nobody
   * can scan — and the header carries what was flagged, so nothing that should
   * change a decision is hidden behind the click.
   */
  const [open, setOpen] = useState(false);

  const flags = [
    ...review.categories.flatMap((c) => c.items),
    ...review.safety,
    ...review.history,
    ...review.context,
  ].filter((l) => l.flag);
  const summary =
    flags.length === 0
      ? 'Nothing flagged'
      : `${flags.length} to weigh — ${flags.map((f) => f.label).join(', ')}`;

  return (
    <section className="mt-5 overflow-hidden rounded-shell bg-milk">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 bg-white px-4 py-2.5 text-left transition-colors hover:bg-ink/[0.04]"
      >
        <span className="flex-none text-[12px] text-ink/60">
          {open ? 'Hide record' : 'Patient record'}
        </span>
        {!open && (
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-xs',
              flags.length ? 'text-amber-800' : 'text-ink/60',
            )}
          >
            {summary}
          </span>
        )}
        <span
          aria-hidden
          className={cn(
            'ml-auto flex-none rounded-full border border-ink/10 p-1 text-ink/60 transition-transform',
            open && 'rotate-180',
          )}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <>
          <Strip
            items={[
              ['Date of birth', review.dob],
              ['Age', review.age],
              ['Sex at birth', review.sex],
              ['Height / weight', review.body],
              ['Intake completed', review.submittedAt],
            ]}
          />

          {review.categories.length > 0 && (
            <Group title="Category answers">
              <CategoryAnswers sections={review.categories} />
            </Group>
          )}

          <Group title="Safety screen">
            <Answers lines={review.safety} />
          </Group>

          <Group title="History">
            <Answers lines={review.history} />
          </Group>

          <Group title="Before you sign">
            <Answers lines={review.context} />
          </Group>

          <Group title="Patient contact">
            <Answers lines={review.contact} />
          </Group>

          <Group title="What they ordered">
            <div className="grid gap-2 sm:grid-cols-2">
              {order.lines.map((l) => (
                <Cell
                  key={l.productId}
                  label={l.productName}
                  value={`${l.cadenceLabel}${
                    l.quantity > 1 ? ` \u00b7 \u00d7${l.quantity}` : ''
                  } \u00b7 $${l.perCycle}`}
                />
              ))}
            </div>

            {/* The product price and the amount charged are different numbers.
                Showing only the second one invites the question this answers. */}
            <dl className="mt-3 rounded-inner border border-ink/10 bg-white px-3 py-2.5">
              <Money label="Subtotal" value={order.subtotal} />
              {!!order.discount && (
                <Money
                  label={`Discount${order.promoCode ? ` · ${order.promoCode}` : ''}`}
                  value={-order.discount}
                />
              )}
              <Money
                label="Shipping"
                value={order.shippingCost}
                zeroLabel="Included"
              />
              <Money label="Estimated tax" value={order.tax} />
              <Money label="Charged on signing" value={order.total} strong />
            </dl>
          </Group>
        </>
      )}
    </section>
  );
}

/** Short facts, read across in one line rather than stacked into rows. */
function Strip({ items }: { items: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-x-7 gap-y-2.5 border-t border-ink/10 px-4 py-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <div className="text-[12px] text-ink/65">
            {label}
          </div>
          <div className="mt-0.5 text-sm font-semibold text-ink">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-ink/10 px-4 py-3">
      <div className="mb-2 text-[13px] font-medium text-ink/65">
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Answers in two columns.
 *
 * A question pinned to the left of a wide card with its answer pinned to the
 * right leaves the eye crossing half a screen per line, and a screen's worth
 * of scrolling for ten of them. Paired into narrow cells they sit next to each
 * other, and the panel is half as tall. Anything long breaks out to full width,
 * because free text is read rather than scanned.
 */
function Answers({
  lines,
}: {
  lines: { label: string; value: string; flag?: boolean }[];
}) {
  return (
    <div className="grid gap-x-8 gap-y-0 md:grid-cols-2">
      {lines.map((l) => {
        const long = l.value.length > 22;
        return (
          <div
            key={l.label}
            className={cn(
              'flex items-baseline justify-between gap-3 border-b border-ink/[0.06] py-1.5 last:border-0',
              long && 'md:col-span-2 md:flex-col md:items-start md:gap-0.5',
            )}
          >
            <span
              className={cn(
                'text-[13px] leading-snug',
                l.flag ? 'text-ink/80' : 'text-ink/70',
              )}
            >
              {l.label}
            </span>
            <span
              className={cn(
                'flex-none text-[13px] font-semibold leading-snug',
                long && 'md:w-full',
                l.flag ? 'text-amber-800' : 'text-ink/90',
              )}
            >
              {l.flag && !long && (
                <span
                  aria-hidden
                  className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-amber-500 align-middle"
                />
              )}
              {l.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Money({
  label,
  value,
  strong,
  zeroLabel,
}: {
  label: string;
  value: number;
  strong?: boolean;
  zeroLabel?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-1',
        strong && 'mt-1 border-t border-ink/10 pt-2',
      )}
    >
      <dt
        className={cn(
          'text-[13px]',
          strong ? 'font-semibold text-ink' : 'text-ink/60',
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          'tabular-nums text-[13px]',
          strong ? 'font-semibold text-ink' : 'text-ink/85',
        )}
      >
        {value === 0 && zeroLabel
          ? zeroLabel
          : `${value < 0 ? '−' : ''}$${Math.abs(value)}`}
      </dd>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-inner border border-ink/10 bg-white px-3 py-2">
      <div className="text-[12px] text-ink/65">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-semibold text-ink/90">
        {value}
      </div>
    </div>
  );
}
