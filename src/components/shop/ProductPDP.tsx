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
  product: ShopProduct;
  related: ShopProduct[];
}

export function ProductPDP({ product, related }: ProductPDPProps) {
  const [activeImage, setActiveImage] = useState(0);
  const tiers = cadenceTiersForProduct(product);
  const defaultTier =
    tiers.find((t) => t.key === 'quarterly') ?? tiers[0];
  const [selectedTier, setSelectedTier] = useState<CadenceTier['key']>(
    defaultTier.key
  );

  const active = tiers.find((t) => t.key === selectedTier) ?? defaultTier;
  const heroImage = product.gallery[activeImage] ?? product.image;

  const { addItem } = useCart();
  const handleAddToCart = () => addItem(product.id, selectedTier);

  return (
    <div className="space-y-12 md:space-y-20">
      {/* === PDP HERO. Two-column on desktop === */}
      <section className="grid gap-8 md:gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* Gallery */}
        <div className="grid grid-cols-[68px_1fr] md:grid-cols-[88px_1fr] gap-3 md:gap-4">
          {/* Thumbnails. Miniature packaging cards matching the hero */}
          <div className="flex flex-col gap-2 md:gap-3">
            {product.gallery.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`Show image ${i + 1}`}
                style={{
                  background: `linear-gradient(180deg, ${product.swatch} 0%, var(--bg, #000000) 100%)`,
                }}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-xl transition-all duration-300 ease-out-expo',
                  i === activeImage
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-background'
                    : 'ring-1 ring-line opacity-80 hover:opacity-100'
                )}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="88px"
                  className="object-cover opacity-40"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70"
                />
                <span
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tracking-widest text-accent"
                  style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
                >
                  EL
                </span>
              </button>
            ))}
          </div>

          {/* Hero. Packaging-style */}
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-[2.25rem] md:rounded-[2.75rem] border border-line"
            style={{
              background: product.swatch,
              boxShadow:
                '0 60px 120px -20px rgba(213,168,80,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <Image
              src={heroImage}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 640px"
              className="object-cover opacity-40 transition-opacity duration-700 ease-out-expo"
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

          {/* Rating placeholder */}
          <div className="mb-6 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg
                  key={i}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={i <= 4 ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-accent"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-foreground/55">
              4.7 · 184 member reviews
            </span>
          </div>

          <p className="mb-6 text-foreground/75 leading-relaxed">
            {product.longDescription}
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
                        <span className="text-xs text-foreground/55 font-normal">
                          /mo
                        </span>
                      </span>
                      <span className="block text-[10px] tracking-wider text-foreground/45 mt-0.5">
                        ${t.total} total
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subscribe CTA. Adds to cart and opens the drawer */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="block w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base text-center hover:bg-accent-soft transition-colors"
          >
            Subscribe. ${active.perMonth}/mo →
          </button>
          <p className="mt-3 text-center text-[11px] text-foreground/45">
            Compounded and third-party tested before it ships · Cancel between cycles
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
        </div>
      </section>

      {/* === BENEFITS === */}
      <section className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <p className="mb-3 text-[11px] tracking-widest text-foreground/55">
            01 / WHAT IT DOES
          </p>
          <h2
            className="font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Engineered for outcomes.
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {product.benefits.map((b, i) => (
            <div
              key={i}
              className="rounded-2xl border border-line bg-surface p-5"
            >
              <div className="mb-3 inline-flex items-center justify-center h-7 w-7 rounded-full bg-accent/10 text-accent">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {b}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* === WHAT'S INCLUDED === */}
      <section className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <p className="mb-3 text-[11px] tracking-widest text-foreground/55">
            02 / WHAT&apos;S INCLUDED
          </p>
          <h2
            className="font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            In every shipment.
          </h2>
        </div>
        <ul className="space-y-2">
          {product.whatsIncluded.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 md:p-5"
            >
              <span className="text-sm text-foreground/85">{item}</span>
              <span className="text-[10px] tracking-widest text-foreground/45">
                INCLUDED
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="rounded-3xl border border-line bg-surface px-6 py-12 md:px-12 md:py-16">
        <p className="mb-3 text-[11px] tracking-widest text-foreground/55">
          03 / FROM SUBSCRIBE TO SHIP
        </p>
        <h2
          className="mb-10 max-w-2xl font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 3rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.02,
          }}
        >
          The flow, end to end.
        </h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            { n: '01', t: 'Subscribe', b: 'Pick the cadence and confirm.' },
            { n: '02', t: 'Quality review', b: 'Checked against your intake.' },
            { n: '03', t: 'Pharmacy compounds', b: 'Within 48 hours of your order.' },
            { n: '04', t: 'Cold-chain ships', b: 'Tracked, signature required.' },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-line bg-background p-5"
            >
              <div className="mb-3 text-[10px] tracking-widest text-accent">
                {s.n}
              </div>
              <div className="mb-1 text-base font-semibold tracking-tight text-foreground">
                {s.t}
              </div>
              <p className="text-xs text-foreground/65 leading-relaxed">
                {s.b}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* === RELATED === */}
      {related.length > 0 && (
        <section>
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-[11px] tracking-widest text-foreground/55">
                04 / KEEP EXPLORING
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
              href="/portal/shop"
              className="text-[11px] tracking-widest text-accent hover:text-accent-soft"
            >
              VIEW ALL PRODUCTS →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/portal/shop/${r.id}`}
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
      />
    </div>
  );
}

function StickySubscribeBar({
  product,
  active,
  onSubscribe,
}: {
  product: ShopProduct;
  active: CadenceTier;
  onSubscribe: () => void;
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
        <button
          type="button"
          onClick={onSubscribe}
          className="flex-shrink-0 rounded-full bg-accent text-black font-semibold px-5 py-2.5 text-sm hover:bg-accent-soft transition-colors"
        >
          Subscribe →
        </button>
      </div>
    </div>
  );
}
