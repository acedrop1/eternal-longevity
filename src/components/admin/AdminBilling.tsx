'use client';

import { useState, type ReactNode } from 'react';
import {
  adminChargeOnce,
  adminCreateSubscription,
  adminRefund,
  adminSendCardLink,
  type AdminBillingResult,
} from '@/lib/admin-billing-actions';
import { cn } from '@/lib/utils';

export interface BillingCustomer {
  id: string;
  name: string;
  email: string;
}

const inputClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3 text-base text-foreground placeholder-foreground/30 transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

const labelClass = 'mb-1.5 block text-[11px] tracking-wider text-foreground/60';

/* ================================================================== */

export function AdminBilling({
  customers,
  live,
}: {
  customers: BillingCustomer[];
  live: boolean;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const selected = customers.find((c) => c.id === customerId);

  return (
    <div className="space-y-6">
      {!live && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Billing isn&apos;t connected yet. The panels below are live UI — they
          start working the moment Stripe and Supabase keys are set. See
          BACKEND_SETUP.md.
        </div>
      )}

      {/* Customer picker */}
      <section className="rounded-3xl border border-line bg-surface p-6 md:p-7">
        <div className="mb-1 text-[10px] tracking-widest text-accent">
          CUSTOMER
        </div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Who are you billing?
        </h2>
        {customers.length === 0 ? (
          <p className="text-sm text-foreground/55">
            No members yet. Members appear here once they sign up.
          </p>
        ) : (
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={cn(inputClass, 'appearance-none')}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.email}
              </option>
            ))}
          </select>
        )}
        {selected && (
          <p className="mt-3 text-xs text-foreground/55">
            Every action below applies to{' '}
            <span className="text-foreground/85">{selected.name}</span> and
            bills the card they have on file with Stripe.
          </p>
        )}
      </section>

      {selected && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CardLinkPanel userId={selected.id} email={selected.email} />
          <SubscriptionPanel userId={selected.id} />
          <ChargePanel userId={selected.id} name={selected.name} />
          <RefundPanel />
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Shared panel pieces                                                */
/* ================================================================== */

function Panel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6 md:p-7">
      <div className="mb-1 text-[10px] tracking-widest text-accent">
        {eyebrow}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1 mb-5 text-sm leading-relaxed text-foreground/55">
        {description}
      </p>
      {children}
    </section>
  );
}

function SubmitButton({
  busy,
  label,
  tone = 'accent',
}: {
  busy: boolean;
  label: string;
  tone?: 'accent' | 'danger';
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50',
        tone === 'danger'
          ? 'bg-red-500/90 text-white hover:bg-red-500'
          : 'bg-accent text-black hover:bg-accent-soft',
      )}
    >
      {busy && (
        <svg
          className="animate-spin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="3"
            strokeOpacity="0.25"
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
      {busy ? 'Working…' : label}
    </button>
  );
}

function ResultBanner({ result }: { result: AdminBillingResult | null }) {
  if (!result) return null;
  return (
    <div
      className={cn(
        'mt-3 rounded-2xl border px-4 py-3 text-sm',
        result.ok
          ? 'border-accent/30 bg-accent/10 text-accent'
          : 'border-red-500/30 bg-red-500/10 text-red-200',
      )}
    >
      <p>{result.message}</p>
      {result.url && (
        <p className="mt-2 break-all text-xs text-foreground/70">
          Link: {result.url}
        </p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Panels                                                             */
/* ================================================================== */

function CardLinkPanel({ userId }: { userId: string; email: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminBillingResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      setResult(await adminSendCardLink(userId));
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      eyebrow="ADD A CARD"
      title="Send a card link"
      description="Emails the customer a secure Stripe page to save a card. Use this when they have no card on file."
    >
      <form onSubmit={onSubmit}>
        <SubmitButton busy={busy} label="Create & email card link" />
      </form>
      <ResultBanner result={result} />
    </Panel>
  );
}

function SubscriptionPanel({ userId }: { userId: string }) {
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<'monthly' | 'quarterly' | 'annual'>(
    'monthly',
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminBillingResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      setResult(
        await adminCreateSubscription({
          userId,
          productName,
          amountDollars: Number(amount) || 0,
          cadence,
        }),
      );
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      eyebrow="SUBSCRIPTION"
      title="Create a subscription"
      description="Starts a recurring charge against the customer's saved card."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>PROTOCOL / PRODUCT NAME</label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Recover Protocol"
            required
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>AMOUNT (USD)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="160.00"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>BILLED</label>
            <select
              value={cadence}
              onChange={(e) =>
                setCadence(
                  e.target.value as 'monthly' | 'quarterly' | 'annual',
                )
              }
              className={cn(inputClass, 'appearance-none')}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
        <SubmitButton busy={busy} label="Create subscription" />
      </form>
      <ResultBanner result={result} />
    </Panel>
  );
}

function ChargePanel({ userId, name }: { userId: string; name: string }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminBillingResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(amount) || 0;
    if (
      !window.confirm(
        `Charge ${name}'s card $${dollars.toFixed(2)} now? This bills them immediately.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      setResult(
        await adminChargeOnce({ userId, amountDollars: dollars, description }),
      );
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      eyebrow="ONE-OFF CHARGE"
      title="Charge the card"
      description="Bills the customer's saved card a single amount — an add-on, an adjustment, or a manual cycle."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>AMOUNT (USD)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="75.00"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>DESCRIPTION</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cycle 2 — Recover Protocol"
            className={inputClass}
          />
        </div>
        <SubmitButton busy={busy} label="Charge card" />
      </form>
      <ResultBanner result={result} />
    </Panel>
  );
}

function RefundPanel() {
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminBillingResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const partial = amount.trim()
      ? ` $${(Number(amount) || 0).toFixed(2)} of`
      : ' all of';
    if (
      !window.confirm(`Refund${partial} payment ${paymentId.trim()}?`)
    ) {
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      setResult(
        await adminRefund({
          paymentIntentId: paymentId,
          amountDollars: amount.trim() ? Number(amount) || 0 : undefined,
        }),
      );
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      eyebrow="REFUND"
      title="Refund a payment"
      description="Refund a Stripe payment in full, or enter an amount for a partial refund."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>STRIPE PAYMENT ID</label>
          <input
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            placeholder="pi_3Q..."
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>
            AMOUNT (USD) — LEAVE BLANK FOR FULL REFUND
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Full refund"
            className={inputClass}
          />
        </div>
        <SubmitButton busy={busy} label="Issue refund" tone="danger" />
      </form>
      <ResultBanner result={result} />
    </Panel>
  );
}
