'use client';

import { useState } from 'react';
import {
  declineClinically,
  signPrescription,
  type ClinicalResult,
  type RxItem,
} from '@/lib/clinical-actions';
import { cn } from '@/lib/utils';

export interface DoctorIntakeView {
  id: string;
  caseId: string;
  email: string;
  submittedAt: string;
  answers: { label: string; value: string }[];
}

/** Parse a textarea ("BPC-157, 250 mcg daily" per line) into Rx items. */
function parseItems(raw: string): RxItem[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const comma = line.indexOf(',');
      if (comma === -1) return { name: line, dose: '' };
      return {
        name: line.slice(0, comma).trim(),
        dose: line.slice(comma + 1).trim(),
      };
    });
}

export function DoctorSignQueue({
  intakes,
}: {
  intakes: DoctorIntakeView[];
}) {
  const [rows, setRows] = useState(intakes);

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-10 text-center">
        <h2 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
          Queue is clear
        </h2>
        <p className="text-sm text-foreground/65">
          Approved intakes appear here for sign-off.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((intake) => (
        <SignCard
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

function SignCard({
  intake,
  onResolved,
}: {
  intake: DoctorIntakeView;
  onResolved: () => void;
}) {
  const [open, setOpen] = useState<null | 'sign' | 'decline'>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [items, setItems] = useState('');
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

  function sign() {
    if (
      !window.confirm(
        `Sign this prescription for ${intake.email}? It will be released for fulfillment.`,
      )
    ) {
      return;
    }
    run(() =>
      signPrescription({
        intakeId: intake.id,
        protocolName: protocol,
        items: parseItems(items),
        note,
      }),
    );
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
        <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-sky-300">
          AWAITING SIGN-OFF
        </span>
      </div>

      {intake.answers.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowAnswers((v) => !v)}
            className="text-[11px] tracking-widest text-accent hover:text-accent-soft"
          >
            {showAnswers ? 'HIDE INTAKE ↑' : 'VIEW INTAKE ↓'}
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

      {open === null && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen('sign')}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            Sign prescription
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

      {/* Sign panel */}
      {open === 'sign' && (
        <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-4 md:p-5 space-y-4">
          <div className="text-[10px] tracking-widest text-accent">
            DRAFT THE PRESCRIPTION
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
              PROTOCOL NAME
            </label>
            <input
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              placeholder="Recover Protocol"
              className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
              ITEMS — ONE PER LINE, e.g. BPC-157, 250 mcg daily
            </label>
            <textarea
              value={items}
              onChange={(e) => setItems(e.target.value)}
              rows={3}
              placeholder={'BPC-157, 250 mcg daily SQ\nTB-500, 2 mg weekly SQ'}
              className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
              CLINICAL NOTE (OPTIONAL)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={sign}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-soft disabled:opacity-50"
            >
              {busy ? 'Signing…' : 'Sign & release'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-full border border-line bg-surface px-4 py-2 text-xs tracking-wider text-foreground/85 transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Decline panel */}
      {open === 'decline' && (
        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 md:p-5">
          <div className="mb-3 text-[10px] tracking-widest text-red-300">
            CLINICAL REASON FOR DECLINE
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Logged on the patient's chart…"
            className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || !note.trim()}
              onClick={() =>
                run(() => declineClinically({ intakeId: intake.id, note }))
              }
              className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-40"
            >
              {busy ? 'Working…' : 'Confirm decline'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(null)}
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
