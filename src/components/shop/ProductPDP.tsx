'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  cadenceTiersForProduct,
  DELIVERY_LABEL,
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

  const { addItem } = useCart();
  const handleAddToCart = () => addItem(product.id, selectedTier);

  return (
    <div className="space-y-12 md:space-y-20">
      {/* === PDP HERO. Two-column on desktop === */}
      <section className="grid gap-8 md:gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* One image. A thumbnail strip on a vial that looks the same from
            every angle was four clicks that told the member nothing. */}
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-[2.25rem] md:rounded-[2.75rem] border border-line"
          style={{
            background: product.swatch,
            boxShadow:
              '0 60px 120px -20px rgba(213,168,80,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 640px"
            className="object-cover opacity-40"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/80"
          />
          <div className="relative flex h-full flex-col items-center justify-between p-6 md:p-8 text-center">
            <span className="text-[10px] tracking-widest text-white/70">
              ETERNAL LONGEVITY
            </span>
            <div style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
              <div className="mb-2 text-[10px] tracking-widest text-accent">
                {product.tagline.toUpperCase()}
              </div>
              <div
                className="font-bold tracking-tight text-white"
                style={{
                  fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                  letterSpacing: '-0.02em',
                }}
              >
                {product.name}
              </div>
            </div>
            <div className="text-[10px] tracking-widest text-white/55">
              {DELIVERY_LABEL[product.delivery].toUpperCase()} ·{' '}
              {product.cycleLength.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Info column */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {product.popular && (
              <span className="inline-flex items-center rounded-full bg-accent/95 text-black px-2.5 py-1 text-[10px] tracking-widest font-semibold">
                POPULAR
              </span>
            )}
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] tracking-wider text-foreground/70">
              {DELIVERY_LABEL[product.delivery].toUpperCase()}
            </span>
            <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] tracking-wider text-foreground/70">
              {product.cycleLength.toUpperCase()}
            </span>
          </div>

          <h1
            className="mb-2 font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
              letterSpacing: '-0.025em',
              lineHeight: 1.02,
            }}
          >
            {product.name}
          </h1>
          <p className="mb-5 text-base text-accent">{product.tagline}</p>

          {/* Factual quality strip. No rating until real reviews exist. */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {[
              'Third-party tested',
              '503A compounded',
              'Cold-chain shipped',
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] tracking-wider text-foreground/70"
              >
                {t.toUpperCase()}
              </span>
            ))}
          </div>

          <p className="mb-6 text-foreground/75 leading-relaxed">
            {product.longDescription}
          </p>

          {/* Sits with the claims, not only in the footer: a reviewer reading
              this page should not have to scroll to find the qualification. */}
          <p className="mb-6 rounded-2xl border border-line bg-surface px-4 py-3 text-[11px] leading-relaxed text-foreground/50">
            Compounded preparations are not FDA-approved. These statements have
            not been evaluated by the Food and Drug Administration, and this
            product is not intended to diagnose, treat, cure, or prevent any
            disease. Prescription only, following review by a licensed
            prescriber. Individual results vary.{' '}
            <Link
              href="/legal/compounded-medication"
              className="text-accent underline underline-offset-2"
            >
              Read the full disclosure
            </Link>
            .
          </p>

          {/* Best for callout */}
          <div className="mb-8 rounded-2xl border border-line bg-surface p-4 md:p-5">
            <div className="mb-1.5 text-[10px] tracking-widest text-accent">
              BEST FOR
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {product.bestFor}
            </p>
          </div>

          {/* Cadence picker (Oura "Subscribe & save" pattern) */}
          <div className="mb-5">
            <div className="mb-3 text-[10px] tracking-widest text-foreground/55">
              CHOOSE A CADENCE
            </div>
            <div className="space-y-2">
              {tiers.map((t) => {
                const isActive = t.key === selectedTier;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedTier(t.key)}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all',
                      isActive
                        ? 'border-accent bg-accent/5'
                        : 'border-line bg-surface hover:border-foreground/30'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2 transition-all',
                        isActive ? 'border-accent' : 'border-line'
                      )}
                    >
                      {isActive && (
                        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {t.label}
                        </span>
                        {t.saveLabel && (
                          <span className="rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] tracking-widest font-semibold">
                            {t.saveLabel.toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-foreground/55 mt-0.5">
                        {t.description}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-right">
                      <span className="block text-base font-semibold text-foreground tabular-nums">
                        ${t.perMonth}
                        {t.key !== 'once' && (
                          <span className="text-xs text-foreground/55 font-normal">
                            /mo
                          </span>
                        )}
                      </span>
                      <span className="block text-[10px] tracking-wider text-foreground/45 mt-0.5">
                        {t.key === 'once' ? 'one time' : `$${t.total} total`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA. Members add to cart; public visitors start the assessment. */}
          {ctaHref ? (
            <Link
              href={ctaHref}
              className="block w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base text-center hover:bg-accent-soft transition-colors"
            >
              Get started. {active.key === 'once' ? `$${active.total}` : `From $${active.perMonth}/mo`} →
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              className="block w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base text-center hover:bg-accent-soft transition-colors"
            >
              {active.key === 'once' ? `Buy once. $${active.total}` : `Subscribe. $${active.perMonth}/mo`} →
            </button>
          )}
          <p className="mt-3 text-center text-[11px] text-foreground/45">
            {ctaHref
              ? 'Complete a short assessment to order · Compounded and third-party tested before it ships'
              : 'Compounded and third-party tested before it ships · Cancel between cycles'}
          </p>

          {/* Inline reassurance row */}
          <ul className="mt-6 grid gap-2 text-xs text-foreground/65">
            <li className="flex items-start gap-2">
              <span className="text-accent" aria-hidden>·</span>
              <span>503A pharmacy. Cold-chain shipping. Tracked.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent" aria-hidden>·</span>
              <span>Pause or cancel anytime through the portal.</span>
            </li>
          </ul>

          {/* Detail folds. Everything that used to be four full-width sections
              the member had to scroll past to reach the next product. */}
          <div className="mt-8 divide-y divide-line border-y border-line">
            <Fold title="What it does" defaultOpen>
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
                  <Image
                    src={r.image}
                    alt={r.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover opacity-45 transition-all duration-[1.6s] ease-out-expo group-hover:scale-105"
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
