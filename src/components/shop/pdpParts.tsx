import Image from 'next/image';
import Link from 'next/link';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DELIVERY_LABEL,
  SHOP_CATEGORIES,
  type CadenceTier,
  type ShopProduct,
} from '@/lib/shopProducts';
import { shippingPriceFor } from '@/lib/shipping';
import { ALL_ITEMS } from '@/lib/lineup';
import { FDA_DISCLAIMER, SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF, SUPPORT_HOURS } from '@/lib/site';

/**
 * Pieces shared by the desktop and mobile product pages, so the two can't
 * drift apart on price, plan terms or safety copy.
 */

/** Product photo. A clean vial render shows as is; a stock photo is dimmed and named. */
export function ProductImage({
  product,
  sizes,
  className,
  position,
}: {
  product: ShopProduct;
  sizes: string;
  className?: string;
  /** object-position for a crop that isn't the photo's shape (e.g. '50% 20%'). */
  position?: string;
}) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-shell bg-milk', className)}
      style={product.shot ? undefined : { background: product.swatch }}
    >
      <Image
        src={product.image}
        alt={product.name}
        fill
        priority
        sizes={sizes}
        className={product.shot ? 'object-cover' : 'object-cover opacity-45'}
        style={position ? { objectPosition: position } : undefined}
      />
      {/* Product renders are generic, unbranded vials; say so on the photo. */}
      {product.shot && (
        <span className="absolute bottom-4 left-4 rounded-full bg-white/75 px-3 py-1 text-[11px] font-medium text-ink/70 backdrop-blur-md">
          Image for illustration
        </span>
      )}
      {!product.shot && (
        <>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/75" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
            <p className="text-[40px] font-semibold leading-[0.95] tracking-[-0.05em] md:text-[64px]">{product.name}</p>
            <p className="mt-3 text-[15px] text-white/85">{product.tagline}</p>
            <p className="mt-4 text-[13px] font-medium text-white/65">
              {DELIVERY_LABEL[product.delivery]} · {product.cycleLength}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/** "monthly", "every 3 months", "every 6 months". */
export const billedEvery = (t: CadenceTier) =>
  t.key === 'monthly' ? 'monthly' : `every ${t.key === 'sixMonth' ? 6 : 3} months`;

/** "$149/mo billed monthly" beside a longer plan's lower rate: a labelled comparison, not a strike-through sale price. */
export function MonthlyRate({ product, active, className }: { product: ShopProduct; active: CadenceTier; className?: string }) {
  if (active.key === 'monthly' || active.key === 'once' || active.perMonth >= product.pricing.monthly) return null;
  return <span className={cn('text-ink/60', className)}>vs ${product.pricing.monthly}/mo billed monthly</span>;
}

/** Storage and shipping for a product (see ShopProduct.storage). */
export const coldChain = (p: ShopProduct) => p.storage === 'refrigerated';
const STORAGE_LABEL = { refrigerated: 'Refrigerated 2–8°C', room: 'Room temperature' } as const;
const storageLabel = (p: ShopProduct) => (p.storage ? STORAGE_LABEL[p.storage] : 'Store as directed on the label');
/** "Overnight cold-chain shipping $40" / "Shipping $30 (2-day)" (lib/shipping has the price). */
export const shippingLine = (p: ShopProduct) =>
  coldChain(p) ? `Overnight cold-chain shipping $${shippingPriceFor(p)}` : `Shipping $${shippingPriceFor(p)} (2-day)`;

/** Headline price for the selected plan, with the monthly-plan rate labelled beside it when it's higher. */
export function PriceBlock({ product, active }: { product: ShopProduct; active: CadenceTier }) {
  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
        <span className="text-[40px] font-semibold leading-none tracking-[-0.04em]">${active.perMonth}</span>
        {active.key !== 'once' && <span className="text-[17px] text-ink-soft">/mo</span>}
        <MonthlyRate product={product} active={active} className="text-[14px]" />
      </p>
      <p className="mt-2 text-[14px] text-ink-soft tabular-nums">
        {active.key === 'once'
          ? `One-time · $${active.total} · no subscription`
          : `Billed $${active.total} ${billedEvery(active)} · cancel anytime`}
      </p>
      <p className="mt-0.5 text-[14px] text-ink-soft tabular-nums">
        + ${shippingPriceFor(product)} shipping{active.key === 'once' ? '' : ' each shipment'}
      </p>
    </div>
  );
}

/**
 * Compact plan picker for phones: the plans side by side in one row,
 * so the choice and the CTA fit on the first screen. Same tiers and prices
 * as PlanOptions; the selected plan's billing terms show under the CTA.
 */
export function PlanSegments({
  tiers,
  selected,
  onSelect,
  pulse = false,
}: {
  tiers: CadenceTier[];
  selected: CadenceTier['key'];
  onSelect: (key: CadenceTier['key']) => void;
  pulse?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Plan" className={cn('grid gap-1.5', tiers.length > 3 ? 'grid-cols-4' : 'grid-cols-3')}>
      {tiers.map((t) => {
        const on = t.key === selected;
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onSelect(t.key)}
            className={cn(
              'relative flex flex-col items-center rounded-inner px-1 pb-2 pt-2.5 text-center transition-[box-shadow,background-color,color] duration-300',
              on ? 'bg-ink text-white ring-2 ring-ink' : 'bg-milk text-ink ring-1 ring-transparent'
            )}
            style={pulse && on ? { boxShadow: '0 0 0 5px rgba(247,221,116,0.7)' } : undefined}
          >
            {t.saveLabel && (
              <span className="absolute -top-2 rounded-full bg-butter px-1.5 py-px text-[10px] font-semibold text-ink">
                {t.saveLabel}
              </span>
            )}
            <span className="text-[13px] font-medium">{t.label}</span>
            <span className="mt-0.5 text-[15px] font-semibold tabular-nums">
              ${t.perMonth}
              {t.key !== 'once' && <span className={cn('text-[11px] font-normal', on ? 'text-white/70' : 'text-ink/65')}>/mo</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Plan rows (radio group) plus what the selected plan includes. */
export function PlanOptions({
  tiers,
  selected,
  onSelect,
  pulse = false,
}: {
  tiers: CadenceTier[];
  selected: CadenceTier['key'];
  onSelect: (key: CadenceTier['key']) => void;
  pulse?: boolean;
}) {
  const active = tiers.find((t) => t.key === selected) ?? tiers[0];
  return (
    <div>
      <div role="radiogroup" aria-label="Plan" className="space-y-2">
        {tiers.map((t) => {
          const on = t.key === selected;
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(t.key)}
              className={cn(
                'flex w-full items-center gap-4 rounded-inner px-4 py-4 text-left transition-[box-shadow,background-color] duration-300',
                on ? 'bg-white ring-2 ring-ink' : 'bg-milk ring-1 ring-transparent hover:ring-ink/20'
              )}
              style={pulse && on ? { boxShadow: '0 0 0 6px rgba(247,221,116,0.6)' } : undefined}
            >
              {/* Radio dot: the selected state reads by shape, not only by colour. */}
              <span
                aria-hidden
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                  on ? 'border-ink' : 'border-ink/30'
                )}
              >
                {on && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px] font-semibold tracking-[-0.01em]">{t.label}</span>
                  {t.saveLabel && (
                    <span className="rounded-full bg-butter px-2 py-0.5 text-[12px] font-semibold text-ink">
                      {t.saveLabel}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[13px] text-ink-soft">{t.description}</span>
              </span>
              <span className="shrink-0 text-right tabular-nums">
                <span className="block text-[16px] font-semibold">
                  ${t.perMonth}
                  {t.key !== 'once' && <span className="text-[13px] font-normal text-ink-soft">/mo</span>}
                </span>
                <span className="block text-[12px] text-ink/65">
                  {t.key === 'once' ? 'no subscription' : `$${t.total} billed`}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* What the selected plan actually includes: whether medication ships
          monthly, every 3 or every 6 months is the thing people want to know. */}
      <ul className="mt-5 space-y-2">
        {active.breakdown.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-soft">
            <Check aria-hidden className="mt-[3px] h-4 w-4 shrink-0" strokeWidth={2} />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compounded-medication disclosure. Sits with the claims, not only in the footer. */
export function Disclosure() {
  return (
    <p className="text-[12px] leading-relaxed text-ink/65">
      Rx only. Compounded medications are not FDA-approved; the FDA does not verify their safety, effectiveness or
      quality. {FDA_DISCLAIMER} Prescribed only after review by a licensed prescriber. Individual results vary. Product images are for illustration;
      your medication ships in the compounding pharmacy&rsquo;s own labelled vial.{' '}
      <Link href="/legal/compounded-medication" className="text-ink/75 underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
        Full disclosure
      </Link>
      .
    </p>
  );
}

function Row({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group rounded-inner bg-milk px-5 md:px-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-semibold tracking-[-0.015em] text-ink md:text-[18px] [&::-webkit-details-marker]:hidden">
        {title}
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white transition-colors group-open:bg-butter">
          <Plus aria-hidden className="h-4 w-4 transition-transform duration-300 group-open:rotate-45" strokeWidth={2} />
        </span>
      </summary>
      <div className="max-w-2xl pb-6 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-3">
          <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
          {b}
        </li>
      ))}
    </ul>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-ink/10 py-3 first:border-t-0 first:pt-0">
      <dt className="text-[13px] font-medium text-ink/65">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

/**
 * Product details and safety information. Side effects and contraindications
 * open by default: they stay on the page, not behind a click.
 * `ordering` adds the member cart flow (the public page has <HowItWorks /> instead).
 */
export function ProductDetails({ product, ordering = false }: { product: ShopProduct; ordering?: boolean }) {
  const categoryLabel =
    ALL_ITEMS.find((x) => x.item.live === product.id)?.category.name ??
    SHOP_CATEGORIES.find((c) => c.key === product.category)?.label ??
    product.category;
  return (
    <div className="space-y-16 md:space-y-24">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <h2 className="text-[36px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]">The details.</h2>
        <div className="space-y-2">
          <Row title="Overview" open>
            <p>{product.longDescription}</p>
            <p className="mt-3">Best for: {product.bestFor}</p>
          </Row>
          <Row title="What it supports">
            <Bullets items={product.benefits} />
          </Row>
          <Row title="What's included">
            <Bullets items={product.whatsIncluded} />
          </Row>
          <Row title="Delivery and cycle">
            <dl>
              <Spec label="Delivery" value={DELIVERY_LABEL[product.delivery]} />
              <Spec label="Cycle length" value={product.cycleLength} />
              <Spec label="Category" value={categoryLabel} />
              <Spec label="Storage" value={storageLabel(product)} />
            </dl>
          </Row>
          <Row title="Shipping">
            <p>
              {coldChain(product)
                ? `Overnight cold-chain shipping from our licensed 503A pharmacy, in temperature-controlled packaging: $${shippingPriceFor(product)} per shipment.`
                : `2-day shipping from our licensed 503A pharmacy: $${shippingPriceFor(product)} per shipment.`}{' '}
              Each plan renewal ships again and is charged shipping again. Tracking is available in your portal once your order ships.
            </p>
          </Row>
          {ordering && (
            <Row title="How ordering works">
              <ol className="space-y-3">
                {[
                  ['Order', 'Pick a cadence. Nothing is charged.'],
                  ['Prescriber review', 'Usually within 1 business day, against your intake.'],
                  ['Pay if approved', 'A secure link, only once approved.'],
                  ['Compounded and shipped', 'The pharmacy typically ships within a few business days of approval.'],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="pt-0.5 text-[13px] font-semibold tabular-nums text-ink/60">0{i + 1}</span>
                    <span>
                      <span className="block font-medium text-ink">{t}</span>
                      {b}
                    </span>
                  </li>
                ))}
              </ol>
            </Row>
          )}
          <Row title="Questions?">
            <p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                {SUPPORT_EMAIL}
              </a>
            </p>
            {SUPPORT_PHONE && (
              <p className="mt-2">
                <a href={SUPPORT_PHONE_HREF} className="underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                  {SUPPORT_PHONE}
                </a>{' '}
                · {SUPPORT_HOURS}
              </p>
            )}
          </Row>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <h2 className="text-[36px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]">Safety information.</h2>
        <div className="space-y-2">
          <Row title="Possible side effects" open>
            <Bullets items={product.sideEffects} />
          </Row>
          <Row title="Contraindications" open>
            <p className="mb-3">
              Tell your prescriber if any of these apply to you. Your intake is screened against them before anything
              is approved.
            </p>
            <Bullets items={product.contraindications} />
          </Row>
          <p className="max-w-2xl pt-3 text-[13px] leading-relaxed text-ink/65">
            Not exhaustive and not medical advice. Talk to your own healthcare provider about your history and
            medications before starting.
          </p>
        </div>
      </section>
    </div>
  );
}
