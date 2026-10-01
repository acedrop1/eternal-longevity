'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  EmptyState,
  StatusChip,
  btnDanger,
  btnPrimary,
  btnSecondary,
  panel,
  type Tone,
} from '@/components/portal/ui';
import {
  changeSubscriptionPlanAction,
  setSubscriptionStatusAction,
  skipNextCycleAction,
  type PlanKey,
} from '@/lib/subscriptions-db';

export interface Subscription {
  id: string;
  productName: string;
  cycleLabel: string;
  cadenceLabel: string;
  perMonth: number;
  nextBillingDate: string;
  /** Straight from the database. The page re-renders after every action. */
  status: Status;
  image: string;
  swatch: string;
}

type Status = 'active' | 'paused' | 'pending-review' | 'canceled';

const STATUS_THEME: Record<Status, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'gold' },
  paused: { label: 'Paused', tone: 'warn' },
  'pending-review': { label: 'In review', tone: 'info' },
  canceled: { label: 'Cancelled', tone: 'muted' },
};

interface Props {
  subscriptions: Subscription[];
}

/** The plan key a stored cadence label ('Monthly', 'Quarterly', '6-month', 'Annual') stands for. */
const planOf = (label: string): PlanKey | 'annual' => {
  const l = label.toLowerCase();
  return l.startsWith('6') ? 'sixMonth' : l.includes('quarter') ? 'quarterly' : l.includes('annual') ? 'annual' : 'monthly';
};

type ActionResult = { ok: boolean; error?: string };

export function SubscriptionsManager({ subscriptions }: Props) {
  /*
   * Only the server's word counts. This used to keep its own copy of each
   * plan's status in localStorage and fire the actions without waiting, so a
   * pause the database refused still showed as paused, and "Skip next cycle"
   * never reached the server at all.
   */
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [confirm, setConfirm] = useState<
    | null
    | { kind: 'cancel' | 'skip'; subId: string; productName: string }
  >(null);

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
      [id]: res.ok
        ? { ok: true, text: done }
        : { ok: false, text: res.error ?? 'That did not go through. Please try again.' },
    }));
    setBusy(null);
  };

  const setStatus = (s: Subscription, to: 'active' | 'paused' | 'canceled', done: string) =>
    run(s.id, () => setSubscriptionStatusAction(s.id, to), done);

  // Billing-plan change only — product and dosage are never editable here.
  const changePlan = (s: Subscription, plan: PlanKey) =>
    run(s.id, () => changeSubscriptionPlanAction(s.id, plan), 'Plan updated.');

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        action={
          <Link href="/portal/shop" className={btnPrimary}>
            Browse the shop
          </Link>
        }
      >
        You have no subscriptions yet.
      </EmptyState>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {subscriptions.map((s) => {
          const status = s.status;
          const theme = STATUS_THEME[status] ?? STATUS_THEME.active;
          const isCancelled = status === 'canceled';
          const isPaused = status === 'paused';
          const pending = busy === s.id;
          const note = notice[s.id];

          return (
            <article
              key={s.id}
              className={cn(
                panel,
                'p-5 transition-opacity md:p-6',
                isCancelled && 'opacity-60',
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 gap-4">
                  <div
                    className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-inner md:h-20 md:w-20"
                    style={{ background: s.swatch }}
                  >
                    <Image
                      src={s.image}
                      alt={s.productName}
                      fill
                      sizes="80px"
                      className="object-cover opacity-50"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusChip tone={theme.tone}>{theme.label}</StatusChip>
                    </div>
                    <h2
                      className="text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]"
                    >
                      {s.productName}
                    </h2>
                    <p className="mt-1 text-[15px] text-ink/65">
                      {s.cycleLabel} · {s.cadenceLabel}
                    </p>
                    <p className="mt-1 text-[14px] tabular-nums text-ink/55">
                      {isCancelled
                        ? 'Cancelled. No further shipments will be sent.'
                        : isPaused
                          ? 'Paused. Click Resume to reactivate this protocol.'
                          : `Next billing: ${s.nextBillingDate}`}
                    </p>
                  </div>
                </div>

                <div className="sm:flex-shrink-0 sm:text-right">
                  <div className="text-[20px] font-medium text-ink tabular-nums">
                    ${s.perMonth}
                    <span className="text-[15px] font-normal text-ink/55">
                      {/* What each renewal charges (per_cycle_cents), so per cycle rather than per month. */}
                      {{ monthly: '/mo', quarterly: '/3 mo', sixMonth: '/6 mo', annual: '/yr' }[planOf(s.cadenceLabel)]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-5">
                {/* Resume — only when paused */}
                {isPaused && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setStatus(s, 'active', 'Resumed.')}
                    className={btnPrimary}
                  >
                    Resume
                  </button>
                )}

                {/* A cancelled plan is not the member's to switch back on (migration 0018). */}
                {isCancelled && (
                  <p className="text-[14px] text-ink/60">
                    To restart,{' '}
                    <Link
                      href="/portal/messages"
                      className="underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
                    >
                      message your care team
                    </Link>
                    .
                  </p>
                )}

                {/* Billing plan — the one thing a member can change */}
                {status === 'active' && (
                  <label className="flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 text-[13px] font-medium text-ink ring-1 ring-ink/10 md:min-h-[40px]">
                    <span className="text-ink/55">Plan</span>
                    <select
                      value={planOf(s.cadenceLabel)}
                      disabled={pending}
                      onChange={(e) => changePlan(s, e.target.value as PlanKey)}
                      className="bg-transparent text-[13px] font-medium text-ink outline-none"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="sixMonth">6-month</option>
                      {/* Annual is no longer sold; shown only so a plan already on it reads right. */}
                      {planOf(s.cadenceLabel) === 'annual' && (
                        <option value="annual" disabled>
                          Annual
                        </option>
                      )}
                    </select>
                  </label>
                )}

                {/* Pause / Skip / Cancel — only when active */}
                {status === 'active' && (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setStatus(s, 'paused', 'Paused.')}
                      className={btnSecondary}
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        setConfirm({
                          kind: 'skip',
                          subId: s.id,
                          productName: s.productName,
                        })
                      }
                      className={btnSecondary}
                    >
                      Skip next cycle
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        setConfirm({
                          kind: 'cancel',
                          subId: s.id,
                          productName: s.productName,
                        })
                      }
                      className={btnDanger}
                    >
                      Cancel
                    </button>
                  </>
                )}

                {/* Pending-review: read-only */}
                {status === 'pending-review' && (
                  <p className="text-[14px] text-ink/60">
                    In review. Controls unlock once your order is confirmed.
                  </p>
                )}

                <Link
                  href="/portal/orders"
                  className="ml-auto inline-flex min-h-[44px] items-center text-[13px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink md:min-h-0"
                >
                  Order history →
                </Link>
              </div>

              {note?.text && (
                <p
                  role={note.ok ? 'status' : 'alert'}
                  className={cn('mt-3 text-[13px]', note.ok ? 'text-ink/60' : 'text-red-600')}
                >
                  {note.text}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* Confirm modal — for Skip + Cancel */}
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => setConfirm(null)}
          />
          <div className="relative w-full max-w-md rounded-shell bg-white p-6 text-ink shadow-[0_24px_60px_-24px_rgba(17,17,17,0.45)] ring-1 ring-ink/5 md:p-8">
            <h3
              className="mb-3 text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] md:text-[26px]"
            >
              {confirm.kind === 'cancel'
                ? `Cancel ${confirm.productName}?`
                : `Skip the next ${confirm.productName} cycle?`}
            </h3>
            <p className="mb-6 text-[15px] leading-relaxed text-ink/70">
              {confirm.kind === 'cancel'
                ? "You won't be billed again. Your protocol stays on file — message your care team if you want to restart."
                : "You won't be charged or shipped for the next cycle. Billing automatically resumes on the cycle after."}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className={btnSecondary}
              >
                Never mind
              </button>
              <button
                type="button"
                onClick={() => {
                  const sub = subscriptions.find((x) => x.id === confirm.subId);
                  if (!sub) return setConfirm(null);
                  setConfirm(null);
                  if (confirm.kind === 'cancel') {
                    void setStatus(sub, 'canceled', 'Cancelled. No further shipments will be sent.');
                  } else {
                    void run(sub.id, () => skipNextCycleAction(sub.id), 'Next cycle skipped.');
                  }
                }}
                className={cn(
                  btnPrimary,
                  confirm.kind === 'cancel' && 'bg-red-700 hover:bg-red-800',
                )}
              >
                {confirm.kind === 'cancel'
                  ? 'Yes, cancel subscription'
                  : 'Yes, skip this cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
