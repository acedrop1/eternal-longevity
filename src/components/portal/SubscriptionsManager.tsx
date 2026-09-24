'use client';

import { useEffect, useState } from 'react';
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
  type PlanKey,
} from '@/lib/subscriptions-db';

export interface Subscription {
  id: string;
  productName: string;
  cycleLabel: string;
  cadenceLabel: string;
  perMonth: number;
  nextBillingDate: string;
  initialStatus: 'active' | 'paused' | 'pending-review';
  image: string;
  swatch: string;
}

type LiveStatus = 'active' | 'paused' | 'pending-review' | 'cancelled';

interface PerSubState {
  status: LiveStatus;
  /** ISO date string of the cycle the user chose to skip, or null. */
  skipNextCycleAt: string | null;
}

const STORAGE_KEY = 'el.subscriptions.v1';

function loadState(): Record<string, PerSubState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PerSubState>) : {};
  } catch {
    return {};
  }
}

function saveState(s: Record<string, PerSubState>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // storage full or blocked — silently skip
  }
}

const STATUS_THEME: Record<LiveStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'gold' },
  paused: { label: 'Paused', tone: 'warn' },
  'pending-review': { label: 'In review', tone: 'info' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
};

interface Props {
  subscriptions: Subscription[];
}

export function SubscriptionsManager({ subscriptions }: Props) {
  // Per-subscription user-driven state (pause / skip-next / cancel)
  const [state, setState] = useState<Record<string, PerSubState>>({});
  const [confirm, setConfirm] = useState<
    | null
    | { kind: 'cancel' | 'skip'; subId: string; productName: string }
  >(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setState(loadState());
  }, []);

  // Persist on every change
  useEffect(() => {
    if (Object.keys(state).length === 0) return;
    saveState(state);
  }, [state]);

  const getStatus = (s: Subscription): LiveStatus =>
    state[s.id]?.status ?? s.initialStatus;

  const update = (id: string, patch: Partial<PerSubState>) =>
    setState((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status ?? 'active',
        skipNextCycleAt: prev[id]?.skipNextCycleAt ?? null,
        ...patch,
      },
    }));

  const togglePause = (s: Subscription) => {
    const current = getStatus(s);
    if (current === 'paused') {
      update(s.id, { status: 'active' });
      void setSubscriptionStatusAction(s.id, 'active');
    } else if (current === 'active') {
      update(s.id, { status: 'paused' });
      void setSubscriptionStatusAction(s.id, 'paused');
    }
  };

  const skipNextCycle = (s: Subscription) => {
    update(s.id, { skipNextCycleAt: s.nextBillingDate });
    setConfirm(null);
  };

  const cancel = (s: Subscription) => {
    update(s.id, { status: 'cancelled', skipNextCycleAt: null });
    void setSubscriptionStatusAction(s.id, 'canceled');
    setConfirm(null);
  };

  const reactivate = (s: Subscription) => {
    update(s.id, { status: 'active', skipNextCycleAt: null });
    void setSubscriptionStatusAction(s.id, 'active');
  };

  // Billing-plan change only — product and dosage are never editable here.
  const [planFor, setPlanFor] = useState<Record<string, string>>({});
  const changePlan = (s: Subscription, plan: PlanKey) => {
    setPlanFor((prev) => ({ ...prev, [s.id]: plan }));
    void changeSubscriptionPlanAction(s.id, plan);
  };

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
          const status = getStatus(s);
          const skippedDate = state[s.id]?.skipNextCycleAt ?? null;
          const theme = STATUS_THEME[status];
          const isCancelled = status === 'cancelled';
          const isPaused = status === 'paused';

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
                    className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[2px] md:h-20 md:w-20"
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
                      {skippedDate && status === 'active' && (
                        <StatusChip tone="warn">Next cycle skipped</StatusChip>
                      )}
                    </div>
                    <h2
                      className="font-display font-normal text-black"
                      style={{ fontSize: '1.5rem', fontStretch: '75%', lineHeight: 1.1 }}
                    >
                      {s.productName}
                    </h2>
                    <p className="mt-1 text-[15px] text-black/65">
                      {s.cycleLabel} · {s.cadenceLabel}
                    </p>
                    <p className="mt-1 text-[14px] tabular-nums text-black/55">
                      {isCancelled
                        ? 'Cancelled. No further shipments will be sent.'
                        : isPaused
                          ? 'Paused. Click Resume to reactivate this protocol.'
                          : skippedDate
                            ? `Skipping ${skippedDate}. Next billing rolls to the cycle after.`
                            : `Next billing: ${s.nextBillingDate}`}
                    </p>
                  </div>
                </div>

                <div className="sm:flex-shrink-0 sm:text-right">
                  <div className="text-[20px] font-medium text-black tabular-nums">
                    ${s.perMonth}
                    <span className="text-[15px] font-normal text-black/55">
                      /mo
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-black/10 pt-5">
                {/* Resume — only when paused */}
                {isPaused && (
                  <button
                    type="button"
                    onClick={() => togglePause(s)}
                    className={btnPrimary}
                  >
                    Resume
                  </button>
                )}

                {/* Reactivate — only when cancelled (within a grace window in real life; here always allowed) */}
                {isCancelled && (
                  <button
                    type="button"
                    onClick={() => reactivate(s)}
                    className={btnPrimary}
                  >
                    Reactivate
                  </button>
                )}

                {/* Billing plan — the one thing a member can change */}
                {status === 'active' && (
                  <label className="flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 font-mono text-[13px] text-black ring-1 ring-black/15 md:min-h-[40px]">
                    <span className="text-black/55">Plan</span>
                    <select
                      value={
                        planFor[s.id] ??
                        (s.cadenceLabel.toLowerCase().includes('quarter')
                          ? 'quarterly'
                          : s.cadenceLabel.toLowerCase().includes('annual')
                            ? 'annual'
                            : 'monthly')
                      }
                      onChange={(e) => changePlan(s, e.target.value as PlanKey)}
                      className="bg-transparent font-mono text-[13px] text-black outline-none"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </label>
                )}

                {/* Pause / Skip / Cancel — only when active */}
                {status === 'active' && (
                  <>
                    <button
                      type="button"
                      onClick={() => togglePause(s)}
                      className={btnSecondary}
                    >
                      Pause
                    </button>
                    {!skippedDate && (
                      <button
                        type="button"
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
                    )}
                    {skippedDate && (
                      <button
                        type="button"
                        onClick={() => update(s.id, { skipNextCycleAt: null })}
                        className={btnSecondary}
                      >
                        Undo skip
                      </button>
                    )}
                    <button
                      type="button"
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
                  <p className="text-[14px] text-black/60">
                    In review. Controls unlock once your order is confirmed.
                  </p>
                )}

                <Link
                  href="/portal/orders"
                  className="ml-auto inline-flex min-h-[44px] items-center font-mono text-[13px] text-black underline decoration-black/40 underline-offset-[3px] hover:decoration-black md:min-h-0"
                >
                  Order history →
                </Link>
              </div>
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirm(null)}
          />
          <div className="relative w-full max-w-md rounded-[4px] bg-white p-6 text-black shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)] ring-1 ring-black/10 md:p-8">
            <h3
              className="mb-3 font-display font-normal"
              style={{ fontSize: '1.5rem', fontStretch: '75%', lineHeight: 1.1 }}
            >
              {confirm.kind === 'cancel'
                ? `Cancel ${confirm.productName}?`
                : `Skip the next ${confirm.productName} cycle?`}
            </h3>
            <p className="mb-6 text-[15px] leading-relaxed text-black/70">
              {confirm.kind === 'cancel'
                ? "You won't be billed again. You can reactivate later — your protocol stays on file for reordering."
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
                  if (confirm.kind === 'cancel') cancel(sub);
                  else skipNextCycle(sub);
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
