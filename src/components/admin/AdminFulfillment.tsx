'use client';

import { useState } from 'react';
import {
  pharmacyAddTracking,
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
  submitted: 'border-amber-700/30 bg-amber-500/10 text-amber-800',
  accepted: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  shipped: 'border-emerald-700/30 bg-emerald-600/10 text-emerald-800',
  delivered: 'border-emerald-700/30 bg-emerald-600/10 text-emerald-800',
  canceled: 'border-line bg-surface text-foreground/60',
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
        <div className="rounded-[4px] border border-amber-700/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          Demo data. Real prescriptions and orders flow through once Supabase is
          connected.
        </div>
      )}

      {/* Ready to submit */}
      <section className="rounded-[4px] border border-line bg-surface p-6 md:p-7">
        <div className="mb-1 font-mono text-[12px] text-foreground/60">
          Ready to submit
        </div>
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-foreground">
          Signed prescriptions
        </h2>
        <p className="mb-5 text-sm text-foreground/55 leading-relaxed">
          A physician has signed these off. Send each one to the pharmacy — they
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
      <section className="rounded-[4px] border border-line bg-surface p-6 md:p-7">
        <div className="mb-1 font-mono text-[12px] text-foreground/60">
          Submitted
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
                <tr className="text-left font-mono text-[12px] text-foreground/60">
                  <th className="px-2 py-2 font-normal">Order</th>
                  <th className="px-2 py-2 font-normal">Patient</th>
                  <th className="px-2 py-2 font-normal">Status</th>
                  <th className="px-2 py-2 font-normal text-right">Tracking</th>
                </tr>
              </thead>
              <tbody>
                {submittedOrders.map((o) => (
                  <tr key={o.id} className="border-t border-line">
                    <td className="px-2 py-3 font-mono text-[12px] text-foreground/85">
                      {o.orderRef}
                    </td>
                    <td className="px-2 py-3 text-foreground">
                      {o.patientName}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border px-2 py-0.5 font-mono text-[12px]',
                          STATUS_STYLE[o.status] ?? STATUS_STYLE.canceled,
                        )}
                      >
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                        {o.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right font-mono text-[12px] text-foreground/65">
                      {o.trackingNumber ? (
                        `${o.trackingCarrier ?? ''} ${o.trackingNumber}`
                      ) : o.status === 'canceled' ? (
                        '—'
                      ) : (
                        <TrackingForm fulfillmentId={o.id} />
                      )}
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
    <div className="rounded-[4px] border border-line bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            {rx.patientName}
            {rx.kind === 'draft' && (
              <span className="rounded-[2px] border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-[12px] text-accent">
                Refill
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
            'flex-shrink-0 rounded-full px-4 py-2 font-mono text-[12px] transition-colors',
            done
              ? 'border border-line bg-surface text-foreground/60'
              : 'bg-black text-white hover:bg-black/85 disabled:opacity-50',
          )}
        >
          {done ? 'Submitted' : busy ? 'Submitting…' : 'Mark sent to pharmacy'}
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

const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL'];

/**
 * The pharmacy ships from its own platform and sends tracking back; the team
 * keys it in here, which marks the order shipped and emails/texts the patient.
 */
function TrackingForm({ fulfillmentId }: { fulfillmentId: string }) {
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FulfillmentResult | null>(null);

  if (result?.ok) return <span className="text-accent">{carrier} {tracking.trim()}</span>;

  async function save() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await pharmacyAddTracking({ fulfillmentId, carrier, trackingNumber: tracking }));
    } catch {
      setResult({ ok: false, message: 'Request failed.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1.5">
        <select
          aria-label="Carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="rounded-[2px] border border-line bg-background px-2 py-1.5 text-[12px] text-foreground"
        >
          {CARRIERS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          aria-label="Tracking number"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Tracking number"
          className="w-40 rounded-[2px] border border-line bg-background px-2 py-1.5 text-[12px] text-foreground placeholder-foreground/35"
        />
        <button
          type="button"
          disabled={busy || !tracking.trim()}
          onClick={save}
          className="rounded-full bg-black px-3 py-1.5 text-[12px] text-white transition-colors hover:bg-black/85 disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Shipped'}
        </button>
      </div>
      {result && !result.ok && <span className="text-red-700">{result.message}</span>}
    </div>
  );
}
