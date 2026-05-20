'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

const STATUS_THEME: Record<
  LiveStatus,
  { label: string; class: string }
> = {
  active: { label: 'ACTIVE', class: 'bg-accent/10 text-accent border-accent/40' },
  paused: { label: 'PAUSED', class: 'bg-amber-500/10 text-amber-300 border-amber-400/40' },
  'pending-review': {
    label: 'AWAITING PHYSICIAN',
    class: 'bg-sky-500/10 text-sky-300 border-sky-400/40',
  },
  cancelled: { label: 'CANCELLED', class: 'bg-foreground/10 text-foreground/55 border-foreground/20' },
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
    } else if (current === 'active') {
      update(s.id, { status: 'paused' });
    }
  };

  const skipNextCycle = (s: Subscription) => {
    update(s.id, { skipNextCycleAt: s.nextBillingDate });
    setConfirm(null);
  };

  const cancel = (s: Subscription) => {
    update(s.id, { status: 'cancelled', skipNextCycleAt: null });
    setConfirm(null);
  };

  const reactivate = (s: Subscription) => {
    update(s.id, { status: 'active', skipNextCycleAt: null });
  };

  return (
    <>
      <div className="space-y-4">
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
                'rounded-3xl border border-line bg-surface p-5 md:p-7 transition-opacity',
                isCancelled && 'opacity-60',
              )}
            >
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4 min-w-0 flex-1">
                  <div
                    className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border border-line"
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
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] tracking-widest font-semibold',
                          theme.class,
                        )}
                      >
                        {theme.label}
                      </span>
                      {skippedDate && status === 'active' && (
                        <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/5 text-amber-300 px-2.5 py-0.5 text-[10px] tracking-widest font-semibold">
                          NEXT CYCLE SKIPPED
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                      {s.productName}
                    </h2>
                    <p className="mt-0.5 text-sm text-foreground/65">
                      {s.cycleLabel} · {s.cadenceLabel}
                    </p>
                    <p className="mt-1 text-xs text-foreground/55">
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

                <div className="text-right md:flex-shrink-0">
                  <div className="text-xl font-semibold text-foreground tabular-nums">
                    ${s.perMonth}
                    <span className="text-sm text-foreground/55 font-normal">
                      /mo
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                {/* Resume — only when paused */}
                {isPaused && (
                  <button
                    type="button"
                    onClick={() => togglePause(s)}
                    className="rounded-full bg-accent text-black font-semibold px-4 py-2 text-xs hover:bg-accent-soft transition-colors"
                  >
                    Resume
                  </button>
                )}

                {/* Reactivate — only when cancelled (within a grace window in real life; here always allowed) */}
                {isCancelled && (
                  <button
                    type="button"
                    onClick={() => reactivate(s)}
                    className="rounded-full bg-accent text-black font-semibold px-4 py-2 text-xs hover:bg-accent-soft transition-colors"
                  >
                    Reactivate
                  </button>
                )}

                {/* Pause / Skip / Cancel — only when active */}
                {status === 'active' && (
                  <>
                    <button
                      type="button"
                      onClick={() => togglePause(s)}
                      className="rounded-full border border-line bg-background text-foreground/85 font-medium px-4 py-2 text-xs hover:border-foreground/30 transition-colors"
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
                        className="rounded-full border border-line bg-background text-foreground/85 font-medium px-4 py-2 text-xs hover:border-foreground/30 transition-colors"
                      >
                        Skip next cycle
                      </button>
                    )}
                    {skippedDate && (
                      <button
                        type="button"
                        onClick={() => update(s.id, { skipNextCycleAt: null })}
                        className="rounded-full border border-line bg-background text-foreground/85 font-medium px-4 py-2 text-xs hover:border-foreground/30 transition-colors"
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
                      className="rounded-full border border-red-500/30 bg-red-500/5 text-red-300 font-medium px-4 py-2 text-xs hover:bg-red-500/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}

                {/* Pending-review: read-only */}
                {status === 'pending-review' && (
                  <p className="text-xs text-foreground/55">
                    Awaiting physician sign-off. Controls unlock once approved.
                  </p>
                )}

                <Link
                  href="/portal/orders"
                  className="ml-auto text-[11px] tracking-widest text-accent hover:text-accent-soft"
                >
                  ORDER HISTORY →
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirm(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-surface-raised p-6 md:p-8 shadow-2xl">
            <p className="mb-2 text-[10px] tracking-widest text-foreground/55">
              {confirm.kind === 'cancel' ? 'CANCEL SUBSCRIPTION' : 'SKIP NEXT CYCLE'}
            </p>
            <h3 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
              {confirm.kind === 'cancel'
                ? `Cancel ${confirm.productName}?`
                : `Skip the next ${confirm.productName} cycle?`}
            </h3>
            <p className="mb-6 text-sm text-foreground/65 leading-relaxed">
              {confirm.kind === 'cancel'
                ? "You won't be billed again. You can reactivate later — your protocol stays on file for your physician's reference."
                : "You won't be charged or shipped for the next cycle. Billing automatically resumes on the cycle after."}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-full border border-line bg-background text-foreground/85 font-medium px-5 py-2.5 text-sm hover:border-foreground/30 transition-colors"
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
                  'rounded-full font-semibold px-5 py-2.5 text-sm transition-colors',
                  confirm.kind === 'cancel'
                    ? 'bg-red-500/90 hover:bg-red-500 text-white'
                    : 'bg-accent hover:bg-accent-soft text-black',
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
