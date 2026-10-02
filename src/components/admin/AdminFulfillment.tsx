'use client';

import { useState } from 'react';
import {
  submitDraftOrder,
  submitToPharmacy,
  type FulfillmentResult,
} from '@/lib/fulfillment-actions';
import { cn } from '@/lib/utils';
import { StatusBadge, indexCard } from '@/components/admin/IndexTable';

export interface ReadyRxView {
  /** 'prescription' = a freshly signed Rx; 'draft' = an auto-generated refill. */
  kind: 'prescription' | 'draft';
  id: string;
  patientName: string;
  protocolName: string;
}



/**
 * Signed prescriptions that never joined the board (for example from before
 * it existed). Paid orders join the board by themselves.
 */
export function AdminFulfillment({
  readyPrescriptions,
}: {
  readyPrescriptions: ReadyRxView[];
}) {
  return (
    <section className={indexCard}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/10 px-4 py-3">
        <h2 className="text-[14px] font-semibold text-ink">
          Signed prescriptions not on the board{' '}
          <span className="font-normal tabular-nums text-ink/60">{readyPrescriptions.length}</span>
        </h2>
        <p className="text-[12px] text-ink/65">Add one only if it is missing from the list above.</p>
      </div>
      {readyPrescriptions.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-ink/65">Nothing waiting.</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {readyPrescriptions.map((rx) => (
            <RxRow key={rx.id} rx={rx} />
          ))}
        </ul>
      )}
    </section>
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
    <li className="px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-medium text-ink">
            {rx.patientName}
            {rx.kind === 'draft' && <StatusBadge tone="info">Refill</StatusBadge>}
          </p>
          <p className="text-[12px] text-ink/65">{rx.protocolName}</p>
        </div>
        <button
          type="button"
          disabled={busy || done}
          onClick={submit}
          className={cn(
            'min-h-[40px] flex-shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors md:min-h-[32px]',
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
    </li>
  );
}

