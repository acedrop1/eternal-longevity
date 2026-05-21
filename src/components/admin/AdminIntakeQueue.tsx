'use client';

import { useState } from 'react';
import {
  approveIntake,
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
  submittedAt: string;
  answers: { label: string; value: string }[];
}

const STATUS_BADGE: Record<string, string> = {
  submitted: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
  in_review: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  needs_info: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
};

export function AdminIntakeQueue({ intakes }: { intakes: IntakeRowView[] }) {
  const [rows, setRows] = useState(intakes);

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

  return (
    <div className="space-y-3">
      {rows.map((intake) => (
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
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => approveIntake(intake.id))}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Approve'}
          </button>
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
            Decline
          </button>
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
              ? 'REASON FOR DECLINE'
              : 'WHAT DOES THE PATIENT NEED TO PROVIDE?'}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="The patient will see this note…"
            className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
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
                  ? 'Confirm decline'
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
