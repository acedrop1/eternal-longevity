'use client';

import { useConfirm } from '@/components/ui/useConfirm';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  adminChargeOnce,
  adminCreateSubscription,
  adminRefund,
  adminRefundOrder,
  adminSendCardLink,
  type AdminBillingResult,
  type AdminCadence,
} from '@/lib/admin-billing-actions';
import {
  createPromoAction,
  deletePromoAction,
  listPromosAction,
  togglePromoAction,
  updatePromoAction,
  type PromoCode,
} from '@/lib/promo-db';
import { cn } from '@/lib/utils';
import { SHIPPING_PRICE } from '@/lib/shipping';

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
  'w-full rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30';

const labelClass = 'mb-1.5 block text-[13px] font-medium text-ink/70';

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
        <div className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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
          label="MRR (active plans)"
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
        <section className="rounded-shell bg-milk p-6">
          <div className="mb-4 text-[13px] font-medium text-ink/65">
            Recent activity
          </div>
          <ul className="divide-y divide-ink/10">
            {summary.recent.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-[12px] text-ink/80">
                  {r.label}
                </span>
                <span className="text-[12px] tabular-nums text-ink/60">{r.when}</span>
                <span className="text-sm font-medium text-ink tabular-nums">
                  {money(r.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bill a customer — search */}
      <section className="rounded-shell bg-milk p-6 md:p-7">
        <div className="mb-1 text-[13px] font-medium text-ink/65">
          Bill a customer
        </div>
        <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.03em] text-ink">
          {selected ? selected.name : 'Search for a customer'}
        </h2>

        {selected ? (
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setQuery('');
            }}
            className="text-[12px] text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
          >
            ← Choose a different customer
          </button>
        ) : (
          <div>
            <input
              aria-label="Search customers by name or email"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className={inputClass}
            />
            {query.trim() && (
              <ul className="mt-2 overflow-hidden rounded-inner bg-white ring-1 ring-ink/10">
                {matches.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-ink/60">
                    No customers match.
                  </li>
                ) : (
                  matches.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className="flex w-full items-center justify-between gap-3 border-b border-ink/10 px-4 py-3 text-left transition-colors last:border-0 hover:bg-milk"
                      >
                        <span className="text-sm font-medium text-ink">
                          {c.name}
                        </span>
                        <span className="truncate text-xs text-ink/65">
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

      {/* Codes are not customer-specific, so this sits outside the selection. */}
      <PromoPanel />
    </div>
  );
}

function PromoPanel() {
  const [confirm, confirmDialog] = useConfirm();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  // The code being edited; null = the form creates a new one.
  const [editing, setEditing] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [maxRedemptions, setMax] = useState('');
  const [expiresAt, setExpires] = useState('');
  const [includesShipping, setIncludesShipping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminBillingResult | null>(null);

  const load = useCallback(() => {
    void listPromosAction().then(setCodes);
  }, []);
  useEffect(load, [load]);

  function reset() {
    setEditing(null);
    setCode('');
    setKind('percent');
    setValue('');
    setMax('');
    setExpires('');
    setIncludesShipping(false);
  }

  function edit(c: PromoCode) {
    setEditing(c.id);
    setCode(c.code);
    setKind(c.kind);
    setValue(c.kind === 'percent' ? String(c.value) : (c.value / 100).toFixed(2));
    setMax(c.maxRedemptions === null ? '' : String(c.maxRedemptions));
    setExpires(c.expiresAt ? c.expiresAt.slice(0, 10) : '');
    setIncludesShipping(c.includesShipping);
    setResult(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const input = {
        code,
        kind,
        value: Number(value) || 0,
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : undefined,
        expiresAt: expiresAt || undefined,
        includesShipping,
      };
      const r = editing ? await updatePromoAction(editing, input) : await createPromoAction(input);
      setResult(r);
      if (r.ok) {
        reset();
        load();
      }
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, next: boolean) {
    await togglePromoAction(id, next);
    load();
  }

  async function remove(c: PromoCode) {
    if (!(await confirm({ title: `Delete ${c.code}?`, body: 'This can’t be undone.', confirmLabel: 'Delete', danger: true }))) return;
    setResult(await deletePromoAction(c.id));
    if (editing === c.id) reset();
    load();
  }

  return (
    <Panel
      eyebrow="Promotions"
      title="Discount codes"
      description="The discount comes off the order total before the card is charged, so Stripe sees the reduced amount. Codes are redeemed when the order is placed."
    >
      {confirmDialog}
      <form onSubmit={onSubmit} className="space-y-4">
        {editing && (
          <p className="text-[13px] font-medium text-ink">
            Editing {codes.find((c) => c.id === editing)?.code}. Orders already placed keep their discount.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="promo-code" className={labelClass}>
              Code
            </label>
            <input
              id="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH20"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="promo-value" className={labelClass}>
              {kind === 'percent' ? 'Percent off (1–100)' : 'Dollars off'}
            </label>
            <div className="flex gap-2">
              <select
                aria-label="Discount type"
                value={kind}
                onChange={(e) => setKind(e.target.value as 'percent' | 'fixed')}
                className={cn(inputClass, 'w-24 flex-none')}
              >
                <option value="percent">%</option>
                <option value="fixed">$</option>
              </select>
              <input
                id="promo-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                placeholder={kind === 'percent' ? '20' : '25.00'}
                required
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="promo-max" className={labelClass}>
              Max uses — blank for unlimited
            </label>
            <input
              id="promo-max"
              value={maxRedemptions}
              onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="Unlimited"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="promo-expires" className={labelClass}>
              Expires — blank for never
            </label>
            <input
              id="promo-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpires(e.target.value)}
              className={cn(inputClass, '[color-scheme:light]')}
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
          <input
            type="checkbox"
            checked={includesShipping}
            onChange={(e) => setIncludesShipping(e.target.checked)}
            className="h-4 w-4 accent-ink"
          />
          Free shipping too
        </label>
        <div className="flex items-center gap-3">
          <SubmitButton busy={busy} label={editing ? 'Save changes' : 'Create code'} />
          {editing && (
            <button
              type="button"
              onClick={reset}
              className="text-[14px] font-medium text-ink/60 hover:text-ink"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <ResultBanner result={result} />

      {codes.length > 0 && (
        <div className="mt-6 space-y-2">
          {codes.map((c) => {
            const spent =
              c.maxRedemptions !== null && c.redeemedCount >= c.maxRedemptions;
            const expired =
              !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
            return (
              <div
                key={c.id}
                className={cn(
                  'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-inner border bg-white px-4 py-3',
                  editing === c.id ? 'border-ink/40' : 'border-ink/10',
                )}
              >
                <span className="text-[13px] text-ink">
                  {c.code}
                </span>
                <span className="text-xs text-ink/65">
                  {c.kind === 'percent'
                    ? `${c.value}% off`
                    : `${money(c.value)} off`}
                  {c.includesShipping ? ' + free shipping' : ''}
                </span>
                <span className="text-[12px] tabular-nums text-ink/60">
                  {c.redeemedCount}
                  {c.maxRedemptions !== null ? ` / ${c.maxRedemptions}` : ''} used
                  {expired ? ' · expired' : ''}
                  {spent && !expired ? ' · spent' : ''}
                </span>
                <div className="ml-auto flex flex-none items-center gap-2">
                  <button
                    type="button"
                    onClick={() => edit(c)}
                    className="rounded-full border border-ink/10 px-3 py-1 text-[12px] font-medium text-ink/70 transition-colors hover:text-ink"
                  >
                    Edit
                  </button>
                  {c.redeemedCount === 0 && (
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      className="rounded-full border border-ink/10 px-3 py-1 text-[12px] font-medium text-red-700/80 transition-colors hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(c.id, !c.active)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
                      c.active
                        ? 'border-emerald-600/25 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'border-ink/10 text-ink/60 hover:text-ink',
                    )}
                  >
                    {c.active ? 'Active' : 'Off'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
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
    <div className={cn('rounded-shell p-5', tone === 'accent' ? 'bg-butter-soft' : 'bg-milk')}>
      <div className="mb-2 text-[13px] font-medium text-ink/65">
        {label}
      </div>
      <div
        className="text-[28px] font-semibold tracking-[-0.04em] text-ink tabular-nums"
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
    <section className="rounded-shell bg-milk p-6 md:p-7">
      <div className="mb-1 text-[13px] font-medium text-ink/65">
        {eyebrow}
      </div>
      <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
        {title}
      </h3>
      <p className="mt-1 mb-5 text-sm leading-relaxed text-ink/65">
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
        'inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50',
        tone === 'danger'
          ? 'bg-red-700 text-white hover:bg-red-800'
          : 'bg-ink text-white hover:bg-ink/85',
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
        'mt-3 rounded-inner border px-4 py-3 text-sm',
        result.ok
          ? 'border-emerald-600/20 bg-emerald-50 text-emerald-800'
          : 'border-red-600/20 bg-red-50 text-red-700',
      )}
    >
      <p>{result.message}</p>
      {result.url && (
        <p className="mt-2 break-all text-xs text-ink/70">
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
      eyebrow="Add a card"
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
  const [cadence, setCadence] = useState<AdminCadence>('monthly');
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
      eyebrow="Subscription"
      title="Create a subscription"
      description={`Starts a recurring charge against the customer's saved card. Every cycle ships, so enter the amount including shipping: $${SHIPPING_PRICE['2_DAY']} 2-day, $${SHIPPING_PRICE.OVERNIGHT} overnight cold-chain.`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Protocol / product name</label>
          <input
            aria-label="Protocol or product name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="GHK-Cu"
            required
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Amount (USD)</label>
            <input
              aria-label="Subscription amount in US dollars"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="160.00"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Billed</label>
            <select
              value={cadence}
              onChange={(e) =>
                setCadence(e.target.value as AdminCadence)
              }
              className={cn(inputClass, 'appearance-none')}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="sixMonth">Every 6 months</option>
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
  const [confirm, confirmDialog] = useConfirm();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminBillingResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(amount) || 0;
    if (
      !(await confirm({
        title: `Charge ${name}'s card ${money(Math.round(dollars * 100))}?`,
        body: 'This bills them immediately.',
        confirmLabel: 'Charge now',
      }))
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
      eyebrow="One-off charge"
      title="Charge the card"
      description="Bills the customer's saved card a single amount — an add-on, an adjustment, or a manual cycle."
    >
      {confirmDialog}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Amount (USD)</label>
          <input
            aria-label="Charge amount in US dollars"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="75.00"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <input
            aria-label="Charge description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cycle 2 — GHK-Cu"
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
  const [confirm, confirmDialog] = useConfirm();
  const [ref, setRef] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminBillingResult | null>(null);

  // An operator has the order number — it is on the confirmation email, the
  // member's order page and the support ticket. Requiring a pi_ id meant
  // going to Stripe first, which is most of the work they wanted to skip.
  // A pasted pi_ still works, so nothing that used to is broken.
  const trimmed = ref.trim();
  const isStripeId = trimmed.startsWith('pi_');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const partial = amount.trim()
      ? ` ${money(Math.round((Number(amount) || 0) * 100))} of`
      : ' all of';
    if (!(await confirm({ title: `Refund${partial} ${trimmed}?`, body: 'This can’t be undone.', confirmLabel: 'Refund', danger: true }))) {
      return;
    }
    setBusy(true);
    setResult(null);
    const amountDollars = amount.trim() ? Number(amount) || 0 : undefined;
    try {
      setResult(
        isStripeId
          ? await adminRefund({ paymentIntentId: trimmed, amountDollars })
          : await adminRefundOrder({
              orderNumber: trimmed,
              amountDollars,
              reason: reason.trim() || undefined,
            }),
      );
      if (!isStripeId) setReason('');
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      eyebrow="Refund"
      title="Refund an order"
      description="Enter the order number. Refunding by order records it on the member's timeline and clears the paid flag; a Stripe pi_ id still works for anything without an order."
    >
      {confirmDialog}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="refund-ref" className={labelClass}>
            Order number
          </label>
          <input
            id="refund-ref"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="EL-1042"
            required
            className={inputClass}
          />
          {isStripeId && (
            <p className="mt-1.5 text-xs text-ink/65">
              Refunding a raw Stripe payment — this will not appear on the
              member&apos;s order timeline.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="refund-amount" className={labelClass}>
            Amount (USD) — leave blank for full refund
          </label>
          <input
            id="refund-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Full refund"
            className={inputClass}
          />
        </div>
        {!isStripeId && (
          <div>
            <label htmlFor="refund-reason" className={labelClass}>
              Reason (shown on the order timeline)
            </label>
            <input
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged in transit"
              className={inputClass}
            />
          </div>
        )}
        <SubmitButton busy={busy} label="Issue refund" tone="danger" />
      </form>
      <ResultBanner result={result} />
    </Panel>
  );
}
