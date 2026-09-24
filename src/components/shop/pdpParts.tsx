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
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_HREF, SUPPORT_HOURS } from '@/lib/site';

/**
 * Pieces shared by the desktop and mobile product pages, so the two can't
 * drift apart on price, plan terms or safety copy.
 */

const H2 = { fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 } as const;

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
      className={cn('relative overflow-hidden rounded-[4px] bg-neutral-200', className)}
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
        <span className="absolute bottom-3 left-3 rounded-[2px] bg-white/75 px-2 py-1 font-mono text-[11px] text-black/70 backdrop-blur-md">
          Image for illustration
        </span>
      )}
      {!product.shot && (
        <>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/75" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
            <p
              className="font-display font-normal"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 4rem)', fontStretch: '75%', lineHeight: 1 }}
            >
              {product.name}
            </p>
            <p className="mt-3 text-[15px] text-white/85">{product.tagline}</p>
            <p className="mt-4 font-mono text-[13px] text-white/65">
              {DELIVERY_LABEL[product.delivery]} · {product.cycleLength}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/** Headline price for the selected plan, with the monthly rate struck through when it's lower. */
export function PriceBlock({ product, active }: { product: ShopProduct; active: CadenceTier }) {
  return (
    <div>
      <p className="flex items-baseline gap-2 tabular-nums">
        {active.key === 'quarterly' && active.perMonth < product.pricing.monthly && (
          <s className="text-[20px] text-black/40">${product.pricing.monthly}</s>
        )}
        <span className="text-[2.5rem] font-medium leading-none tracking-tight">${active.perMonth}</span>
        {active.key !== 'once' && <span className="text-[17px] text-black/60">/mo</span>}
      </p>
      <p className="mt-2 text-[14px] text-black/60 tabular-nums">
        {active.key === 'once'
          ? `One-time · $${active.total} · no subscription`
          : `Billed $${active.total} ${active.key === 'monthly' ? 'monthly' : 'every 3 months'} · free shipping · cancel anytime`}
      </p>
    </div>
  );
}

/**
 * Compact plan picker for phones: the three plans side by side in one row,
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
    <div role="radiogroup" aria-label="Plan" className="grid grid-cols-3 gap-1.5">
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
              'relative flex flex-col items-center rounded-[4px] px-1 pb-2 pt-2.5 text-center transition-[box-shadow,background-color,color] duration-300',
              on ? 'bg-black text-white ring-2 ring-black' : 'bg-black/[0.04] text-black ring-1 ring-black/10'
            )}
            style={pulse && on ? { boxShadow: '0 0 0 5px rgba(213,168,80,0.4)' } : undefined}
          >
            {t.saveLabel && (
              <span className="absolute -top-2 rounded-full bg-[#D5A850] px-1.5 py-px font-mono text-[10px] text-black">
                {t.saveLabel}
              </span>
            )}
            <span className="text-[13px] font-medium">{t.label}</span>
            <span className="mt-0.5 text-[15px] font-medium tabular-nums">
              ${t.perMonth}
              {t.key !== 'once' && <span className={cn('text-[11px] font-normal', on ? 'text-white/70' : 'text-black/55')}>/mo</span>}
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
                'flex w-full items-center gap-4 rounded-[4px] px-4 py-4 text-left transition-[box-shadow,background-color] duration-300',
                on ? 'bg-white ring-2 ring-black' : 'bg-black/[0.04] ring-1 ring-black/10 hover:ring-black/30'
              )}
              style={pulse && on ? { boxShadow: '0 0 0 6px rgba(213,168,80,0.35)' } : undefined}
            >
              {/* Radio dot: the selected state reads by shape, not only by colour. */}
              <span
                aria-hidden
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                  on ? 'border-black' : 'border-black/30'
                )}
              >
                {on && <span className="h-2.5 w-2.5 rounded-full bg-black" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px] font-medium">{t.label}</span>
                  {t.saveLabel && (
                    <span className="rounded-full bg-[#D5A850] px-2 py-0.5 font-mono text-[12px] text-black">
                      {t.saveLabel}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[13px] text-black/60">{t.description}</span>
              </span>
              <span className="shrink-0 text-right tabular-nums">
                <span className="block text-[16px] font-medium">
                  ${t.perMonth}
                  {t.key !== 'once' && <span className="text-[13px] font-normal text-black/60">/mo</span>}
                </span>
                <span className="block text-[12px] text-black/55">
                  {t.key === 'once' ? 'no subscription' : `$${t.total} billed`}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* What the selected plan actually includes: whether medication ships
          monthly or quarterly is the thing people want to know. */}
      <ul className="mt-5 space-y-2">
        {active.breakdown.map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-black/70">
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
    <p className="text-[12px] leading-relaxed text-black/55">
      Compounded preparations are not FDA-approved. These statements have not been evaluated by the Food and Drug
      Administration, and this product is not intended to diagnose, treat, cure, or prevent any disease. Prescription
      only, following review by a licensed prescriber. Individual results vary. Product images are for illustration;
      your medication ships in the compounding pharmacy&rsquo;s own labelled vial.{' '}
      <Link href="/legal/compounded-medication" className="text-black/75 underline underline-offset-2">
        Full disclosure
      </Link>
      .
    </p>
  );
}

function Row({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group border-b border-black/15">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] md:text-[19px] [&::-webkit-details-marker]:hidden">
        {title}
        <Plus aria-hidden className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.75} />
      </summary>
      <div className="max-w-2xl pb-6 text-[15px] leading-relaxed text-black/70 md:text-[16px]">{children}</div>
    </details>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-3">
          <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-black/50" />
          {b}
        </li>
      ))}
    </ul>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-black/15 py-3 first:border-t-0 first:pt-0">
      <dt className="font-mono text-[13px] text-black/55">{label}</dt>
      <dd className="text-right text-black/85">{value}</dd>
    </div>
  );
}

/**
 * Product details and safety information. Side effects and contraindications
 * open by default: they stay on the page, not behind a click.
 * `ordering` adds the member cart flow (the public page has <Process /> instead).
 */
export function ProductDetails({ product, ordering = false }: { product: ShopProduct; ordering?: boolean }) {
  const categoryLabel = SHOP_CATEGORIES.find((c) => c.key === product.category)?.label ?? product.category;
  return (
    <div className="space-y-16 md:space-y-24">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <h2 className="font-display font-normal" style={H2}>
          The details.
        </h2>
        <div className="border-t border-black/15">
          <Row title="Overview" open>
            <p>{product.longDescription}</p>
            <p className="mt-3">Best for: {product.bestFor}</p>
          </Row>
          <Row title="What it does">
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
              <Spec label="Storage" value="Refrigerated 2–8°C · use within compounding date" />
              <Spec label="Tested before release" value="Purity and potency" />
            </dl>
          </Row>
          <Row title="Shipping">
            <p>
              Cold-chain shipped from our licensed 503A pharmacy in temperature-controlled packaging. Free shipping on
              every cycle. Tracking available in your portal once your order ships.
            </p>
          </Row>
          {ordering && (
            <Row title="How ordering works">
              <ol className="space-y-3">
                {[
                  ['Order', 'Pick a cadence. Nothing is charged.'],
                  ['Prescriber review', 'Within 24 hours, against your intake.'],
                  ['Pay if approved', 'A secure link, only once approved.'],
                  ['Compounded and shipped', 'Same day before 4p ET, then 1–2 days cold-chain.'],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="pt-0.5 font-mono text-[13px] tabular-nums text-black/45">0{i + 1}</span>
                    <span>
                      <span className="block text-black">{t}</span>
                      {b}
                    </span>
                  </li>
                ))}
              </ol>
            </Row>
          )}
          <Row title="Questions?">
            <p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2 hover:text-black">
                {SUPPORT_EMAIL}
              </a>
            </p>
            {SUPPORT_PHONE && (
              <p className="mt-2">
                <a href={SUPPORT_PHONE_HREF} className="underline underline-offset-2 hover:text-black">
                  {SUPPORT_PHONE}
                </a>{' '}
                · {SUPPORT_HOURS}
              </p>
            )}
          </Row>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <h2 className="font-display font-normal" style={H2}>
          Safety information.
        </h2>
        <div className="border-t border-black/15">
          <Row title="Possible side effects" open>
            <p className="mb-3">Most are mild and dose-related.</p>
            <Bullets items={product.sideEffects} />
          </Row>
          <Row title="Contraindications" open>
            <p className="mb-3">
              Tell your prescriber if any of these apply to you. Your intake is screened against them before anything
              is approved.
            </p>
            <Bullets items={product.contraindications} />
          </Row>
          <p className="max-w-2xl pt-5 text-[13px] leading-relaxed text-black/55">
            Not exhaustive and not medical advice. Talk to your own healthcare provider about your history and
            medications before starting.
          </p>
        </div>
      </section>
    </div>
  );
}
