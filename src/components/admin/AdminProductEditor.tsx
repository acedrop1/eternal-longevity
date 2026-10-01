'use client';

import { useRef, useState, useTransition, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DELIVERY_LABEL, SHOP_CATEGORIES, type DeliveryForm, type ShopCategory } from '@/lib/shopProducts';
import type { ProductStatus } from '@/lib/catalog';
import { saveProductAction, uploadProductImageAction, type ProductInput } from '@/lib/product-actions';
import { SectionTitle, btnPrimary, btnSecondary, errorBox, field, fieldLabel, panel } from '@/components/portal/ui';

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

export function AdminProductEditor({ initial, canSave }: { initial: ProductInput; canSave: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<ProductInput>(initial);
  const [idTouched, setIdTouched] = useState(!initial.isNew);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
  const goingLive = p.status === 'live' && initial.status !== 'live';

  const save = () =>
    startSave(async () => {
      const res = await saveProductAction(p);
      setMessage({ ok: res.ok, text: res.message });
      if (!res.ok) return;
      if (p.isNew && res.id) router.replace(`/portal/admin/products/${res.id}`);
      else router.refresh();
    });

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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
      {/* ---------- Fields ---------- */}
      <div className="order-2 space-y-8 lg:order-1">
        <h1
          className="text-[36px] font-semibold leading-[1] tracking-[-0.045em] text-ink [text-wrap:balance] md:text-[48px]"
        >
          {p.isNew ? 'New product.' : p.name || 'Untitled'}
        </h1>

        <Section title="Basics">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" hint="As shown on the site.">
              <input
                className={field}
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
                className={cn(field, !p.isNew && 'bg-milk text-ink/60')}
                value={p.id}
                readOnly={!p.isNew}
                onChange={(e) => {
                  setIdTouched(true);
                  set('id', slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Tagline" hint="One short line under the name.">
              <input className={field} value={p.tagline} maxLength={80} onChange={(e) => set('tagline', e.target.value)} />
            </Field>
            <Field label="Cycle length">
              <input className={field} value={p.cycleLength} maxLength={40} onChange={(e) => set('cycleLength', e.target.value)} />
            </Field>
            <Field label="Category">
              <select className={field} value={p.category} onChange={(e) => set('category', e.target.value as ShopCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Delivery">
              <select className={field} value={p.delivery} onChange={(e) => set('delivery', e.target.value as DeliveryForm)}>
                {Object.entries(DELIVERY_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Pricing" note="Whole dollars. The server charges these, not what a browser sends.">
          <div className="grid gap-5 sm:grid-cols-2">
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
        </Section>

        <Section title="Copy">
          <div className="space-y-5">
            <Field label="Short description" hint="On shop cards. Keep claims hedged (“studied for”, no promises).">
              <textarea className={cn(field, 'min-h-[88px]')} value={p.shortDescription} maxLength={240} onChange={(e) => set('shortDescription', e.target.value)} />
            </Field>
            <Field label="Description" hint="The product page overview.">
              <textarea className={cn(field, 'min-h-[160px]')} value={p.longDescription} maxLength={2000} onChange={(e) => set('longDescription', e.target.value)} />
            </Field>
            <Field label="Best for">
              <input className={field} value={p.bestFor} maxLength={240} onChange={(e) => set('bestFor', e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Details" note="One item per line.">
          <div className="grid gap-5 sm:grid-cols-2">
            <ListField label="What it does" value={p.benefits} onChange={(v) => set('benefits', v)} />
            <ListField label="What's included" value={p.whatsIncluded} onChange={(v) => set('whatsIncluded', v)} />
          </div>
        </Section>

        <Section title="Safety" note="Both lists are required to go live. They show on the product page.">
          <div className="grid gap-5 sm:grid-cols-2">
            <ListField label="Possible side effects" value={p.sideEffects} onChange={(v) => set('sideEffects', v)} />
            <ListField label="Contraindications (do not use if…)" value={p.contraindications} onChange={(v) => set('contraindications', v)} />
          </div>
        </Section>

        <Section title="Pharmacy" note="What is sent to the pharmacy with each order of this product.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Pharmacy SKU"
              hint={p.pharmacy.sku.trim() ? 'Orders are sent automatically.' : 'Empty: orders stay on the board to place by hand.'}
            >
              <input
                className={field}
                value={p.pharmacy.sku}
                maxLength={80}
                spellCheck={false}
                onChange={(e) => setRx('sku', e.target.value.replace(/\s/g, ''))}
              />
            </Field>
            <Field label="Units per 30-day supply" hint="A 3- or 6-month plan ships that many months at once.">
              <input
                className={cn(field, 'tabular-nums')}
                inputMode="numeric"
                value={p.pharmacy.quantity || ''}
                onChange={(e) => setRx('quantity', Number(e.target.value.replace(/[^0-9]/g, '')))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Default directions" hint="Prefills the directions Dr. Elder signs. He can edit them on every prescription.">
                <textarea
                  className={cn(field, 'min-h-[88px]')}
                  value={p.pharmacy.defaultSig}
                  maxLength={1000}
                  onChange={(e) => setRx('defaultSig', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Name for the pharmacy">
              <input className={field} value={p.pharmacy.name} maxLength={120} onChange={(e) => setRx('name', e.target.value)} />
            </Field>
            <Field label="Strength">
              <input className={field} value={p.pharmacy.strength} maxLength={120} onChange={(e) => setRx('strength', e.target.value)} />
            </Field>
            <Field label="Size">
              <input className={field} value={p.pharmacy.size} maxLength={120} onChange={(e) => setRx('size', e.target.value)} />
            </Field>
            <Field label="Dosage form">
              <input className={field} value={p.pharmacy.dosageForm} maxLength={120} onChange={(e) => setRx('dosageForm', e.target.value)} />
            </Field>
          </div>
          <p className="mt-3 text-[12px] text-ink/50">
            Name, strength, size and form are sent alongside the SKU so the pharmacist can check the order. Left empty, the built-in value is used.
          </p>
        </Section>

        <Section title="Flags">
          <div className="space-y-3">
            <Check checked={p.popular} onChange={(v) => set('popular', v)} label="Popular" body="Shows a small “Popular” tag on the product page." />
            <Check
              checked={p.fdaApproved}
              onChange={(v) => set('fdaApproved', v)}
              label="Has an FDA-approved reference drug"
              body="Record-keeping only. It does not make the product sellable; status does."
            />
          </div>
        </Section>
      </div>

      {/* ---------- Side panel: status, photo, save ---------- */}
      <aside className="order-1 lg:order-2">
        <div className="space-y-6 lg:sticky lg:top-20">
          <div className={cn(panel, 'p-5')}>
            <p className={fieldLabel}>Status</p>
            <div role="radiogroup" aria-label="Status" className="space-y-2">
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
                      'flex w-full items-start gap-3 rounded-inner px-3 py-3 text-left transition-colors',
                      on ? 'bg-white ring-2 ring-ink' : 'bg-white/60 ring-1 ring-ink/10 hover:ring-ink/30',
                    )}
                  >
                    <span aria-hidden className={cn('mt-1 grid h-4 w-4 flex-none place-items-center rounded-full border-2', on ? 'border-ink' : 'border-ink/30')}>
                      {on && <span className="h-2 w-2 rounded-full bg-ink" />}
                    </span>
                    <span>
                      <span className="block text-[15px] font-medium">{s.label}</span>
                      <span className="block text-[13px] leading-snug text-ink/60">{s.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {goingLive && (
              <p className="mt-3 rounded-inner bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900 ring-1 ring-amber-600/25">
                Saving as Live lists this product on the public site and lets members order it. Make sure it is cleared for sale
                (pharmacy, prescriber and LegitScript).
              </p>
            )}
          </div>

          <div className={cn(panel, 'p-5')}>
            <p className={fieldLabel}>Photo</p>
            <div className="relative aspect-[3/4] overflow-hidden rounded-inner bg-white ring-1 ring-ink/10">
              {p.image ? (
                <Image src={p.image} alt="" fill sizes="300px" className="object-cover" />
              ) : (
                <span className="grid h-full place-items-center text-[12px] text-ink/45">No photo yet</span>
              )}
            </div>
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
              className={cn(btnSecondary, 'mt-3 w-full')}
              disabled={!canSave || uploading || !p.id}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Uploading…' : p.image ? 'Replace photo' : 'Upload photo'}
            </button>
            <p className="mt-2 text-[12px] text-ink/50">
              {p.id ? 'JPG, PNG or WebP, 5 MB max. 3:4 portrait works best.' : 'Set the URL name first.'}
            </p>
          </div>

          <div className="space-y-3">
            {message && (
              <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'rounded-inner bg-emerald-50 px-4 py-3 text-[14px] text-emerald-900 ring-1 ring-emerald-700/20' : errorBox}>
                {message.text}
              </p>
            )}
            <button type="button" className={cn(btnPrimary, 'w-full')} disabled={!canSave || saving || uploading} onClick={save}>
              {saving ? 'Saving…' : p.isNew ? 'Create product' : 'Save changes'}
            </button>
            {!p.isNew && initial.status === 'live' && (
              <Link href={`/shop/${p.id}`} target="_blank" className={cn(btnSecondary, 'w-full')}>
                View on site
              </Link>
            )}
            {!canSave && <p className="text-[12px] text-ink/55">Connect Supabase to save changes.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink/10 pt-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle>{title}</SectionTitle>
        {note && <p className="text-[12px] text-ink/55">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={fieldLabel}>{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-ink/50">{hint}</span>}
    </label>
  );
}

function Money({ value, onChange }: { value: number; onChange: (v: string) => void }) {
  return (
    <span className="relative block">
      <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-ink/50">
        $
      </span>
      <input
        className={cn(field, 'pl-8 tabular-nums')}
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
        className={cn(field, 'min-h-[150px] text-[15px] leading-relaxed')}
        value={lines(value)}
        onChange={(e) => onChange(unlines(e.target.value))}
      />
    </Field>
  );
}

function Check({ checked, onChange, label, body }: { checked: boolean; onChange: (v: boolean) => void; label: string; body: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-ink" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="block text-[13px] text-ink/60">{body}</span>
      </span>
    </label>
  );
}
