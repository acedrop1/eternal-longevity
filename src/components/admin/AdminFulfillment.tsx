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

export interface SubmittedOrderView {
  id: string;
  orderRef: string;
  patientName: string;
  status: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  submitted: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
  accepted: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  shipped: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
  delivered: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
  canceled: 'border-line bg-surface text-foreground/45',
};

export function AdminFulfillment({
  readyPrescriptions,
  submittedOrders,
  live,
}: {
  readyPrescriptions: ReadyRxView[];
  submittedOrders: SubmittedOrderView[];
  live: boolean;
}) {
  return (
    <div className="space-y-6">
      {!live && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Demo data. Real prescriptions and orders flow through once Supabase is
          connected.
        </div>
      )}

      {/* Ready to submit */}
      <section className="rounded-3xl border border-line bg-surface p-6 md:p-7">
        <div className="mb-1 text-[10px] tracking-widest text-accent">
          READY TO SUBMIT
        </div>
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
          Signed prescriptions
        </h2>
        <p className="mb-5 text-sm text-foreground/55 leading-relaxed">
          A physician has signed these off. Submit each one to Kaduceus — they
          drop-ship straight to the patient.
        </p>
        {readyPrescriptions.length === 0 ? (
          <p className="text-sm text-foreground/55">
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

      {/* Submitted orders */}
      <section className="rounded-3xl border border-line bg-surface p-6 md:p-7">
        <div className="mb-1 text-[10px] tracking-widest text-foreground/50">
          SUBMITTED
        </div>
        <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">
          Orders at the pharmacy
        </h2>
        {submittedOrders.length === 0 ? (
          <p className="text-sm text-foreground/55">
            No orders submitted yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-widest text-foreground/45">
                  <th className="px-2 py-2 font-medium">ORDER</th>
                  <th className="px-2 py-2 font-medium">PATIENT</th>
                  <th className="px-2 py-2 font-medium">STATUS</th>
                  <th className="px-2 py-2 font-medium text-right">TRACKING</th>
                </tr>
              </thead>
              <tbody>
                {submittedOrders.map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="px-2 py-3 font-mono text-xs text-foreground/85">
                      {o.orderRef}
                    </td>
                    <td className="px-2 py-3 text-foreground">
                      {o.patientName}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-widest',
                          STATUS_STYLE[o.status] ?? STATUS_STYLE.canceled,
                        )}
                      >
                        {o.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right text-foreground/65">
                      {o.trackingNumber
                        ? `${o.trackingCarrier ?? ''} ${o.trackingNumber}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    <div className="rounded-2xl border border-line bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            {rx.patientName}
            {rx.kind === 'draft' && (
              <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[9px] tracking-widest text-accent">
                REFILL
              </span>
            )}
          </p>
          <p className="text-xs text-foreground/55">{rx.protocolName}</p>
        </div>
        <button
          type="button"
          disabled={busy || done}
          onClick={submit}
          className={cn(
            'flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold tracking-wider transition-colors',
            done
              ? 'border border-line bg-surface text-foreground/45'
              : 'bg-accent text-black hover:bg-accent-soft disabled:opacity-50',
          )}
        >
          {done ? 'SUBMITTED' : busy ? 'SUBMITTING…' : 'SUBMIT TO KADUCEUS'}
        </button>
      </div>
      {result && (
        <p
          className={cn(
            'mt-3 text-xs',
            result.ok ? 'text-accent' : 'text-red-300',
          )}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
