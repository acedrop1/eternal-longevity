'use client';

import { useMemo, useState, type ReactNode } from 'react';
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

export interface BillingSummary {
  activeSubscriptions: number;
  cycleRevenueCents: number;
  paidOrders: number;
  lifetimeRevenueCents: number;
  recent: { label: string; amountCents: number; when: string }[];
}

const inputClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3 text-base text-foreground placeholder-foreground/30 transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

const labelClass = 'mb-1.5 block text-[11px] tracking-wider text-foreground/60';

function money(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/* ================================================================== */

export function AdminBilling({
  customers,
  live,
  summary,
}: {
  customers: BillingCustomer[];
  live: boolean;
  summary: BillingSummary;
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = customers.find((c) => c.id === selectedId) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [customers, query]);

  return (
    <div className="space-y-6">
      {!live && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Demo figures. Real revenue and billing actions go live once Stripe and
          Supabase are connected.
        </div>
      )}

      {/* Overview */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Active subscriptions"
          value={String(summary.activeSubscriptions)}
        />
        <Metric
          label="Recurring / cycle"
          value={money(summary.cycleRevenueCents)}
          tone="accent"
        />
        <Metric label="Paid orders" value={String(summary.paidOrders)} />
        <Metric
          label="Lifetime revenue"
          value={money(summary.lifetimeRevenueCents)}
          tone="accent"
        />
      </section>

      {/* Recent activity */}
      {summary.recent.length > 0 && (
        <section className="rounded-3xl border border-line bg-surface p-6">
          <div className="mb-4 text-[10px] tracking-widest text-foreground/50">
            RECENT ACTIVITY
          </div>
          <ul className="divide-y divide-line">
            {summary.recent.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="font-mono text-xs text-foreground/80">
                  {r.label}
                </span>
                <span className="text-xs text-foreground/50">{r.when}</span>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {money(r.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bill a customer — search */}
      <section className="rounded-3xl border border-line bg-surface p-6 md:p-7">
        <div className="mb-1 text-[10px] tracking-widest text-accent">
          BILL A CUSTOMER
        </div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          {selected ? selected.name : 'Search for a customer'}
        </h2>

        {selected ? (
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setQuery('');
            }}
            className="text-xs tracking-wider text-accent hover:text-accent-soft"
          >
            ← Choose a different customer
          </button>
        ) : (
          <div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className={inputClass}
            />
            {query.trim() && (
              <ul className="mt-2 overflow-hidden rounded-2xl border border-line">
                {matches.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-foreground/45">
                    No customers match.
                  </li>
                ) : (
                  matches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-background"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {c.name}
                        </span>
                        <span className="truncate text-xs text-foreground/55">
                          {c.email}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}
      </section>

      {selected && (
        <div className="grid gap-6 lg:grid-cols-2">
          <CardLinkPanel userId={selected.id} />
          <SubscriptionPanel userId={selected.id} />
          <ChargePanel userId={selected.id} name={selected.name} />
          <RefundPanel />
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'accent';
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-2 text-[10px] tracking-widest text-foreground/55">
        {label.toUpperCase()}
      </div>
      <div
        className={cn(
          'text-2xl font-semibold tracking-tight tabular-nums',
          tone === 'accent' ? 'text-accent' : 'text-foreground',
        )}
      >
        {value}
      </div>
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

function CardLinkPanel({ userId }: { userId: string }) {
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
        `Charge ${name}'s card ${money(Math.round(dollars * 100))} now? This bills them immediately.`,
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
      ? ` ${money(Math.round((Number(amount) || 0) * 100))} of`
      : ' all of';
    if (!window.confirm(`Refund${partial} payment ${paymentId.trim()}?`)) {
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
