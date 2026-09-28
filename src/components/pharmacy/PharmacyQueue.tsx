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
  submitted: 'border-amber-600/25 bg-amber-50 text-amber-800',
  accepted: 'border-sky-600/25 bg-sky-50 text-sky-800',
  shipped: 'border-emerald-600/20 bg-emerald-50 text-emerald-800',
  delivered: 'border-emerald-600/20 bg-emerald-50 text-emerald-800',
  canceled: 'border-ink/10 bg-milk text-ink/60',
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
      <p className="rounded-shell bg-milk p-8 text-center text-sm text-ink/60">
        No orders in the queue. Submitted orders from the clinic appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!live && (
        <div className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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
    <section className="rounded-shell bg-milk p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-ink/85">
          {order.orderRef}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px]',
            STATUS_STYLE[status] ?? STATUS_STYLE.canceled,
          )}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {status}
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <div className="mb-1 text-[13px] font-medium text-ink/55">
            Patient
          </div>
          <p className="text-sm font-medium text-ink">
            {order.patientName}
          </p>
          {order.patientDob && (
            <p className="text-xs text-ink/55">DOB {order.patientDob}</p>
          )}
          <div className="mt-3 mb-1 text-[13px] font-medium text-ink/55">
            Ship to
          </div>
          {order.address ? (
            <p className="text-sm text-ink/85 leading-relaxed">
              {order.address.line1}
              {order.address.line2 ? `, ${order.address.line2}` : ''}
              <br />
              {order.address.city}, {order.address.state} {order.address.zip}
            </p>
          ) : (
            <p className="text-sm text-ink/60">No address on file.</p>
          )}
        </div>

        <div>
          <div className="mb-1 text-[13px] font-medium text-ink/55">
            Prescription
          </div>
          <ul className="space-y-1">
            {order.items.map((it, i) => (
              <li key={i} className="text-sm text-ink/85">
                {it.product ?? it.name ?? 'Item'}
                <span className="text-ink/55">
                  {' '}
                  {it.strength ?? it.dose ?? ''} {it.size ?? ''}
                  {it.quantity ? ` ×${it.quantity}` : ''}
                </span>
              </li>
            ))}
          </ul>
          {order.prescriberName && (
            <p className="mt-3 text-xs text-ink/55">
              Prescriber: {order.prescriberName}
              {order.prescriberNpi ? ` · NPI ${order.prescriberNpi}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Actions by status */}
      <div className="mt-5 border-t border-ink/10 pt-5">
        {status === 'submitted' && (
          <button
            type="button"
            disabled={busy}
            onClick={accept}
            className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-50"
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
              <label className="mb-1.5 block text-[13px] font-medium text-ink/70">
                Carrier
              </label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="rounded-inner bg-white px-4 py-2.5 text-[16px] text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-ink/30"
              >
                {CARRIERS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[12rem]">
              <label className="mb-1.5 block text-[13px] font-medium text-ink/70">
                Tracking number
              </label>
              <input
                aria-label="Tracking number"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="1Z…"
                required
                className="w-full rounded-inner bg-white px-4 py-2.5 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/40 focus:outline-none focus:ring-ink/30"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Mark shipped'}
            </button>
          </form>
        )}

        {(status === 'shipped' || status === 'delivered') && (
          <p className="text-sm text-ink/70">
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
              result.ok ? 'text-emerald-700' : 'text-red-700',
            )}
          >
            {result.message}
          </p>
        )}
      </div>
    </section>
  );
}
