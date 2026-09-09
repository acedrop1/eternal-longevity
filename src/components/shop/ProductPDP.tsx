'use client';

import { useState } from 'react';
import { ProductVial } from '@/components/shop/ProductVial';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  cadenceTiersForProduct,
  DELIVERY_LABEL,
  SHOP_CATEGORIES,
  type CadenceTier,
  type ShopProduct,
} from '@/lib/shopProducts';
import { useCart } from '@/components/cart/CartProvider';

interface ProductPDPProps {
  /** Route prefix for shop links. '/shop' on the public storefront. */
  basePath?: string;
  /**
   * When set, the subscribe CTA becomes a link to this href instead of an
   * add-to-cart action. The public storefront points it at the assessment —
   * ordering requires a completed assessment and an account.
   */
  ctaHref?: string;
  product: ShopProduct;
  related: ShopProduct[];
}

/** Collapsible detail row. Native <details> — no state, no library. */
function Fold({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground marker:hidden">
        {title}
        <span
          aria-hidden
          className="text-lg font-light leading-none text-foreground/40 transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="pt-3 text-sm leading-relaxed text-foreground/80">
        {children}
      </div>
    </details>
  );
}

export function ProductPDP({ product, related, basePath = '/portal/shop', ctaHref }: ProductPDPProps) {
  const tiers = cadenceTiersForProduct(product);
  const defaultTier =
    tiers.find((t) => t.key === 'quarterly') ?? tiers[0];
  const [selectedTier, setSelectedTier] = useState<CadenceTier['key']>(
    defaultTier.key
  );

  const active = tiers.find((t) => t.key === selectedTier) ?? defaultTier;

  const categoryLabel = SHOP_CATEGORIES.find((c) => c.key === product.category)?.label;
  const { addItem } = useCart();
  const handleAddToCart = () => addItem(product.id, selectedTier);

  return (
    <div className="space-y-12 md:space-y-20">
      {/* === PDP HERO. Two-column on desktop === */}
      <section className="grid gap-8 md:gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* The product itself, drawn — see ProductVial. */}
        <div
          className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[2.25rem] md:rounded-[2.75rem] border border-line px-8 py-12"
          style={{
            background: product.swatch,
            boxShadow:
              '0 60px 120px -20px rgba(213,168,80,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <span className="absolute left-1/2 top-6 -translate-x-1/2 text-[10px] tracking-widest text-white/45">
            ETERNAL LONGEVITY
          </span>
          <ProductVial product={product} className="h-full w-auto max-w-full drop-shadow-2xl" />
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-widest text-white/45">
            {DELIVERY_LABEL[product.delivery].toUpperCase()} ·{' '}
            {product.cycleLength.toUpperCase()}
          </span>
        </div>

        {/* Info column.
            Was: chips, title, tagline, more chips, paragraph, disclaimer box,
            best-for box, four tall cadence rows — eight stacked blocks before
            the member saw a price. Both competitors lead with the price and one
            button. This does that; everything else moved below or into a fold. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 flex items-center gap-2">
            <p className="text-[11px] tracking-widest text-foreground/50">
              {categoryLabel?.toUpperCase()}
            </p>
            {product.popular && (
              <span className="rounded-full bg-accent/95 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-black">
                POPULAR
              </span>
            )}
          </div>

          <h1
            className="mb-1.5 font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
              letterSpacing: '-0.025em',
              lineHeight: 1.02,
            }}
          >
            {product.name}
          </h1>
          <p className="mb-7 text-base text-foreground/55">{product.tagline}</p>

          {/* One price, big, the way they do it. */}
          <div className="mb-1 flex items-baseline gap-1.5">
            <span
              className="font-semibold tabular-nums tracking-tight text-foreground"
              style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', letterSpacing: '-0.03em' }}
            >
              ${active.perMonth}
            </span>
            {active.key !== 'once' && (
              <span className="text-lg text-foreground/45">/mo</span>
            )}
          </div>
          <p className="mb-6 text-[13px] text-foreground/50">
            {active.key === 'once'
              ? `One-time · $${active.total} · no subscription`
              : `Billed $${active.total} ${active.key === 'monthly' ? 'monthly' : active.key === 'quarterly' ? 'every 3 months' : 'once a year'} · free shipping · cancel anytime`}
          </p>

          {/* Compact segmented control instead of four tall rows. */}
          <div className="mb-6 grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-surface p-1.5">
            {tiers.map((t) => {
              const isActive = t.key === selectedTier;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelectedTier(t.key)}
                  className={cn(
                    'rounded-xl px-1 py-2.5 text-center transition-colors',
                    isActive
                      ? 'bg-accent text-black'
                      : 'text-foreground/65 hover:bg-foreground/5'
                  )}
                >
                  <span className="block text-[11px] font-semibold leading-tight">
                    {t.key === 'once' ? 'Once' : t.label}
                  </span>
                  <span
                    className={cn(
                      'block text-[10px] leading-tight',
                      isActive ? 'text-black/60' : 'text-foreground/40'
                    )}
                  >
                    {t.saveLabel ? t.saveLabel.replace('Save ', '-') : '\u00a0'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* CTA. Members add to cart; public visitors start the assessment. */}
          {ctaHref ? (
            <Link
              href={ctaHref}
              className="block w-full rounded-full bg-accent py-4 text-center text-base font-semibold text-black transition-colors hover:bg-accent-soft"
            >
              Start assessment →
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="block w-full rounded-full bg-accent py-4 text-center text-base font-semibold text-black transition-colors hover:bg-accent-soft"
            >
              {active.key === 'once' ? 'Buy once' : 'Subscribe'} →
            </button>
          )}

          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-foreground/60">
            {[
              'Only charged if approved',
              'Free cold-chain shipping',
              'Third-party tested',
              'Cancel anytime',
            ].map((t) => (
              <li key={t} className="flex items-start gap-1.5">
                <span className="text-accent" aria-hidden>
                  ✓
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <p className="mt-7 text-sm leading-relaxed text-foreground/70">
            {product.longDescription}
          </p>

          {/* Sits with the claims, not only in the footer. Plain text now —
              as a bordered card it read as a third competing box. */}
          <p className="mt-4 text-[11px] leading-relaxed text-foreground/40">
            Compounded preparations are not FDA-approved. These statements have
            not been evaluated by the Food and Drug Administration, and this
            product is not intended to diagnose, treat, cure, or prevent any
            disease. Prescription only, following review by a licensed
            prescriber. Individual results vary.{' '}
            <Link
              href="/legal/compounded-medication"
              className="text-foreground/60 underline underline-offset-2"
            >
              Full disclosure
            </Link>
            .
          </p>

          {/* Detail folds. Everything that used to be four full-width sections
              the member had to scroll past to reach the next product. */}
          <div className="mt-8 divide-y divide-line border-y border-line">
            <Fold title="What it does" defaultOpen>
              <p className="mb-3 text-foreground/55">
                Best for: {product.bestFor}
              </p>
              <ul className="space-y-2.5">
                {product.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Fold>

            <Fold title="What's included">
              <ul className="space-y-2.5">
                {product.whatsIncluded.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-accent" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Fold>

            <Fold title="Possible side effects">
              <p className="mb-3 text-foreground/55">
                Most are mild and dose-related.
              </p>
              <ul className="space-y-2.5">
                {product.sideEffects.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-foreground/30" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Fold>

            <Fold title="Contraindications">
              <p className="mb-3 text-foreground/55">
                Tell your prescriber if any of these apply to you. Your intake
                is screened against them before anything is approved.
              </p>
              <ul className="space-y-2.5">
                {product.contraindications.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-foreground/30" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </Fold>

            <Fold title="How it works">
              <ol className="space-y-3">
                {[
                  ['Order', 'Pick a cadence. Nothing is charged.'],
                  ['Prescriber review', 'Within 24 hours, against your intake.'],
                  ['Pay if approved', 'A secure link, only once approved.'],
                  ['Compounded and shipped', 'Same day before 4p ET, then 1–2 days cold-chain.'],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="text-[11px] tabular-nums text-accent">0{i + 1}</span>
                    <span>
                      <span className="block font-semibold text-foreground">{t}</span>
                      <span className="block text-foreground/60">{b}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </Fold>
          </div>
        </div>
      </section>

      {/* === RELATED === */}
      {related.length > 0 && (
        <section>
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-[11px] tracking-widest text-foreground/55">
                05 / KEEP EXPLORING
              </p>
              <h2
                className="font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                Other products in this category
              </h2>
            </div>
            <Link
              href={basePath}
              className="text-[11px] tracking-widest text-accent hover:text-accent-soft"
            >
              VIEW ALL PRODUCTS →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`${basePath}/${r.id}`}
                className="group block overflow-hidden rounded-3xl border border-line bg-surface transition-all hover:border-accent/30"
              >
                <div
                  className="relative aspect-[5/6] overflow-hidden"
                  style={{ background: r.swatch }}
                >
                  <ProductVial
                    product={r}
                    className="absolute inset-0 h-full w-full p-6 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/70"
                  />
                  <div className="relative flex h-full flex-col items-center justify-end p-5 text-center">
                    <div className="mb-1 text-[10px] tracking-widest text-accent">
                      {r.tagline.toUpperCase()}
                    </div>
                    <div className="font-bold text-white text-xl tracking-tight">
                      {r.name}
                    </div>
                  </div>
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div className="text-sm text-foreground/65 truncate pr-2">
                    From ${Math.round(r.pricing.annual / 12)}/mo
                  </div>
                  <span
                    aria-hidden
                    className="text-accent transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* === STICKY BOTTOM SUBSCRIBE BAR === */}
      <StickySubscribeBar
        product={product}
        active={active}
        onSubscribe={handleAddToCart}
        ctaHref={ctaHref}
      />
    </div>
  );
}

function StickySubscribeBar({
  product,
  active,
  onSubscribe,
  ctaHref,
}: {
  product: ShopProduct;
  active: CadenceTier;
  onSubscribe: () => void;
  ctaHref?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 backdrop-blur pb-safe lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">
            {product.name}
          </div>
          <div className="text-[11px] tracking-wider text-foreground/55">
            {active.label.toUpperCase()} · ${active.perMonth}/MO
          </div>
        </div>
        {ctaHref ? (
          <Link
            href={ctaHref}
            className="flex-shrink-0 rounded-full bg-accent text-black font-semibold px-5 py-2.5 text-sm hover:bg-accent-soft transition-colors"
          >
            Get started →
          </Link>
        ) : (
          <button
            type="button"
            onClick={onSubscribe}
            className="flex-shrink-0 rounded-full bg-accent text-black font-semibold px-5 py-2.5 text-sm hover:bg-accent-soft transition-colors"
          >
            Subscribe →
          </button>
        )}
      </div>
    </div>
  );
}
