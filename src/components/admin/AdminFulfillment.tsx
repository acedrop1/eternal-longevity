'use client';

import { useState } from 'react';
import {
  submitDraftOrder,
  submitToPharmacy,
  type FulfillmentResult,
} from '@/lib/fulfillment-actions';
import { cn } from '@/lib/utils';

export interface ReadyRxView {
  /** 'prescription' = a freshly signed Rx; 'draft' = an auto-generated refill. */
  kind: 'prescription' | 'draft';
  id: string;
  patientName: string;
  protocolName: string;
}



export function AdminFulfillment({
  readyPrescriptions,
  live,
}: {
  readyPrescriptions: ReadyRxView[];
  live: boolean;
}) {
  return (
    <div className="space-y-6">
      {!live && (
        <div className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Demo data. Real prescriptions and orders flow through once Supabase is
          connected.
        </div>
      )}

      {/* Ready to submit */}
      <section className="rounded-shell bg-milk p-6 md:p-7">
        <div className="mb-1 text-[13px] font-medium text-ink/55">
          Ready to submit
        </div>
        <h2 className="mb-1 text-[20px] font-semibold tracking-[-0.03em] text-ink">
          Signed prescriptions
        </h2>
        <p className="mb-5 text-sm text-ink/55 leading-relaxed">
          Signed prescriptions that never joined the board, for example from before it existed. Paid orders join the board by themselves; add one here only if it is missing.
        </p>
        {readyPrescriptions.length === 0 ? (
          <p className="text-sm text-ink/55">
            Nothing waiting. Newly signed prescriptions appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {readyPrescriptions.map((rx) => (
              <RxRow key={rx.id} rx={rx} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

function RxRow({ rx }: { rx: ReadyRxView }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FulfillmentResult | null>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      setResult(
        rx.kind === 'draft'
          ? await submitDraftOrder(rx.id)
          : await submitToPharmacy(rx.id),
      );
    } catch {
      setResult({ ok: false, message: 'Request failed.' });
    } finally {
      setBusy(false);
    }
  }

  const done = result?.ok === true;

  return (
    <div className="rounded-inner border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            {rx.patientName}
            {rx.kind === 'draft' && (
              <span className="rounded-full border border-sky-600/25 bg-sky-50 px-2 py-0.5 text-[12px] font-medium text-sky-800">
                Refill
              </span>
            )}
          </p>
          <p className="text-xs text-ink/55">{rx.protocolName}</p>
        </div>
        <button
          type="button"
          disabled={busy || done}
          onClick={submit}
          className={cn(
            'flex-shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
            done
              ? 'bg-milk text-ink/60'
              : 'bg-ink text-white hover:bg-ink/85 disabled:opacity-50',
          )}
        >
          {done ? 'Added' : busy ? 'Adding…' : 'Add to board'}
        </button>
      </div>
      {result && (
        <p
          className={cn(
            'mt-3 text-xs',
            result.ok ? 'text-emerald-700' : 'text-red-700',
          )}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}

