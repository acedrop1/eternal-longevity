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
import { DetailHeader, detailGrid } from '@/components/admin/DetailHeader';
import { PRODUCT_STATUS } from '@/components/admin/AdminProductsIndex';

/**
 * Admin → Products editor. Plain controlled form; the server action does the
 * real validation and the audit trail. Lists are edited one item per line.
 */
const STATUS: { key: ProductStatus; label: string; body: string }[] = [
  { key: 'live', label: 'Live', body: 'Listed on the site and orderable.' },
  { key: 'draft', label: 'Draft', body: 'Hidden everywhere while you prepare it.' },
  { key: 'withheld', label: 'Withheld', body: 'Pulled from sale. No page, no link, cannot be ordered.' },
];

const CATEGORIES = SHOP_CATEGORIES;

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

export function AdminProductEditor({ initial, canSave }: { initial: ProductInput; canSave: boolean }) {
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

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setMessage(null);
  };
  const setPrice = (k: keyof ProductInput['pricing'], v: string) =>
    set('pricing', { ...p.pricing, [k]: v === '' ? 0 : Math.round(Number(v)) });
  const setRx = <K extends keyof ProductInput['pharmacy']>(k: K, v: ProductInput['pharmacy'][K]) =>
    set('pharmacy', { ...p.pharmacy, [k]: v });

  const quarterlyPerMonth = Math.round(p.pricing.quarterly / 3);
  const quarterlySave = p.pricing.monthly ? Math.round((1 - p.pricing.quarterly / (p.pricing.monthly * 3)) * 100) : 0;
  const sixMonth = p.pricing.sixMonth ?? 0;
  const sixMonthSave = p.pricing.monthly ? Math.round((1 - sixMonth / (p.pricing.monthly * 6)) * 100) : 0;
  const goingLive = p.status === 'live' && baseline.status !== 'live';
  const dirty = p.isNew || JSON.stringify(p) !== JSON.stringify(baseline);

  const discard = () => {
    setP(baseline);
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

  return (
    <div className="space-y-5">
      {confirmDialog}
      <DetailHeader
        backHref="/portal/admin/products"
        backLabel="Products"
        title={p.isNew ? 'New product' : p.name || 'Untitled'}
        badges={!p.isNew && <StatusBadge tone={PRODUCT_STATUS[baseline.status][1]}>{PRODUCT_STATUS[baseline.status][0]}</StatusBadge>}
        meta={p.id ? `/shop/${p.id}` : 'Set a name to create the URL.'}
        actions={
          !p.isNew &&
          baseline.status === 'live' && (
            <Link href={`/shop/${p.id}`} target="_blank" className={secondaryButton}>
              View on site
            </Link>
          )
        }
      />

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
          <SectionCard title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" hint="As shown on the site.">
                <input
                  className={input}
                  value={p.name}
                  maxLength={60}
                  onChange={(e) => {
                    set('name', e.target.value);
                    if (!idTouched) setP((prev) => ({ ...prev, name: e.target.value, id: slugify(e.target.value) }));
                  }}
                />
              </Field>
              <Field label="URL name" hint={p.isNew ? 'etlongevity.com/shop/…  Can’t be changed later.' : 'Fixed once created.'}>
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
              <div className="sm:col-span-2">
                <Field label="Tagline" hint="One short line under the name.">
                  <input className={input} value={p.tagline} maxLength={80} onChange={(e) => set('tagline', e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Short description" hint="On shop cards. Keep claims hedged (“studied for”, no promises).">
                  <textarea className={cn(input, 'min-h-[72px]')} value={p.shortDescription} maxLength={240} onChange={(e) => set('shortDescription', e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Description" hint="The product page overview.">
                  <textarea className={cn(input, 'min-h-[160px]')} value={p.longDescription} maxLength={2000} onChange={(e) => set('longDescription', e.target.value)} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Best for">
                  <input className={input} value={p.bestFor} maxLength={240} onChange={(e) => set('bestFor', e.target.value)} />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Media">
            <div className="flex flex-wrap items-start gap-4">
              <div className="relative aspect-[3/4] w-32 flex-none overflow-hidden rounded-inner bg-milk ring-1 ring-ink/10">
                {p.image ? (
                  <Image src={p.image} alt="" fill sizes="128px" className="object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-[13px] text-ink/60">No photo yet</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
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
                <button
                  type="button"
                  className={cn(secondaryButton, 'disabled:opacity-40')}
                  disabled={!canSave || uploading || !p.id}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? 'Uploading…' : p.image ? 'Replace photo' : 'Upload photo'}
                </button>
                <p className="mt-2 text-[13px] text-ink/60">
                  {p.id ? 'JPG, PNG or WebP, 5 MB max. 3:4 portrait works best.' : 'Set the URL name first.'}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Pricing" description="Whole dollars. The server charges these, not what a browser sends.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monthly" hint={`One-time order: $${p.pricing.monthly + 20}`}>
                <Money value={p.pricing.monthly} onChange={(v) => setPrice('monthly', v)} />
              </Field>
              <Field
                label="Quarterly (billed every 3 months)"
                hint={`$${quarterlyPerMonth}/mo${quarterlySave > 0 ? ` · saves ${quarterlySave}%` : ''}`}
              >
                <Money value={p.pricing.quarterly} onChange={(v) => setPrice('quarterly', v)} />
              </Field>
              <Field
                label="6-month (billed every 6 months)"
                hint={sixMonth ? `$${Math.round(sixMonth / 6)}/mo${sixMonthSave > 0 ? ` · saves ${sixMonthSave}%` : ''}` : 'Leave empty for no 6-month plan.'}
              >
                <Money value={sixMonth} onChange={(v) => setPrice('sixMonth', v)} />
              </Field>
              <Field label="Annual" hint="Stored only; customers are offered 1, 3 and 6-month plans.">
                <Money value={p.pricing.annual} onChange={(v) => setPrice('annual', v)} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Product page lists" description="One item per line.">
            <div className="grid gap-4 sm:grid-cols-2">
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

          <SectionCard
            title="Pharmacy"
            description="What is sent to the pharmacy with each order of this product."
            actions={
              p.pharmacy.sku.trim() ? <StatusBadge tone="neutral">SKU set</StatusBadge> : <StatusBadge tone="attention">No SKU</StatusBadge>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Pharmacy SKU"
                hint={p.pharmacy.sku.trim() ? 'Orders are sent automatically.' : 'Empty: orders stay on the board to place by hand.'}
              >
                <input
                  className={input}
                  value={p.pharmacy.sku}
                  maxLength={80}
                  spellCheck={false}
                  onChange={(e) => setRx('sku', e.target.value.replace(/\s/g, ''))}
                />
              </Field>
              <Field label="Units per 30-day supply" hint="A 3- or 6-month plan ships that many months at once.">
                <input
                  className={cn(input, 'tabular-nums')}
                  inputMode="numeric"
                  value={p.pharmacy.quantity || ''}
                  onChange={(e) => setRx('quantity', Number(e.target.value.replace(/[^0-9]/g, '')))}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Default directions" hint="Prefills the directions Dr. Elder signs. He can edit them on every prescription.">
                  <textarea
                    className={cn(input, 'min-h-[72px]')}
                    value={p.pharmacy.defaultSig}
                    maxLength={1000}
                    onChange={(e) => setRx('defaultSig', e.target.value)}
                  />
                </Field>
              </div>
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
            </div>
            <p className="mt-3 text-[13px] text-ink/60">
              Name, strength, size and form are sent alongside the SKU so the pharmacist can check the order. Left empty, the built-in value is used.
            </p>
          </SectionCard>
        </div>

        {/* ---------- Sidebar ---------- */}
        <aside className="min-w-0 space-y-4">
          <SectionCard title="Status">
            <div role="radiogroup" aria-label="Status" className="space-y-1.5">
              {STATUS.map((s) => {
                const on = p.status === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set('status', s.key)}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-thumb px-2.5 py-2 text-left transition-colors',
                      on ? 'bg-ink/[0.05] ring-1 ring-ink/40' : 'ring-1 ring-ink/10 hover:bg-milk/70',
                    )}
                  >
                    <span aria-hidden className={cn('mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full border-2', on ? 'border-ink' : 'border-ink/30')}>
                      {on && <span className="h-2 w-2 rounded-full bg-ink" />}
                    </span>
                    <span>
                      <span className="block text-[14px] font-medium text-ink">{s.label}</span>
                      <span className="block text-[13px] leading-snug text-ink/60">{s.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {goingLive && (
              <p className="mt-3 rounded-thumb bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900 ring-1 ring-amber-600/25">
                Saving as Live lists this product on the public site and lets members order it. Make sure it is cleared for sale
                (pharmacy, prescriber and LegitScript).
              </p>
            )}
          </SectionCard>

          <SectionCard title="Product organization">
            <div className="space-y-3">
              <Field label="Category">
                <select className={input} value={p.category} onChange={(e) => set('category', e.target.value as ShopCategory)}>
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Delivery">
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
            </div>
          </SectionCard>

          <SectionCard title="Flags">
            <div className="space-y-3">
              <Check checked={p.popular} onChange={(v) => set('popular', v)} label="Popular" body="Shows a small “Popular” tag on the product page." />
              <Check
                checked={p.fdaApproved}
                onChange={(v) => set('fdaApproved', v)}
                label="Has an FDA-approved reference drug"
                body="Record-keeping only. It does not make the product sellable; status does."
              />
            </div>
          </SectionCard>

          <SectionCard title="Preview">
            {!p.isNew && baseline.status === 'live' ? (
              <Link
                href={`/shop/${p.id}`}
                target="_blank"
                className="text-[14px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
              >
                View on site ↗
              </Link>
            ) : (
              <p className="text-[14px] leading-relaxed text-ink/65">
                Not on the site while it is {PRODUCT_STATUS[baseline.status][0].toLowerCase()}. Save it as Live to publish
                {p.id ? ` /shop/${p.id}` : ' it'}.
              </p>
            )}
          </SectionCard>
        </aside>
      </div>

      {/* Footer save, always there; the bar below appears only with unsaved edits. */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-ink/10 pt-4">
        {!canSave && <p className="mr-auto text-[13px] text-ink/65">Connect Supabase to save changes.</p>}
        <button type="button" className={cn(headerButton, 'disabled:opacity-40')} disabled={!canSave || saving || uploading} onClick={save}>
          {saving ? 'Saving…' : p.isNew ? 'Create product' : 'Save changes'}
        </button>
      </div>

      {dirty && (
        <div className="sticky bottom-3 z-30">
          <div
            role="region"
            aria-label="Unsaved changes"
            className="flex flex-wrap items-center justify-between gap-2 rounded-inner bg-ink px-4 py-2.5 text-white shadow-[0_8px_24px_rgba(17,17,17,0.25)]"
          >
            <span className="text-[14px] font-medium">{p.isNew ? 'Unsaved product' : 'Unsaved changes'}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10 disabled:opacity-40 md:min-h-[32px]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!canSave || saving || uploading}
                className="inline-flex min-h-[40px] items-center rounded-full bg-butter px-4 text-[14px] font-semibold text-ink transition-colors hover:bg-butter-deep disabled:opacity-40 md:min-h-[32px]"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-ink/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-ink/60">{hint}</span>}
    </label>
  );
}

function Money({ value, onChange }: { value: number; onChange: (v: string) => void }) {
  return (
    <span className="relative block">
      <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-ink/60 md:text-[14px]">
        $
      </span>
      <input
        className={cn(input, 'pl-7 tabular-nums')}
        inputMode="numeric"
        value={value || ''}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      />
    </span>
  );
}

function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <Field label={label}>
      <textarea
        className={cn(input, 'min-h-[140px] leading-relaxed')}
        value={lines(value)}
        onChange={(e) => onChange(unlines(e.target.value))}
      />
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
