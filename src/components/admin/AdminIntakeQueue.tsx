'use client';

import { useState } from 'react';
import {
  declineIntake,
  requestIntakeInfo,
  type ClinicalResult,
} from '@/lib/clinical-actions';
import { cn } from '@/lib/utils';
import { SERVICE_AREA } from '@/lib/site';

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
  `Outside our service area — we serve ${SERVICE_AREA} only.`,
  'Under 18 — we cannot treat anyone under 18.',
  'Duplicate of an existing visit.',
  'Test, spam, or an incomplete submission.',
  'The member asked us to close this visit.',
];

const STATUS_BADGE: Record<string, string> = {
  submitted: 'border-amber-600/25 bg-amber-50 text-amber-800',
  approved: 'border-emerald-600/20 bg-emerald-50 text-emerald-800',
  in_review: 'border-sky-600/25 bg-sky-50 text-sky-800',
  needs_info: 'border-amber-600/25 bg-amber-50 text-amber-800',
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
      <div className="rounded-shell bg-milk p-10 text-center">
        <h2 className="mb-2 text-[20px] font-semibold tracking-[-0.03em] text-ink">
          Queue is clear
        </h2>
        <p className="text-sm text-ink/65">
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
      <p className="text-sm leading-relaxed text-ink/55">
        Nothing to action here. Everyone below can already shop; this is the
        record of who signed up and what they answered.
      </p>

      <div className="flex flex-wrap items-center gap-2 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full border px-4 py-2 text-[13px] font-medium transition-colors',
              filter === f.key
                ? 'border-ink bg-ink text-white'
                : 'border-ink/10 bg-white text-ink/70 hover:border-ink/25 hover:text-ink',
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
          className="ml-auto w-full rounded-inner bg-white px-4 py-2 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/40 focus:outline-none focus:ring-ink/30 sm:w-56"
        />
      </div>

      {shown.length === 0 && (
        <p className="rounded-shell bg-milk p-8 text-center text-sm text-ink/55">
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
    <article className="rounded-shell bg-milk p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[12px] text-ink/55">
            <span className="text-ink/80">
              {intake.caseId.toUpperCase()}
            </span>
            <span>·</span>
            <span>{intake.submittedAt}</span>
          </div>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-ink md:text-[20px]">
            {intake.email}
          </h2>
          {/* Whether they picked a product first or came through Apply Now
              changes what the prescriber is being asked to decide. */}
          <p className="mt-1 text-xs text-ink/55">
            {intake.source ? (
              <>
                Started from{' '}
                <span className="text-ink/85">{intake.source}</span>
              </>
            ) : (
              <>No product selected &mdash; came through Apply Now</>
            )}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]',
            STATUS_BADGE[intake.status] ?? STATUS_BADGE.submitted,
          )}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {intake.status.replace('_', ' ')}
        </span>
      </div>

      {/* Answers */}
      {intake.answers.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAnswers((v) => !v)}
            className="text-[12px] text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
          >
            {showAnswers ? 'Hide answers ↑' : 'View answers ↓'}
          </button>
          {showAnswers && (
            <dl className="mt-3 space-y-2 rounded-inner border border-ink/10 bg-white p-4">
              {intake.answers.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-4 border-b border-ink/10 pb-2 text-sm last:border-0 last:pb-0"
                >
                  <dt className="text-ink/55">{a.label}</dt>
                  <dd className="max-w-[60%] text-right text-ink/90">
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
        <div className="mt-5 border-t border-ink/10 pt-5">
          <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen('info')}
            className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25"
          >
            Request info
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen('decline')}
            className="ml-auto rounded-full border border-red-600/20 bg-red-50 px-4 py-2 text-[13px] font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            Close &mdash; not eligible
          </button>
          </div>
        </div>
      )}

      {open && (
        <div
          className={cn(
            'mt-5 rounded-inner border p-4 md:p-5',
            open === 'decline'
              ? 'border-red-600/20 bg-red-50'
              : 'border-ink/10 bg-white',
          )}
        >
          <div
            className={cn(
              'mb-3 text-[13px] font-medium',
              open === 'decline' ? 'text-red-700' : 'text-ink',
            )}
          >
            {open === 'decline'
              ? 'Why are they not eligible?'
              : 'What does the patient need to provide?'}
          </div>

          {open === 'decline' ? (
            <>
              <div className="space-y-2">
                {CLOSE_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex cursor-pointer items-start gap-3 rounded-inner border border-ink/10 bg-white px-4 py-3 text-sm text-ink/85 transition-colors hover:border-ink/25"
                  >
                    <input
                      type="radio"
                      name={`close-${intake.id}`}
                      checked={note === r}
                      onChange={() => setNote(r)}
                      className="mt-1 h-3.5 w-3.5 flex-none accent-ink"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink/60">
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
              className="w-full resize-none rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/40 focus:outline-none focus:ring-ink/30"
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
                'rounded-full px-5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-40',
                open === 'decline'
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-ink text-white hover:bg-ink/85',
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
              className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25"
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
            result.ok ? 'text-emerald-700' : 'text-red-700',
          )}
        >
          {result.message}
        </p>
      )}
    </article>
  );
}
