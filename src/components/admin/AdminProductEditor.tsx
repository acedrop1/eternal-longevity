'use client';

import { useRef, useState, useTransition, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DELIVERY_LABEL, SHOP_CATEGORIES, type DeliveryForm, type ShopCategory } from '@/lib/shopProducts';
import type { ProductStatus } from '@/lib/catalog';
import { saveProductAction, uploadProductImageAction, type ProductInput } from '@/lib/product-actions';
import { productImpactAction } from '@/lib/product-impact-actions';
import { useConfirm } from '@/components/ui/useConfirm';
import { SectionCard, StatusBadge, headerButton, secondaryButton } from '@/components/admin/IndexTable';
import { detailGrid } from '@/components/admin/DetailHeader';
import { PRODUCT_STATUS } from '@/components/admin/AdminProductsIndex';
import { PROCESSING_FEE_FIXED_CENTS, PROCESSING_FEE_PCT, planEconomics } from '@/lib/profit';
import { SHIPPING_COST, SHIPPING_LABEL, shippingMethodFor } from '@/lib/shipping';
import type { ShippingSettings } from '@/lib/shipping-settings';
import { formatMoney } from '@/lib/format';

/**
 * Admin → Products editor, laid out like Shopify's product page: title,
 * description and media first; plans as variants with live profit; inventory
 * (the pharmacy mapping), shipping, page content, safety and a search
 * preview; status, sales channels and organisation in the sidebar; the
 * unsaved-changes bar across the top. Plain controlled form; the server
 * action does the real validation and the audit trail.
 */
const STATUS: { key: ProductStatus; label: string; body: string }[] = [
  { key: 'live', label: 'Active', body: 'Listed on the site and orderable.' },
  { key: 'draft', label: 'Draft', body: 'Hidden everywhere while you prepare it.' },
  { key: 'withheld', label: 'Withheld', body: 'Pulled from sale. No page, no link, cannot be ordered.' },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const lines = (xs: string[]) => xs.join('\n');
const unlines = (s: string) => s.split('\n');

/** Compact Shopify-size field; 16px on phones so iOS does not zoom. */
const input =
  'w-full rounded-thumb bg-white px-3 py-2 text-[16px] text-ink ring-1 ring-ink/15 placeholder:text-ink/55 focus:outline-none focus:ring-2 focus:ring-ink/30 md:text-[14px]';

/** What the pharmacy prices by: "vial", "capsule"… read off the size and form. */
function unitWord(rx: { size: string; dosageForm: string }): string {
  const t = `${rx.size} ${rx.dosageForm}`.toLowerCase();
  return ['vial', 'tube', 'jar', 'bottle', 'capsule', 'tablet', 'troche'].find((w) => t.includes(w)) ?? 'unit';
}

const pct = (m: number | null) => (m === null ? '—' : `${Math.round(m * 100)}%`);
const signed = (cents: number) => (cents < 0 ? `−${formatMoney(-cents)}` : formatMoney(cents));

type PlanKey = 'monthly' | 'quarterly' | 'sixMonth' | 'annual';
const PLANS: { key: PlanKey; label: string; months: number; boxes: number }[] = [
  { key: 'monthly', label: '1 month', months: 1, boxes: 1 },
  { key: 'quarterly', label: '3 months', months: 3, boxes: 1 },
  { key: 'sixMonth', label: '6 months', months: 6, boxes: 1 },
  { key: 'annual', label: '12 months', months: 12, boxes: 2 },
];

export function AdminProductEditor({
  initial,
  canSave,
  storage,
  shipping,
  nav,
}: {
  initial: ProductInput;
  canSave: boolean;
  /** The product's storage: picks the shipping method for the profit numbers. */
  storage?: 'refrigerated' | 'room';
  /** What the customer pays per box (Admin → Settings), for the profit numbers. */
  shipping: ShippingSettings;
  /** Previous / next product ids for the header arrows. */
  nav?: { prev: string | null; next: string | null };
}) {
  const router = useRouter();
  const [p, setP] = useState<ProductInput>(initial);
  /** The last saved version: what Discard returns to and what "unsaved" compares with. */
  const [baseline, setBaseline] = useState<ProductInput>(initial);
  const [idTouched, setIdTouched] = useState(!initial.isNew);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, confirmDialog] = useConfirm();
  // Cost is entered per 30-day supply (a bottle, a vial), never per capsule; unitCost is derived.
  // Typed as text so "31." survives while typing.
  const costText0 = (rx: ProductInput['pharmacy']) => (rx.unitCost ? String(Math.round(rx.unitCost * Math.max(1, rx.quantity) * 100) / 100) : '');
  const [costText, setCostText] = useState(costText0(initial.pharmacy));

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setMessage(null);
  };
  const setPrice = (k: PlanKey, v: string) => set('pricing', { ...p.pricing, [k]: v === '' ? 0 : Math.round(Number(v)) });
  const setRx = <K extends keyof ProductInput['pharmacy']>(k: K, v: ProductInput['pharmacy'][K]) => set('pharmacy', { ...p.pharmacy, [k]: v });

  const ship = shipping.pricePerShipment;
  const method = shippingMethodFor(storage);
  const goingLive = p.status === 'live' && baseline.status !== 'live';
  const unit = unitWord(p.pharmacy);
  const dirty = p.isNew || JSON.stringify(p) !== JSON.stringify(baseline);

  /** One plan as a variant row: price, per month, saving and live profit (renewal and first order). */
  const variant = (key: PlanKey, months: number, boxes: number) => {
    const price = key === 'sixMonth' ? (p.pricing.sixMonth ?? 0) : p.pricing[key];
    const offered = key === 'annual' ? p.twelveMonthPlan : true;
    const save = p.pricing.monthly && price ? Math.round((1 - price / (p.pricing.monthly * months)) * 100) : 0;
    const cost = { unitCost: p.pharmacy.unitCost, quantity: p.pharmacy.quantity, storage };
    const e = price > 0 && p.pharmacy.unitCost > 0 ? planEconomics(price, ship, months, cost, { shipments: boxes }) : null;
    const first = price > 0 && p.pharmacy.unitCost > 0 ? planEconomics(price, ship, months, cost, { shipments: boxes, firstOrder: true }) : null;
    return { price, offered, save, e, first };
  };

  const discard = () => {
    setP(baseline);
    setCostText(costText0(baseline.pharmacy));
    setIdTouched(!baseline.isNew);
    setMessage(null);
  };

  const save = async () => {
    // Pulling a live product strands whatever is waiting on it: say how much first.
    if (!p.isNew && baseline.status === 'live' && p.status !== 'live') {
      const impact = await productImpactAction(p.id).catch(() => null);
      const ok = await confirm({
        title: p.status === 'withheld' ? 'Withhold this live product?' : 'Move this live product to draft?',
        body: impact
          ? `${impact.waiting} ${impact.waiting === 1 ? 'order' : 'orders'} waiting on the prescriber, ${impact.plans} active ${impact.plans === 1 ? 'plan' : 'plans'}. The prescriber cannot sign an order for a product that is not live.`
          : 'Orders waiting on the prescriber cannot be signed once it is off sale, and active plans on it will need attention. The counts could not be loaded.',
        confirmLabel: 'Pull it from sale',
        danger: true,
      });
      if (!ok) return;
    }
    startSave(async () => {
      const res = await saveProductAction(p);
      setMessage({ ok: res.ok, text: res.message });
      if (!res.ok) return;
      setBaseline(p);
      if (p.isNew && res.id) router.replace(`/portal/admin/products/${res.id}`);
      else router.refresh();
    });
  };

  const upload = async (file: File) => {
    setUploading(true);
    setMessage(null);
    const form = new FormData();
    form.set('file', file);
    form.set('id', p.id);
    const res = await uploadProductImageAction(form);
    setUploading(false);
    if (res.ok && res.url) set('image', res.url);
    else setMessage({ ok: false, text: res.message });
  };

  const live = !p.isNew && baseline.status === 'live';

  return (
    <div className="space-y-4 pb-6">
      {confirmDialog}

      {/* Shopify's contextual save bar: across the top while there are unsaved edits. */}
      {dirty && (
        <div role="region" aria-label="Unsaved changes" className="fixed inset-x-0 top-0 z-[60] bg-ink text-white shadow-[0_6px_20px_rgba(17,17,17,0.25)]">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2.5">
            <span className="text-[14px] font-medium">{p.isNew ? 'Unsaved product' : 'Unsaved product changes'}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="inline-flex min-h-[40px] items-center rounded-thumb px-3.5 text-[14px] font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10 disabled:opacity-40 md:min-h-[32px]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!canSave || saving || uploading}
                className="inline-flex min-h-[40px] items-center rounded-thumb bg-white px-3.5 text-[14px] font-semibold text-ink transition-colors hover:bg-milk disabled:opacity-40 md:min-h-[32px]"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header: back, title and status; Preview and prev/next on the right. */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/portal/admin/products"
            aria-label="Back to Products"
            className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-thumb text-ink/65 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5 7 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="min-w-0 truncate text-[20px] font-semibold tracking-[-0.02em] text-ink">{p.isNew ? 'Add product' : p.name || 'Untitled'}</h1>
          {!p.isNew && <StatusBadge tone={PRODUCT_STATUS[baseline.status][1]}>{STATUS.find((s) => s.key === baseline.status)?.label}</StatusBadge>}
        </div>
        {!p.isNew && (
          <div className="flex items-center gap-2">
            {live && (
              <Link href={`/shop/${p.id}`} target="_blank" className={secondaryButton}>
                Preview
              </Link>
            )}
            <div className="flex overflow-hidden rounded-thumb ring-1 ring-ink/15">
              {(['prev', 'next'] as const).map((dir) => {
                const to = nav?.[dir];
                const icon = dir === 'prev' ? 'M12 5 7 10l5 5' : 'm8 5 5 5-5 5';
                const cls = 'inline-flex h-9 w-9 items-center justify-center bg-white text-ink/70';
                return to ? (
                  <Link key={dir} href={`/portal/admin/products/${to}`} aria-label={dir === 'prev' ? 'Previous product' : 'Next product'} className={cn(cls, 'hover:bg-milk', dir === 'next' && 'border-l border-ink/10')}>
                    <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ) : (
                  <span key={dir} aria-hidden className={cn(cls, 'text-ink/25', dir === 'next' && 'border-l border-ink/10')}>
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {message && (
        <p
          role={message.ok ? 'status' : 'alert'}
          className={cn(
            'rounded-inner border px-4 py-2.5 text-[14px]',
            message.ok ? 'border-emerald-600/20 bg-emerald-50 text-emerald-900' : 'border-red-600/20 bg-red-50 text-red-800',
          )}
        >
          {message.text}
        </p>
      )}

      <div className={detailGrid}>
        {/* ---------- Main column ---------- */}
        <div className="min-w-0 space-y-4">
          {/* Title, description, media: Shopify's first card. */}
          <SectionCard>
            <div className="space-y-4">
              <Field label="Title">
                <input
                  className={input}
                  value={p.name}
                  maxLength={60}
                  placeholder="Finasteride + Minoxidil"
                  onChange={(e) => {
                    set('name', e.target.value);
                    if (!idTouched) setP((prev) => ({ ...prev, name: e.target.value, id: slugify(e.target.value) }));
                  }}
                />
              </Field>
              <Field label="Description" hint="The product page overview.">
                <textarea className={cn(input, 'min-h-[180px] leading-relaxed')} value={p.longDescription} maxLength={2000} onChange={(e) => set('longDescription', e.target.value)} />
              </Field>
              <div>
                <span className="mb-1.5 block text-[14px] font-medium text-ink/80">Media</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.target.value = '';
                  }}
                />
                <div className="flex flex-wrap gap-3">
                  {p.image && (
                    <div className="relative aspect-square w-28 overflow-hidden rounded-inner bg-milk ring-1 ring-ink/10">
                      <Image src={p.image} alt="" fill sizes="112px" className="object-contain" />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!canSave || uploading || !p.id}
                    onClick={() => fileRef.current?.click()}
                    className="grid aspect-square w-28 place-items-center rounded-inner border border-dashed border-ink/25 bg-white px-2 text-center text-[13px] font-medium text-ink/70 transition-colors hover:border-ink/50 hover:bg-milk/60 disabled:opacity-40"
                  >
                    {uploading ? 'Uploading…' : p.image ? 'Replace' : 'Upload'}
                  </button>
                </div>
                <span className="mt-1.5 block text-[13px] text-ink/60">
                  {p.id ? 'JPG, PNG or WebP, 5 MB max. Square or 3:4 portrait works best.' : 'Add a title first.'}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Plans as variants, with live profit. */}
          <SectionCard
            title="Variants"
            description={`Plan length. Price is what each plan bills; profit updates as you type: price + $${ship}/box shipping − your cost − $${SHIPPING_COST[method]}/box pharmacy shipping − card fee (${(PROCESSING_FEE_PCT * 100).toFixed(2)}% + ${PROCESSING_FEE_FIXED_CENTS}¢).`}
            flush
          >
            <div className="border-b border-ink/10 px-4 py-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Our cost per month" hint={`One 30-day supply (${p.pharmacy.quantity > 1 ? `${p.pharmacy.quantity} ${unit}s` : `1 ${unit}`}). Admin only.`}>
                  <span className="relative block">
                    <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-ink/60 md:text-[14px]">
                      $
                    </span>
                    <input
                      className={cn(input, 'pl-7 tabular-nums')}
                      inputMode="decimal"
                      aria-label="Our cost per month"
                      value={costText}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        setCostText(v);
                        setRx('unitCost', (Number(v) || 0) / Math.max(1, p.pharmacy.quantity));
                      }}
                    />
                  </span>
                </Field>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[14px] tabular-nums">
                <thead>
                  <tr className="bg-milk text-left text-[13px] text-ink/70">
                    {['Variant', 'Price', 'Per month', 'Profit', 'Margin', 'First order'].map((h, i) => (
                      <th key={h} className={cn('whitespace-nowrap px-3 py-2 font-semibold first:pl-4 last:pr-4', i > 1 && 'text-right')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLANS.map(({ key, label, months, boxes }) => {
                    const v = variant(key, months, boxes);
                    const off = key === 'annual' && !p.twelveMonthPlan;
                    return (
                      <tr key={key} className={cn('border-t border-ink/10', off && 'text-ink/40')}>
                        <td className="whitespace-nowrap px-3 py-2 pl-4">
                          <span className="font-medium text-ink">{label}</span>
                          {key === 'annual' && (
                            <label className="ml-3 inline-flex items-center gap-1.5 text-[13px] text-ink/70">
                              <input type="checkbox" className="h-4 w-4 accent-ink" checked={p.twelveMonthPlan} onChange={(e) => set('twelveMonthPlan', e.target.checked)} />
                              Offer
                            </label>
                          )}
                          {boxes > 1 && <span className="block text-[12px] text-ink/55">Billed yearly · ships in 2 boxes</span>}
                        </td>
                        <td className="w-[130px] px-3 py-2">
                          <Money label={`${label} price`} value={v.price} disabled={off} onChange={(val) => setPrice(key, val)} />
                        </td>
                        <td className="px-3 py-2 text-right text-ink/75">
                          {v.price ? `$${Math.round(v.price / months)}` : '—'}
                          {v.save > 0 && <span className="block text-[12px] text-emerald-700">saves {v.save}%</span>}
                        </td>
                        <td className={cn('px-3 py-2 text-right font-semibold', v.e && v.e.profit < 0 ? 'text-red-700' : 'text-ink')}>
                          {v.e && !off ? signed(v.e.profit) : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">{v.e && !off ? pct(v.e.margin) : '—'}</td>
                        <td className={cn('px-3 py-2 pr-4 text-right', v.first && v.first.profit < 0 ? 'text-red-700' : 'text-ink/65')}>
                          {v.first && !off ? signed(v.first.profit) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-2.5 text-[13px] text-ink/60">
              {p.pharmacy.unitCost > 0
                ? `Leave 6 months empty for no 6 month plan. "First order" ships its first box free${shipping.firstOrderFree ? '' : ' (off in Settings)'}.`
                : 'Add a cost per item to see profit on each plan.'}
            </p>
          </SectionCard>

          <SectionCard title="Inventory" description="What is sent to the pharmacy with each order of this product.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`${unit[0].toUpperCase()}${unit.slice(1)}s per 30-day supply`} hint="Sent to the pharmacy as the quantity per month.">
                <input
                  className={cn(input, 'tabular-nums')}
                  inputMode="numeric"
                  value={p.pharmacy.quantity || ''}
                  onChange={(e) => {
                    const q = Number(e.target.value.replace(/[^0-9]/g, ''));
                    // Keep the month's cost; re-derive the per-unit figure.
                    set('pharmacy', { ...p.pharmacy, quantity: q, unitCost: (Number(costText) || 0) / Math.max(1, q) });
                  }}
                />
              </Field>
              <Field label="SKU (pharmacy)" hint={p.pharmacy.sku.trim() ? 'Orders are sent automatically.' : 'Empty: orders stay on the board to place by hand.'}>
                <input className={input} value={p.pharmacy.sku} maxLength={80} spellCheck={false} onChange={(e) => setRx('sku', e.target.value.replace(/\s/g, ''))} />
              </Field>
              <Field label="Name for the pharmacy">
                <input className={input} value={p.pharmacy.name} maxLength={120} onChange={(e) => setRx('name', e.target.value)} />
              </Field>
              <Field label="Strength">
                <input className={input} value={p.pharmacy.strength} maxLength={120} onChange={(e) => setRx('strength', e.target.value)} />
              </Field>
              <Field label="Size">
                <input className={input} value={p.pharmacy.size} maxLength={120} onChange={(e) => setRx('size', e.target.value)} />
              </Field>
              <Field label="Dosage form">
                <input className={input} value={p.pharmacy.dosageForm} maxLength={120} onChange={(e) => setRx('dosageForm', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Default directions" hint="Prefills the directions Dr. Elder signs. He can edit them on every prescription.">
                  <textarea className={cn(input, 'min-h-[72px]')} value={p.pharmacy.defaultSig} maxLength={1000} onChange={(e) => setRx('defaultSig', e.target.value)} />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Shipping">
            <dl className="grid gap-3 text-[14px] sm:grid-cols-3">
              <div>
                <dt className="text-ink/60">Method</dt>
                <dd className="font-medium text-ink">{SHIPPING_LABEL[method]}</dd>
              </div>
              <div>
                <dt className="text-ink/60">Customer pays</dt>
                <dd className="font-medium text-ink">
                  ${ship} per box{shipping.firstOrderFree ? ' · first order free' : ''}
                </dd>
              </div>
              <div>
                <dt className="text-ink/60">Pharmacy charges us</dt>
                <dd className="font-medium text-ink">${SHIPPING_COST[method]} per box</dd>
              </div>
            </dl>
            <p className="mt-3 text-[13px] text-ink/60">
              Storage: {storage === 'refrigerated' ? 'refrigerated (packed cold)' : 'room temperature'}. Change the price in{' '}
              <Link href="/portal/admin/settings" className="underline underline-offset-2">
                Settings
              </Link>
              .
            </p>
          </SectionCard>

          <SectionCard title="Product page" description="Shown on the shop card and product page. Keep claims hedged (“studied for”, no promises). Lists: one item per line.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Tagline" hint="One short line under the name.">
                  <input className={input} value={p.tagline} maxLength={80} onChange={(e) => set('tagline', e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Short description" hint="On shop cards and in search results.">
                  <textarea className={cn(input, 'min-h-[72px]')} value={p.shortDescription} maxLength={240} onChange={(e) => set('shortDescription', e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Best for">
                  <input className={input} value={p.bestFor} maxLength={240} onChange={(e) => set('bestFor', e.target.value)} />
                </Field>
              </div>
              <ListField label="What it does" value={p.benefits} onChange={(v) => set('benefits', v)} />
              <ListField label="What's included" value={p.whatsIncluded} onChange={(v) => set('whatsIncluded', v)} />
            </div>
          </SectionCard>

          <SectionCard title="Safety" description="Both lists are required to go live. They show on the product page. One item per line.">
            <div className="grid gap-4 sm:grid-cols-2">
              <ListField label="Possible side effects" value={p.sideEffects} onChange={(v) => set('sideEffects', v)} />
              <ListField label="Contraindications (do not use if…)" value={p.contraindications} onChange={(v) => set('contraindications', v)} />
            </div>
          </SectionCard>

          <SectionCard title="Search engine listing">
            <div className="rounded-inner bg-milk/60 px-4 py-3">
              <p className="text-[13px] text-ink/60">etlongevity.com › shop › {p.id || 'url-name'}</p>
              <p className="mt-0.5 text-[17px] text-[#1a0dab]">{p.name || 'Product title'} | Eternal Longevity</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-ink/70">{p.shortDescription || 'Add a short description to show here.'}</p>
            </div>
            <div className="mt-3">
              <Field label="URL handle" hint={p.isNew ? 'etlongevity.com/shop/…  Can’t be changed later.' : 'Fixed once created.'}>
                <input
                  className={cn(input, !p.isNew && 'bg-milk text-ink/60')}
                  value={p.id}
                  readOnly={!p.isNew}
                  onChange={(e) => {
                    setIdTouched(true);
                    set('id', slugify(e.target.value));
                  }}
                />
              </Field>
            </div>
          </SectionCard>
        </div>

        {/* ---------- Sidebar ---------- */}
        <aside className="min-w-0 space-y-4">
          <SectionCard title="Status">
            <select className={input} value={p.status} onChange={(e) => set('status', e.target.value as ProductStatus)} aria-label="Status">
              {STATUS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[13px] text-ink/60">{STATUS.find((s) => s.key === p.status)?.body}</p>
            {goingLive && (
              <p className="mt-3 rounded-thumb bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900 ring-1 ring-amber-600/25">
                Saving as Active lists this product on the public site and lets members order it. Make sure it is cleared for sale
                (pharmacy, prescriber and LegitScript).
              </p>
            )}
          </SectionCard>

          <SectionCard title="Publishing">
            <ul className="space-y-3 text-[14px]">
              <li className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-medium text-ink">Online store</span>
                  <span className="block text-[13px] text-ink/60">{p.status === 'live' ? `etlongevity.com/shop/${p.id || '…'}` : 'Not listed until Active.'}</span>
                </span>
                <span aria-hidden className={cn('mt-1.5 h-2 w-2 flex-none rounded-full', p.status === 'live' ? 'bg-emerald-600' : 'bg-ink/25')} />
              </li>
              <li>
                <Check
                  checked={p.addon}
                  onChange={(v) => set('addon', v)}
                  label="Checkout add-on"
                  body="Shows as “Add to your order” at checkout. Must also be Active. Best for products with no medical questions; the prescriber still approves every line."
                />
                {p.addon && (
                  <div className="mt-3 space-y-3 pl-7">
                    <Field label="One line on the card" hint="Up to 120 characters. Approved wording only.">
                      <input className={input} value={p.addonPitch} maxLength={120} onChange={(e) => set('addonPitch', e.target.value)} />
                    </Field>
                    <div>
                      <span className="mb-1.5 block text-[14px] font-medium text-ink/80">Show it with</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {ADDON_AREAS.map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 text-[14px] text-ink">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-ink"
                              checked={p.addonFor.includes(key)}
                              onChange={(e) => set('addonFor', e.target.checked ? [...p.addonFor, key] : p.addonFor.filter((c) => c !== key))}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <span className="mt-1 block text-[13px] text-ink/60">None ticked: shown with every treatment.</span>
                    </div>
                  </div>
                )}
              </li>
            </ul>
          </SectionCard>

          <SectionCard title="Product organization">
            <div className="space-y-3">
              <Field label="Category">
                <select className={input} value={p.category} onChange={(e) => set('category', e.target.value as ShopCategory)}>
                  {SHOP_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select className={input} value={p.delivery} onChange={(e) => set('delivery', e.target.value as DeliveryForm)}>
                  {Object.entries(DELIVERY_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cycle length">
                <input className={input} value={p.cycleLength} maxLength={40} onChange={(e) => set('cycleLength', e.target.value)} />
              </Field>
              <div className="space-y-3 pt-1">
                <span className="block text-[14px] font-medium text-ink/80">Tags</span>
                <Check checked={p.popular} onChange={(v) => set('popular', v)} label="Popular" body="Shows a small “Popular” tag on the product page." />
                {/* Every product is compounded by a 503A pharmacy, so none is FDA-approved; not a setting. */}
                <p className="text-[13px] leading-snug text-ink/65">
                  Compounded by a 503A pharmacy: not FDA-approved. The site never marks a compounded formula as FDA-approved.
                </p>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>

      {/* Footer, as Shopify: withhold on the left, save on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
        {!p.isNew && p.status !== 'withheld' ? (
          <button
            type="button"
            onClick={() => set('status', 'withheld')}
            className="inline-flex min-h-[40px] items-center rounded-thumb px-3.5 text-[14px] font-semibold text-red-700 ring-1 ring-red-700/25 transition-colors hover:bg-red-50 md:min-h-[32px]"
          >
            Withhold product
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {!canSave && <p className="text-[13px] text-ink/65">Connect Supabase to save changes.</p>}
          <button type="button" className={cn(headerButton, 'disabled:opacity-40')} disabled={!canSave || saving || uploading || !dirty} onClick={save}>
            {saving ? 'Saving…' : p.isNew ? 'Save product' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const ADDON_AREAS: [string, string][] = [
  ['hair', 'Hair'],
  ['skin', 'Skin'],
  ['sexual-health', 'Sexual health'],
  ['hormones', 'Hormones'],
  ['longevity', 'Longevity'],
];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-ink/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-ink/60">{hint}</span>}
    </label>
  );
}

function Money({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <span className="relative block">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-ink/60 md:text-[14px]">
        $
      </span>
      <input
        className={cn(input, 'pl-7 tabular-nums disabled:bg-milk disabled:text-ink/40')}
        inputMode="numeric"
        aria-label={label}
        disabled={disabled}
        value={value || ''}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      />
    </span>
  );
}

function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field label={label}>
      <textarea className={cn(input, 'min-h-[140px] leading-relaxed')} value={lines(value)} onChange={(e) => onChange(unlines(e.target.value))} />
    </Field>
  );
}

function Check({ checked, onChange, label, body }: { checked: boolean; onChange: (v: boolean) => void; label: string; body: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-0.5 h-4 w-4 flex-none accent-ink" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        <span className="block text-[13px] leading-snug text-ink/60">{body}</span>
      </span>
    </label>
  );
}
