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
import { paymentState, type PaymentState } from '@/lib/order-health';
import { statusLabel, type OrderStatus } from '@/lib/orders';
import {
  MetricCard,
  SectionCard,
  SettingsRow,
  StatusBadge,
  fieldInput,
  fieldLabel,
  plainTable,
  plainTd,
  secondaryButton,
  th,
  type BadgeTone,
} from '@/components/admin/IndexTable';

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
  recent: {
    label: string;
    amountCents: number;
    when: string;
    /** Order status, and whether the money landed (paid_confirmed_at). */
    status?: string;
    paid?: boolean;
  }[];
}

const inputClass = fieldInput;

const labelClass = fieldLabel;

function money(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/** Paid is paid_confirmed_at and nothing else (lib/order-health), as on the Orders board. */
const PAYMENT: Record<PaymentState, [string, BadgeTone]> = {
  paid: ['Paid', 'success'],
  pending: ['Pending', 'neutral'],
  awaiting: ['Awaiting payment', 'attention'],
  failed: ['Payment failed', 'critical'],
};

function paymentBadge(r: BillingSummary['recent'][number]): [string, BadgeTone] | null {
  if (!r.status) return null;
  const state = paymentState({ status: r.status as OrderStatus, paidAt: r.paid ? 1 : undefined });
  if (state) return PAYMENT[state];
  const words = statusLabel(r.status).toLowerCase();
  return [words.charAt(0).toUpperCase() + words.slice(1), 'neutral'];
}

const orderRef = (n: string) => (/^\d+$/.test(n) ? `#${n}` : n);

/* ================================================================== */

export function AdminBilling({
  customers,
  live,
  summary,
  sampleCodes,
}: {
  customers: BillingCustomer[];
  live: boolean;
  summary: BillingSummary;
  /** Dev-only fixture codes; when set, nothing is read from the database. */
  sampleCodes?: PromoCode[];
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
    <div className="space-y-5">
      {!live && (
        <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
          {sampleCodes ? 'Sample data (dev only). ' : 'Demo figures. '}
          Real revenue and billing actions go live once Stripe and Supabase are
          connected.
        </p>
      )}

      {/* Overview */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Active subscriptions" value={String(summary.activeSubscriptions)} />
        <MetricCard label="MRR (active plans)" value={money(summary.cycleRevenueCents)} />
        <MetricCard label="Paid orders" value={String(summary.paidOrders)} />
        <MetricCard label="Lifetime revenue" value={money(summary.lifetimeRevenueCents)} />
      </section>

      {/* Recent payments */}
      <SectionCard flush title="Recent payments" description="The latest orders and whether their payment landed.">
        {summary.recent.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-ink/65">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={cn(plainTable, 'min-w-[340px]')}>
              <thead>
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Date</th>
                  <th className={cn(th, 'text-right')}>Amount</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.map((r, i) => {
                  const badge = paymentBadge(r);
                  return (
                    <tr key={i}>
                      <td className={cn(plainTd, 'font-medium')}>{orderRef(r.label)}</td>
                      <td className={cn(plainTd, 'tabular-nums text-ink/70')}>{r.when}</td>
                      <td className={cn(plainTd, 'text-right tabular-nums')}>{money(r.amountCents)}</td>
                      <td className={plainTd}>
                        {badge ? <StatusBadge tone={badge[1]}>{badge[0]}</StatusBadge> : <span className="text-ink/35">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Codes are not customer-specific, so this sits outside the selection. */}
      <PromoPanel sampleCodes={sampleCodes} />

      {/* Bill a customer — search */}
      <div className="space-y-5 border-t border-ink/10 pt-5">
        <SettingsRow
          title="Bill a customer"
          description="Search for a member to send a card link, start a subscription, charge their card or refund an order. Customers add their own cards through Stripe — the app never stores a raw card number."
        >
          <SectionCard title={selected ? selected.name : 'Search for a customer'} description={selected?.email || undefined}>
            {selected ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setQuery('');
                }}
                className="text-[13px] text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
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
                  <ul className="mt-2 overflow-hidden rounded-thumb bg-white ring-1 ring-ink/10">
                    {matches.length === 0 ? (
                      <li className="px-3 py-2.5 text-[13px] text-ink/60">
                        No customers match.
                      </li>
                    ) : (
                      matches.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(c.id)}
                            className="flex w-full items-center justify-between gap-3 border-b border-ink/10 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-milk"
                          >
                            <span className="text-[13px] font-medium text-ink">
                              {c.name}
                            </span>
                            <span className="truncate text-[12px] text-ink/65">
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
          </SectionCard>
        </SettingsRow>

        {selected && (
          <>
            <SettingsRow title="Card on file" description="Without a saved card nothing below can be charged.">
              <CardLinkPanel userId={selected.id} />
            </SettingsRow>
            <SettingsRow title="Subscription" description="A recurring charge against the saved card.">
              <SubscriptionPanel userId={selected.id} />
            </SettingsRow>
            <SettingsRow title="One-off charge" description="Bills the saved card once, after you confirm.">
              <ChargePanel userId={selected.id} name={selected.name} />
            </SettingsRow>
            <SettingsRow title="Refund" description="By order number, or a Stripe pi_ id. Asks before it refunds.">
              <RefundPanel />
            </SettingsRow>
          </>
        )}
      </div>
    </div>
  );
}

function PromoPanel({ sampleCodes }: { sampleCodes?: PromoCode[] }) {
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
    if (sampleCodes) setCodes(sampleCodes);
    else void listPromosAction().then(setCodes);
  }, [sampleCodes]);
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

  /** Bring the form into view and put the cursor in the code field. */
  function focusForm() {
    const el = document.getElementById('promo-code') as HTMLInputElement | null;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el?.focus({ preventScroll: true });
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
    focusForm();
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
    // Sample codes live only in this page; flip them locally.
    if (sampleCodes) {
      setCodes((cs) => cs.map((c) => (c.id === id ? { ...c, active: next } : c)));
      return;
    }
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
    <>
      {confirmDialog}
      <SectionCard
        flush
        title="Discount codes"
        description="The discount comes off the order total before the card is charged, so Stripe sees the reduced amount. Codes are redeemed when the order is placed."
        actions={
          <button
            type="button"
            onClick={() => {
              reset();
              setResult(null);
              focusForm();
            }}
            className={secondaryButton}
          >
            Create discount
          </button>
        }
      >
        {codes.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-ink/65">No discount codes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={plainTable}>
              <thead>
                <tr>
                  <th className={th}>Code</th>
                  <th className={th}>Discount</th>
                  <th className={th}>Uses</th>
                  <th className={th}>Status</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const spent =
                    c.maxRedemptions !== null && c.redeemedCount >= c.maxRedemptions;
                  const expired =
                    !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
                  return (
                    <tr key={c.id} className={cn(editing === c.id && 'bg-butter/30')}>
                      <td className={cn(plainTd, 'font-semibold')}>{c.code}</td>
                      <td className={cn(plainTd, 'text-ink/80')}>
                        {c.kind === 'percent' ? `${c.value}% off` : `${money(c.value)} off`}
                        {c.includesShipping ? <span className="text-ink/60"> + free shipping</span> : ''}
                      </td>
                      <td className={cn(plainTd, 'tabular-nums text-ink/70')}>
                        {c.redeemedCount}
                        {c.maxRedemptions !== null ? ` / ${c.maxRedemptions}` : ''} used
                        {expired ? ' · expired' : ''}
                        {spent && !expired ? ' · spent' : ''}
                      </td>
                      <td className={plainTd}>
                        <button
                          type="button"
                          onClick={() => toggle(c.id, !c.active)}
                          title={c.active ? 'Turn this code off' : 'Turn this code on'}
                          aria-label={`${c.code} is ${c.active ? 'active' : 'off'}. ${c.active ? 'Turn off' : 'Turn on'}`}
                          className="rounded-full transition-opacity hover:opacity-75"
                        >
                          <StatusBadge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Active' : 'Off'}</StatusBadge>
                        </button>
                      </td>
                      <td className={cn(plainTd, 'text-right')}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => edit(c)}
                            className="rounded-thumb px-2.5 py-1 text-[12px] font-medium text-ink/75 transition-colors hover:bg-ink/[0.05] hover:text-ink"
                          >
                            Edit
                          </button>
                          {c.redeemedCount === 0 && (
                            <button
                              type="button"
                              onClick={() => remove(c)}
                              className="rounded-thumb px-2.5 py-1 text-[12px] font-medium text-red-700/85 transition-colors hover:bg-red-50 hover:text-red-700"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={editing ? `Edit ${codes.find((c) => c.id === editing)?.code ?? 'code'}` : 'Create discount'}
        description={editing ? 'Orders already placed keep their discount.' : 'A code members enter at checkout.'}
      >
        <form onSubmit={onSubmit} className="space-y-4">
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
                  className={cn(inputClass, 'w-20 flex-none')}
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
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={includesShipping}
              onChange={(e) => setIncludesShipping(e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            Free shipping too
          </label>
          <div className="flex items-center justify-end gap-2 border-t border-ink/10 pt-3">
            {editing && (
              <button type="button" onClick={reset} className={secondaryButton}>
                Cancel
              </button>
            )}
            <SubmitButton busy={busy} label={editing ? 'Save changes' : 'Create code'} />
          </div>
        </form>
        <ResultBanner result={result} />
      </SectionCard>
    </>
  );
}

/* ================================================================== */
/*  Shared panel pieces                                                */
/* ================================================================== */

/** A settings card: title, one line of help, then the form. */
function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SectionCard title={title} description={description}>
      {children}
    </SectionCard>
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
        'inline-flex min-h-[40px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors disabled:opacity-50 md:min-h-[34px]',
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

/** Right-aligned action row at the foot of a settings card. */
function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end border-t border-ink/10 pt-3">{children}</div>;
}

function ResultBanner({ result }: { result: AdminBillingResult | null }) {
  if (!result) return null;
  return (
    <div
      role="status"
      className={cn(
        'mt-3 rounded-thumb border px-3 py-2.5 text-[13px]',
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
        <FormActions>
          <SubmitButton busy={busy} label="Create subscription" />
        </FormActions>
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
        <FormActions>
          <SubmitButton busy={busy} label="Charge card" />
        </FormActions>
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
        <FormActions>
          <SubmitButton busy={busy} label="Issue refund" tone="danger" />
        </FormActions>
      </form>
      <ResultBanner result={result} />
    </Panel>
  );
}
