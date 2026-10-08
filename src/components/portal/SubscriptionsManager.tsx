'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  EmptyState,
  StatusChip,
  btnCta,
  btnPrimary,
  btnSecondary,
  inset,
  panel,
  type Tone,
} from '@/components/portal/ui';
import {
  changeSubscriptionPlanAction,
  setSubscriptionStatusAction,
  skipNextCycleAction,
  type PlanKey,
} from '@/lib/subscriptions-db';
import { useConfirm } from '@/components/ui/useConfirm';
import { addMonthsIso, cadenceOfLabel, monthsPerCycle } from '@/lib/order-rules';
import { shortDate } from '@/lib/member-view';

export interface Subscription {
  id: string;
  productId: string;
  productName: string;
  cycleLabel: string;
  cadenceLabel: string;
  /** What each renewal charges (per_cycle_cents), whole dollars. Per cycle, despite the name. */
  perMonth: number;
  /** 'Oct 30, 2026' for display, and the stored 'YYYY-MM-DD'. */
  nextBillingDate: string;
  nextBillingIso: string | null;
  /** 12-month plans: when the paid second box ships ('YYYY-MM-DD'), null once it has. */
  nextShipmentIso?: string | null;
  /** Straight from the database. The page re-renders after every action. */
  status: Status;
  image: string;
  swatch: string;
  /** Paused because a refill's card was declined (a REFILL_CHARGE_FAILED order), not by the member. */
  declined?: boolean;
  /** Plans this one can switch to, priced per cycle as changeSubscriptionPlanAction prices them. */
  tiers: { key: PlanKey; label: string; perCycle: number }[];
}

type Status = 'active' | 'paused' | 'pending-review' | 'canceled';

const STATUS_THEME: Record<Status, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  paused: { label: 'Paused', tone: 'warn' },
  'pending-review': { label: 'Renewal needed', tone: 'warn' },
  canceled: { label: 'Cancelled', tone: 'muted' },
};

/** The plan key a stored cadence label ('Monthly', 'Quarterly', '6-month', '12-month') stands for. */
const planOf = (label: string) => cadenceOfLabel(label, 'monthly') as PlanKey;
const PER: Record<PlanKey, string> = { monthly: '/mo', quarterly: '/3 mo', sixMonth: '/6 mo', annual: '/yr' };
const EVERY: Record<PlanKey, string> = {
  monthly: 'every month',
  quarterly: 'every 3 months',
  sixMonth: 'every 6 months',
  annual: 'billed yearly · ships every 6 months',
};

const CANCEL_REASONS = [
  'It’s too expensive',
  'I’m not seeing results',
  'Side effects',
  'I have enough for now',
  'I’m switching treatments',
  'Something else',
];

type ActionResult = { ok: boolean; error?: string };

/** A bottom sheet on phones, a centred dialog above. Native <dialog>: focus trap and Escape come free. */
function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-shell bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink shadow-[0_24px_60px_-24px_rgba(17,17,17,0.45)] backdrop:bg-ink/40 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-shell sm:p-8"
    >
      {open && children}
    </dialog>
  );
}

const sheetTitle = 'text-[24px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink [text-wrap:balance]';
const sheetCopy = 'mt-2 text-[16px] leading-relaxed text-ink-soft';
const choice =
  'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-inner bg-milk px-4 py-3 text-[16px] text-ink ring-1 ring-transparent transition-colors has-[:checked]:bg-butter-soft has-[:checked]:ring-butter-deep';

export function SubscriptionsManager({ subscriptions }: { subscriptions: Subscription[] }) {
  /*
   * Only the server's word counts: every change waits on its action, and the
   * page re-renders from the database afterwards (revalidatePath).
   */
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [confirm, confirmDialog] = useConfirm();
  // Change plan: which plan is open, and the cadence picked.
  const [changing, setChanging] = useState<{ sub: Subscription; pick: PlanKey } | null>(null);
  // Cancel: why → pause instead? → confirm.
  const [cancelling, setCancelling] = useState<{ sub: Subscription; step: 'why' | 'pause' | 'confirm'; reason: string } | null>(
    null,
  );

  const run = async (id: string, action: () => Promise<ActionResult>, done: string) => {
    setBusy(id);
    setNotice((n) => ({ ...n, [id]: { ok: true, text: '' } }));
    let res: ActionResult;
    try {
      res = await action();
    } catch {
      res = { ok: false };
    }
    setNotice((n) => ({
      ...n,
      [id]: res.ok ? { ok: true, text: done } : { ok: false, text: res.error ?? 'That did not go through. Please try again.' },
    }));
    setBusy(null);
  };

  const setStatus = (s: Subscription, to: 'active' | 'paused' | 'canceled', done: string) =>
    run(s.id, () => setSubscriptionStatusAction(s.id, to), done);

  /** Where the next refill lands after a skip: one cycle of the plan they are on (as skipNextCycleAction does). */
  const afterSkip = (s: Subscription) =>
    s.nextBillingIso ? addMonthsIso(s.nextBillingIso, monthsPerCycle(cadenceOfLabel(s.cadenceLabel, 'monthly'))) : null;

  const skip = async (s: Subscription) => {
    const to = afterSkip(s);
    const ok = await confirm({
      title: `Skip your next ${s.productName} refill?`,
      body: `You won’t be charged or shipped on ${shortDate(s.nextBillingIso ?? '')}.${to ? ` Your next refill moves to ${shortDate(to)}.` : ''}`,
      confirmLabel: 'Skip this refill',
      cancelLabel: 'Keep it',
    });
    if (ok) void run(s.id, () => skipNextCycleAction(s.id), to ? `Skipped. Next refill ${shortDate(to)}.` : 'Next refill skipped.');
  };

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        action={
          <Link href="/shop" className={btnPrimary}>
            Browse the shop
          </Link>
        }
      >
        You have no plans yet. When Dr. Elder approves a treatment, its plan shows here.
      </EmptyState>
    );
  }

  return (
    <>
      <div className="max-w-3xl space-y-4">
        {subscriptions.map((s, i) => {
          const status = s.status;
          const theme = STATUS_THEME[status] ?? STATUS_THEME.active;
          const isCancelled = status === 'canceled';
          const isPaused = status === 'paused';
          const isActive = status === 'active';
          const declined = isPaused && Boolean(s.declined);
          const pending = busy === s.id;
          const note = notice[s.id];
          const annual = planOf(s.cadenceLabel) === 'annual';
          const per = PER[planOf(s.cadenceLabel)];
          // A 12-month plan's next box: the paid second box if still owed, else the next year's first.
          const nextBox = s.nextShipmentIso ?? (annual ? s.nextBillingIso : null);

          return (
            <article key={s.id} className={cn(panel, 'p-4 transition-opacity sm:p-6', isCancelled && 'opacity-60')}>
              <div className="flex gap-4">
                <div className="relative h-[76px] w-[76px] flex-shrink-0 overflow-hidden rounded-inner bg-milk-deep sm:h-24 sm:w-24">
                  <Image src={s.image} alt="" fill sizes="96px" priority={i < 2} className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <StatusChip tone={declined ? 'error' : theme.tone}>{declined ? 'Payment failed' : theme.label}</StatusChip>
                  <h2 className="mt-2 text-[21px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[24px]">
                    {s.productName}
                  </h2>
                  <p className="mt-0.5 text-[15px] text-ink/70">
                    {s.cadenceLabel} plan{s.cycleLabel ? ` · ${s.cycleLabel}` : ''}
                  </p>
                  {annual && <p className="mt-0.5 text-[15px] text-ink/70">Billed yearly · ships every 6 months</p>}
                </div>
              </div>

              {/* The two numbers a member comes here for. */}
              <dl className={cn(inset, 'mt-4 grid grid-cols-2 divide-x divide-ink/10')}>
                <div className="px-4 py-3">
                  <dt className="text-[14px] font-medium text-ink/70">{isActive ? 'Next charge' : 'Status'}</dt>
                  <dd className="mt-0.5 text-[17px] font-semibold tabular-nums text-ink">
                    {isActive
                      ? s.nextBillingIso
                        ? shortDate(s.nextBillingIso)
                        : s.nextBillingDate
                      : declined
                        ? 'Card declined'
                        : theme.label}
                  </dd>
                </div>
                <div className="px-4 py-3">
                  <dt className="text-[14px] font-medium text-ink/70">{annual ? 'Per year' : 'Per refill'}</dt>
                  <dd className="mt-0.5 text-[17px] font-semibold tabular-nums text-ink">
                    ${s.perMonth}
                    <span className="text-[15px] font-normal text-ink/70">{per}</span>
                  </dd>
                </div>
              </dl>

              {/* Shown on any plan with a box still owed: a member who left a 12-month plan mid-year still gets box 2. */}
              {(isActive || isPaused) && nextBox && (annual || s.nextShipmentIso) && (
                <p className="mt-3 text-[15px] text-ink/80">
                  Next box ships around <span className="font-semibold tabular-nums text-ink">{shortDate(nextBox)}</span>
                  {s.nextShipmentIso ? ', already paid for.' : '.'}
                </p>
              )}

              {(isCancelled || declined || isPaused) && (
                <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
                  {isCancelled
                    ? 'Cancelled. No further shipments will be sent.'
                    : declined
                      ? 'Your card was declined, so this plan is paused. Update your card to restart it.'
                      : 'Paused. Resume to restart this treatment from your next refill.'}
                </p>
              )}

              {/* Pending-review: the prescription ran its term. Renewing is an
                  assessment, then a new order back to Dr. Elder, which closes
                  this plan. */}
              {status === 'pending-review' && (
                <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
                  Your prescription is up for renewal. Answer a few questions and place your renewal, and Dr. Elder takes
                  another look. You won’t be charged unless he approves.
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {/* Declined card: the fix is a working card, and the account page restarts the plan. */}
                {declined && (
                  <Link href="/portal/account" className={cn(btnPrimary, 'w-full sm:w-auto')}>
                    Update your card
                  </Link>
                )}
                {isPaused && !declined && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(s, 'active', 'Resumed.')}
                    className={cn(btnPrimary, 'w-full sm:w-auto')}
                  >
                    Resume
                  </button>
                )}
                {status === 'pending-review' && (
                  <Link
                    href={`/start?product=${encodeURIComponent(s.productId)}&renew=${encodeURIComponent(s.id)}`}
                    className={cn(btnPrimary, 'w-full sm:w-auto')}
                  >
                    Start your renewal
                  </Link>
                )}
                {isActive && (
                  <>
                    {s.tiers.length > 1 && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setChanging({ sub: s, pick: planOf(s.cadenceLabel) })
                        }
                        className={cn(btnSecondary, 'flex-1 sm:flex-none')}
                      >
                        Change plan
                      </button>
                    )}
                    <button type="button" disabled={pending} onClick={() => skip(s)} className={cn(btnSecondary, 'flex-1 sm:flex-none')}>
                      Skip next refill
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setStatus(s, 'paused', 'Paused. Resume any time.')}
                      className={cn(btnSecondary, 'flex-1 sm:flex-none')}
                    >
                      Pause
                    </button>
                  </>
                )}
                {/* A cancelled plan is not the member's to switch back on (migration 0018). */}
                {isCancelled && (
                  <p className="text-[15px] text-ink/70">
                    To restart,{' '}
                    <Link href="/portal/messages" className="font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                      message your care team
                    </Link>
                    .
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 border-t border-ink/10 pt-2">
                <Link
                  href="/portal/orders"
                  className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
                >
                  Orders &amp; tracking
                </Link>
                {(isActive || isPaused) && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setCancelling({ sub: s, step: 'why', reason: '' })}
                    className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-red-700 hover:text-red-800 disabled:opacity-40"
                  >
                    Cancel plan
                  </button>
                )}
              </div>

              {note?.text && (
                <p role={note.ok ? 'status' : 'alert'} className={cn('mt-2 text-[15px]', note.ok ? 'text-ink/75' : 'text-red-700')}>
                  {note.text}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {confirmDialog}

      {/* Change plan: cadence and price from the catalogue; dates untouched, so it starts with the next refill. */}
      <Sheet open={Boolean(changing)} onClose={() => setChanging(null)} label="Change plan">
        {changing && (
          <>
            <h2 className={sheetTitle}>Change your {changing.sub.productName} plan</h2>
            <p className={sheetCopy}>
              Nothing is charged today. Your new plan starts with your next refill
              {changing.sub.nextBillingIso ? ` on ${shortDate(changing.sub.nextBillingIso)}` : ''}.
              {changing.sub.nextShipmentIso
                ? ` The second box of your current year still ships around ${shortDate(changing.sub.nextShipmentIso)}.`
                : ''}
            </p>
            <fieldset className="mt-5 space-y-2">
              <legend className="sr-only">Plan</legend>
              {changing.sub.tiers.map((t) => (
                <label key={t.key} className={choice}>
                  <input
                    type="radio"
                    name="plan"
                    value={t.key}
                    checked={changing.pick === t.key}
                    onChange={() => setChanging({ ...changing, pick: t.key })}
                    className="h-5 w-5 accent-ink"
                  />
                  <span className="flex-1 font-medium">
                    {t.label}
                    {planOf(changing.sub.cadenceLabel) === t.key && <span className="font-normal text-ink/70"> · current</span>}
                  </span>
                  <span className="text-right tabular-nums">
                    ${t.perCycle}
                    <span className="block text-[13px] text-ink/70">{EVERY[t.key]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="mt-3 text-[14px] text-ink/70">Prices include shipping. Your dose and product don’t change.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={() => setChanging(null)} className={cn(btnSecondary, 'sm:flex-1')}>
                Keep current plan
              </button>
              <button
                type="button"
                disabled={planOf(changing.sub.cadenceLabel) === changing.pick}
                onClick={() => {
                  const { sub, pick } = changing;
                  setChanging(null);
                  const label = sub.tiers.find((t) => t.key === pick)?.label ?? 'new';
                  void run(sub.id, () => changeSubscriptionPlanAction(sub.id, pick), `Switched to ${label}. It starts with your next refill.`);
                }}
                className={cn(btnCta, 'sm:flex-1')}
              >
                Switch plan
              </button>
            </div>
          </>
        )}
      </Sheet>

      {/* Cancel: why, then pause instead, then confirm. The reason is not stored. */}
      <Sheet open={Boolean(cancelling)} onClose={() => setCancelling(null)} label="Cancel plan">
        {cancelling?.step === 'why' && (
          <>
            <h2 className={sheetTitle}>Why are you cancelling?</h2>
            <p className={sheetCopy}>It helps your care team get this right.</p>
            <fieldset className="mt-5 space-y-2">
              <legend className="sr-only">Reason</legend>
              {CANCEL_REASONS.map((r) => (
                <label key={r} className={choice}>
                  <input
                    type="radio"
                    name="reason"
                    checked={cancelling.reason === r}
                    onChange={() => setCancelling({ ...cancelling, reason: r })}
                    className="h-5 w-5 accent-ink"
                  />
                  {r}
                </label>
              ))}
            </fieldset>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={() => setCancelling(null)} className={cn(btnSecondary, 'sm:flex-1')}>
                Keep my plan
              </button>
              <button
                type="button"
                disabled={!cancelling.reason}
                onClick={() =>
                  setCancelling({ ...cancelling, step: cancelling.sub.status === 'active' ? 'pause' : 'confirm' })
                }
                className={cn(btnPrimary, 'sm:flex-1')}
              >
                Continue
              </button>
            </div>
          </>
        )}
        {cancelling?.step === 'pause' && (
          <>
            <h2 className={sheetTitle}>Pause instead?</h2>
            <p className={sheetCopy}>
              Pausing stops charges and shipments but keeps your prescription and plan. Resume whenever you’re ready.
            </p>
            {cancelling.reason === 'Side effects' && (
              <p className={cn(inset, 'mt-4 p-4 text-[15px] leading-relaxed text-ink')}>
                Dr. Elder can often adjust a dose.{' '}
                <Link href="/portal/messages?thread=doctor" className="font-semibold underline underline-offset-[3px]">
                  Message him
                </Link>{' '}
                about what you’re noticing.
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  const sub = cancelling.sub;
                  setCancelling(null);
                  void setStatus(sub, 'paused', 'Paused. Resume any time.');
                }}
                className={btnCta}
              >
                Pause my plan
              </button>
              <button type="button" onClick={() => setCancelling({ ...cancelling, step: 'confirm' })} className={btnSecondary}>
                No, cancel my plan
              </button>
            </div>
          </>
        )}
        {cancelling?.step === 'confirm' && (
          <>
            <h2 className={sheetTitle}>Cancel {cancelling.sub.productName}?</h2>
            <p className={sheetCopy}>
              You won’t be billed again. Your treatment history stays on file. To restart later, message your care team.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" autoFocus onClick={() => setCancelling(null)} className={cn(btnSecondary, 'sm:flex-1')}>
                Keep my plan
              </button>
              <button
                type="button"
                onClick={() => {
                  const sub = cancelling.sub;
                  setCancelling(null);
                  void setStatus(sub, 'canceled', 'Cancelled. No further shipments will be sent.');
                }}
                className={cn(btnPrimary, 'bg-red-700 hover:bg-red-800 sm:flex-1')}
              >
                Yes, cancel
              </button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );
}
