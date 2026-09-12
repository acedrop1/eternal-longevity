'use client';

import { useState } from 'react';
import {
  declineIntake,
  requestIntakeInfo,
  type ClinicalResult,
} from '@/lib/clinical-actions';
import { cn } from '@/lib/utils';

export interface IntakeRowView {
  id: string;
  caseId: string;
  email: string;
  status: string;
  /** Product they came in from, or null for the generic Apply Now route. */
  source: string | null;
  submittedAt: string;
  answers: { label: string; value: string }[];
}

/*
 * Closing a visit at this desk is an administrative act. A free-text box
 * invites "history of cancer" — a clinical judgement nobody here is licensed
 * to make. These are the only reasons an admin can close on.
 */
const CLOSE_REASONS = [
  'Outside New Jersey — we are only licensed to serve NJ residents.',
  'Under 18 — we cannot treat anyone under 18.',
  'Duplicate of an existing visit.',
  'Test, spam, or an incomplete submission.',
  'The member asked us to close this visit.',
];

const STATUS_BADGE: Record<string, string> = {
  submitted: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
  approved: 'border-accent/40 bg-accent/10 text-accent',
  in_review: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  needs_info: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'New' },
  { key: 'needs_info', label: 'Waiting on them' },
  { key: 'product', label: 'From a product' },
] as const;

export function AdminIntakeQueue({ intakes }: { intakes: IntakeRowView[] }) {
  const [rows, setRows] = useState(intakes);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [query, setQuery] = useState('');

  /*
   * Three cases fit on a screen; thirty do not, and the one that needs
   * attention is the one waiting on a reply.
   */
  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (filter === 'submitted' && r.status !== 'submitted') return false;
    if (filter === 'needs_info' && r.status !== 'needs_info') return false;
    if (filter === 'product' && !r.source) return false;
    if (q && !r.email.toLowerCase().includes(q) && !r.caseId.toLowerCase().includes(q))
      return false;
    return true;
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-10 text-center">
        <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
          Queue is clear
        </h2>
        <p className="text-sm text-foreground/65">
          No intakes are waiting for triage.
        </p>
      </div>
    );
  }

  const count = (key: (typeof FILTERS)[number]['key']) =>
    key === 'all'
      ? rows.length
      : key === 'product'
        ? rows.filter((r) => r.source).length
        : rows.filter((r) => r.status === key).length;

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-foreground/55">
        Nothing to approve here — an application is a medical record, not a
        request for a prescription. Everyone below can shop already, and the
        prescriber reviews each order when it is placed.
      </p>

      <div className="flex flex-wrap items-center gap-2 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full border px-4 py-2 text-xs font-medium tracking-wider transition-colors',
              filter === f.key
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-line bg-surface text-foreground/60 hover:border-foreground/30 hover:text-foreground',
            )}
          >
            {f.label}
            <span className="ml-1.5 tabular-nums opacity-60">{count(f.key)}</span>
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search email or case"
          aria-label="Search applications"
          className="ml-auto w-full rounded-full border border-line bg-background px-4 py-2 text-sm text-foreground placeholder-foreground/30 focus:border-accent focus:outline-none sm:w-56"
        />
      </div>

      {shown.length === 0 && (
        <p className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-foreground/55">
          Nothing matches that.
        </p>
      )}

      {shown.map((intake) => (
        <IntakeCard
          key={intake.id}
          intake={intake}
          onResolved={() =>
            setRows((curr) => curr.filter((r) => r.id !== intake.id))
          }
        />
      ))}
    </div>
  );
}

function IntakeCard({
  intake,
  onResolved,
}: {
  intake: IntakeRowView;
  onResolved: () => void;
}) {
  const [open, setOpen] = useState<null | 'info' | 'decline'>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ClinicalResult | null>(null);

  async function run(fn: () => Promise<ClinicalResult>) {
    setBusy(true);
    setResult(null);
    try {
      const res = await fn();
      setResult(res);
      if (res.ok) setTimeout(onResolved, 900);
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-3xl border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] tracking-widest text-foreground/55">
            <span className="font-semibold text-foreground/80">
              {intake.caseId.toUpperCase()}
            </span>
            <span>·</span>
            <span>{intake.submittedAt}</span>
          </div>
          <h2 className="text-base font-semibold tracking-tight text-foreground md:text-lg">
            {intake.email}
          </h2>
          {/* Whether they picked a product first or came through Apply Now
              changes what the prescriber is being asked to decide. */}
          <p className="mt-1 text-xs text-foreground/55">
            {intake.source ? (
              <>
                Started from{' '}
                <span className="text-foreground/85">{intake.source}</span>
              </>
            ) : (
              <>No product selected &mdash; came through Apply Now</>
            )}
          </p>
        </div>
        <span
          className={cn(
            'rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-widest',
            STATUS_BADGE[intake.status] ?? STATUS_BADGE.submitted,
          )}
        >
          {intake.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Answers */}
      {intake.answers.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAnswers((v) => !v)}
            className="text-[11px] tracking-widest text-accent hover:text-accent-soft"
          >
            {showAnswers ? 'HIDE ANSWERS ↑' : 'VIEW ANSWERS ↓'}
          </button>
          {showAnswers && (
            <dl className="mt-3 space-y-2 rounded-2xl border border-line bg-background p-4">
              {intake.answers.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 border-b border-line pb-2 text-sm last:border-0 last:pb-0"
                >
                  <dt className="text-foreground/55">{a.label}</dt>
                  <dd className="max-w-[60%] text-right text-foreground/90">
                    {a.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {/* Actions */}
      {open === null && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen('info')}
            className="rounded-full border border-line bg-surface px-4 py-2 text-xs tracking-wider text-foreground/85 transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            Request info
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen('decline')}
            className="rounded-full border border-red-500/30 bg-red-500/5 px-4 py-2 text-xs tracking-wider text-red-300 transition-colors hover:bg-red-500/10"
          >
            Close &mdash; not eligible
          </button>
          </div>
        </div>
      )}

      {open && (
        <div
          className={cn(
            'mt-5 rounded-2xl border p-4 md:p-5',
            open === 'decline'
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-accent/30 bg-accent/5',
          )}
        >
          <div
            className={cn(
              'mb-3 text-[10px] tracking-widest',
              open === 'decline' ? 'text-red-300' : 'text-accent',
            )}
          >
            {open === 'decline'
              ? 'WHY ARE THEY NOT ELIGIBLE?'
              : 'WHAT DOES THE PATIENT NEED TO PROVIDE?'}
          </div>

          {open === 'decline' ? (
            <>
              <div className="space-y-2">
                {CLOSE_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground/85 transition-colors hover:border-foreground/30"
                  >
                    <input
                      type="radio"
                      name={`close-${intake.id}`}
                      checked={note === r}
                      onChange={() => setNote(r)}
                      className="mt-1 h-3.5 w-3.5 flex-none accent-[#d5a850]"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-foreground/50">
                Not a clinical decision. If the reason is medical, send it to the
                prescriber instead — only he can decline on clinical grounds.
              </p>
            </>
          ) : (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="The patient will see this note…"
              className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || !note.trim()}
              onClick={() =>
                run(() =>
                  open === 'decline'
                    ? declineIntake({ intakeId: intake.id, note })
                    : requestIntakeInfo({ intakeId: intake.id, note }),
                )
              }
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-40',
                open === 'decline'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-accent text-black hover:bg-accent-soft',
              )}
            >
              {busy
                ? 'Working…'
                : open === 'decline'
                  ? 'Close this visit'
                  : 'Send request'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                setNote('');
              }}
              className="rounded-full border border-line bg-surface px-4 py-2 text-xs tracking-wider text-foreground/85 transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <p
          className={cn(
            'mt-3 text-sm',
            result.ok ? 'text-accent' : 'text-red-300',
          )}
        >
          {result.message}
        </p>
      )}
    </article>
  );
}
