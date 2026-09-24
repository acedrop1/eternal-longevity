'use client';

import { useState } from 'react';
import {
  pharmacyAcceptOrder,
  pharmacyAddTracking,
  type FulfillmentResult,
} from '@/lib/fulfillment-actions';
import { cn } from '@/lib/utils';

export interface FulfillmentItemView {
  product?: string;
  name?: string;
  strength?: string;
  dose?: string;
  size?: string;
  quantity?: number;
}

export interface PharmacyOrderView {
  id: string;
  orderRef: string;
  patientName: string;
  patientDob: string | null;
  address: {
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  prescriberName: string | null;
  prescriberNpi: string | null;
  items: FulfillmentItemView[];
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

const CARRIERS = ['FedEx', 'UPS', 'USPS', 'DHL'];

export function PharmacyQueue({
  orders,
  live,
}: {
  orders: PharmacyOrderView[];
  live: boolean;
}) {
  if (orders.length === 0) {
    return (
      <p className="rounded-[4px] border border-line bg-surface p-8 text-center text-sm text-foreground/55">
        No orders in the queue. Submitted orders from the clinic appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!live && (
        <div className="rounded-[4px] border border-amber-700/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          Demo data. Real orders flow in once Supabase is connected.
        </div>
      )}
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrderCard({ order }: { order: PharmacyOrderView }) {
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FulfillmentResult | null>(null);
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [tracking, setTracking] = useState('');

  async function accept() {
    setBusy(true);
    setResult(null);
    try {
      const r = await pharmacyAcceptOrder(order.id);
      setResult(r);
      if (r.ok) setStatus('accepted');
    } catch {
      setResult({ ok: false, message: 'Request failed.' });
    } finally {
      setBusy(false);
    }
  }

  async function addTracking(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const r = await pharmacyAddTracking({
        fulfillmentId: order.id,
        carrier,
        trackingNumber: tracking,
      });
      setResult(r);
      if (r.ok) setStatus('shipped');
    } catch {
      setResult({ ok: false, message: 'Request failed.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[4px] border border-line bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[13px] text-foreground/85">
          {order.orderRef}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-0.5 font-mono text-[12px]',
            STATUS_STYLE[status] ?? STATUS_STYLE.canceled,
          )}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {status}
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <div className="mb-1 font-mono text-[12px] text-foreground/60">
            Patient
          </div>
          <p className="text-sm font-medium text-foreground">
            {order.patientName}
          </p>
          {order.patientDob && (
            <p className="text-xs text-foreground/55">DOB {order.patientDob}</p>
          )}
          <div className="mt-3 mb-1 font-mono text-[12px] text-foreground/60">
            Ship to
          </div>
          {order.address ? (
            <p className="text-sm text-foreground/85 leading-relaxed">
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ''}
              <br />
              {order.address.city}, {order.address.state} {order.address.zip}
            </p>
          ) : (
            <p className="text-sm text-foreground/60">No address on file.</p>
          )}
        </div>

        <div>
          <div className="mb-1 font-mono text-[12px] text-foreground/60">
            Prescription
          </div>
          <ul className="space-y-1">
            {order.items.map((it, i) => (
              <li key={i} className="text-sm text-foreground/85">
                {it.product ?? it.name ?? 'Item'}
                <span className="text-foreground/55">
                  {' '}
                  {it.strength ?? it.dose ?? ''} {it.size ?? ''}
                  {it.quantity ? ` ×${it.quantity}` : ''}
                </span>
              </li>
            ))}
          </ul>
          {order.prescriberName && (
            <p className="mt-3 text-xs text-foreground/55">
              Prescriber: {order.prescriberName}
              {order.prescriberNpi ? ` · NPI ${order.prescriberNpi}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Actions by status */}
      <div className="mt-5 border-t border-line pt-5">
        {status === 'submitted' && (
          <button
            type="button"
            disabled={busy}
            onClick={accept}
            className="rounded-full bg-black px-5 py-2.5 text-[13px] text-white transition-colors hover:bg-black/85 disabled:opacity-50 font-mono"
          >
            {busy ? 'Working…' : 'Accept order'}
          </button>
        )}

        {status === 'accepted' && (
          <form
            onSubmit={addTracking}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="mb-1.5 block font-mono text-[12px] text-foreground/60">
                Carrier
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="rounded-[2px] border border-line bg-background px-4 py-2.5 text-sm text-foreground"
              >
                {CARRIERS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[12rem]">
              <label className="mb-1.5 block font-mono text-[12px] text-foreground/60">
                Tracking number
              </label>
              <input
                aria-label="Tracking number"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="1Z…"
                required
                className="w-full rounded-[2px] border border-line bg-background px-4 py-2.5 text-sm text-foreground placeholder-foreground/30"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-black px-5 py-2.5 text-[13px] text-white transition-colors hover:bg-black/85 disabled:opacity-50 font-mono"
            >
              {busy ? 'Working…' : 'Mark shipped'}
            </button>
          </form>
        )}

        {(status === 'shipped' || status === 'delivered') && (
          <p className="text-sm text-foreground/70">
            Shipped
            {order.trackingNumber
              ? ` · ${order.trackingCarrier ?? ''} ${order.trackingNumber}`
              : '.'}
          </p>
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
      </div>
    </section>
  );
}
