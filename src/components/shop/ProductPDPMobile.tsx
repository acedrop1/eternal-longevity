'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  cadenceTiersForProduct,
  DELIVERY_LABEL,
  type CadenceTier,
  type ShopProduct,
} from '@/lib/shopProducts';
import { useCart } from '@/components/cart/CartProvider';

interface ProductPDPMobileProps {
  product: ShopProduct;
}

/**
 * Mobile-only PDP — Oura-style "sticky gallery + sheet-up info panel" pattern.
 *
 *  - Full-bleed sticky gallery at the top (70svh), 3-slide auto-advancing
 *    carousel with dot indicators + swipe gestures.
 *  - Info panel slides up over the bottom of the gallery — rounded top
 *    corners, soft top shadow, negative margin overlap creates the "sheet".
 *  - Plan radio cards (monthly / quarterly / annual) using existing cadence data.
 *  - Inline Add-to-Cart block.
 *  - Floating bottom CTA bar — fades in when inline CTA scrolls out of view,
 *    fades out when it scrolls back in (IntersectionObserver).
 *
 * Desktop renders the original ProductPDP — this component is hidden
 * above the md breakpoint by the parent page.
 */
export function ProductPDPMobile({ product }: ProductPDPMobileProps) {
  const { addItem } = useCart();
  const tiers = cadenceTiersForProduct(product);
  const defaultTier = tiers.find((t) => t.key === 'quarterly') ?? tiers[0];
  const [selectedTier, setSelectedTier] = useState<CadenceTier['key']>(
    defaultTier.key
  );
  const active = tiers.find((t) => t.key === selectedTier) ?? defaultTier;

  // ---------- Carousel ----------
  const slides = product.gallery.slice(0, 3);
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance every 4500ms (pause on user interaction for 8s, pause when tab hidden)
  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const id = setInterval(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, 4500);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  // Pause when tab is hidden
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const userInteract = useCallback(() => {
    setPaused(true);
    const t = setTimeout(() => setPaused(false), 8000);
    return () => clearTimeout(t);
  }, []);

  // Swipe gestures
  const touchStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(dx) > 40) {
      userInteract();
      setSlideIdx((i) => {
        if (dx < 0) return (i + 1) % slides.length;
        return (i - 1 + slides.length) % slides.length;
      });
    }
    touchStart.current = null;
  };

  // ---------- Floating CTA visibility ----------
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showFloater, setShowFloater] = useState(false);

  useEffect(() => {
    const node = ctaRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Floater appears whenever the inline CTA block is OUT of view
        setShowFloater(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Smooth scroll back to the plan picker + brief pulse animation
  const planRef = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(false);
  const scrollToPlan = () => {
    planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPulse(true);
    setTimeout(() => setPulse(false), 1400);
  };

  const handleAddToCart = () => addItem(product.id, selectedTier);

  return (
    <div className="md:hidden -mx-6 -mt-8 relative bg-background">
      {/* ===== 1) STICKY GALLERY ===== */}
      <div
        className="sticky top-0 z-0 w-full overflow-hidden bg-surface"
        style={{ height: '70svh', minHeight: 460 }}
      >
        <div
          className="relative h-full w-full"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Slide track */}
          <div
            className="absolute inset-0 flex h-full transition-transform"
            style={{
              width: `${slides.length * 100}%`,
              transform: `translateX(-${(slideIdx * 100) / slides.length}%)`,
              transitionDuration: '600ms',
              transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {slides.map((src, i) => (
              <div
                key={src + i}
                className="relative h-full flex-shrink-0"
                style={{
                  width: `${100 / slides.length}%`,
                  background: product.swatch,
                }}
              >
                <Image
                  src={src}
                  alt={`${product.name} — view ${i + 1}`}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover opacity-60"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black/70"
                />
                {/* Centered EL monogram + product name overlay (subtle) */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center text-white">
                  <span className="text-[10px] tracking-[0.3em] text-white/60 mb-2">
                    ETERNAL LONGEVITY
                  </span>
                  <span
                    className="text-3xl font-semibold tracking-tight"
                    style={{ textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
                  >
                    {product.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          {slides.length > 1 && (
            <div className="absolute bottom-[88px] left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => {
                    userInteract();
                    setSlideIdx(i);
                  }}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === slideIdx
                      ? 'w-6 bg-accent'
                      : 'w-1.5 bg-white/40 hover:bg-white/60'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== 2) INFO PANEL (slides up over gallery) ===== */}
      <div
        className="relative z-10 bg-background"
        style={{
          marginTop: -28,
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -14px 40px -18px rgba(0,0,0,0.55)',
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 28,
          paddingBottom: 120,
        }}
      >
        {/* Drag pip */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-foreground/15" />

        {/* Eligibility chip */}
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-[11px] font-medium tracking-wider text-accent">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          PHYSICIAN-REVIEWED · COMPOUNDED IN A 503A PHARMACY
        </div>

        {/* Product name */}
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2.25rem, 9vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          {product.name}
        </h1>

        {/* Tagline */}
        <p className="mt-2 text-base italic text-foreground/65">
          {product.tagline}
        </p>

        {/* Price line */}
        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-[11px] tracking-widest text-foreground/50">
            FROM
          </span>
          <span aria-hidden className="text-foreground/30">
            —
          </span>
          {active.saveLabel && (
            <span className="text-base text-foreground/40 line-through">
              ${product.pricing.monthly * (active.key === 'quarterly' ? 3 : active.key === 'annual' ? 12 : 1)}
            </span>
          )}
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            ${active.total}
          </span>
          <span className="text-sm text-foreground/55">
            / {active.label.toLowerCase()}
          </span>
        </div>

        {/* ===== Plan section ===== */}
        <div ref={planRef} className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Plan
              </h3>
              <p className="mt-0.5 text-[12px] italic text-foreground/55">
                Choose your cadence — cancel between cycles
              </p>
            </div>
          </div>

          <div
            role="radiogroup"
            aria-label="Subscription plan"
            className="space-y-2.5"
          >
            {tiers.map((tier) => {
              const selected = tier.key === selectedTier;
              return (
                <button
                  key={tier.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedTier(tier.key)}
                  className={cn(
                    'group relative w-full rounded-2xl border-2 px-4 py-4 text-left transition-all duration-300',
                    selected
                      ? 'border-accent bg-accent/[0.06]'
                      : 'border-line bg-surface-raised hover:border-foreground/30',
                    pulse && selected && 'animate-pulse-accent'
                  )}
                  style={{
                    boxShadow:
                      pulse && selected
                        ? '0 0 0 6px rgba(213,168,80,0.25)'
                        : undefined,
                    transition:
                      'border-color 200ms, box-shadow 1400ms ease-out, background 200ms',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold tracking-tight text-foreground">
                          {tier.label}
                        </span>
                        {tier.saveLabel && (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-accent">
                            {tier.saveLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-foreground/55">
                        {tier.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-foreground">
                        ${tier.total}
                      </div>
                      <div className="text-[10px] tracking-wider text-foreground/45">
                        ${tier.perMonth}/mo
                      </div>
                    </div>
                    {/* Radio bullet */}
                    <span
                      className={cn(
                        'grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border-2 transition-colors',
                        selected
                          ? 'border-accent bg-accent text-black'
                          : 'border-foreground/25'
                      )}
                    >
                      {selected && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== Inline Add to Cart block ===== */}
        <div
          ref={ctaRef}
          className="cta-block mt-7 rounded-2xl bg-surface-raised p-4"
        >
          <button
            type="button"
            onClick={handleAddToCart}
            className="block w-full rounded-full bg-accent px-6 py-4 text-base font-semibold tracking-wide text-black transition-colors hover:bg-accent-soft active:scale-[0.98]"
          >
            Add to Cart — ${active.total}
          </button>
          <p className="mt-3 text-center text-[11px] tracking-wider text-foreground/50">
            Ships in {active.key === 'monthly' ? 'monthly cycles' : active.key === 'quarterly' ? 'quarterly cycles' : 'a single annual shipment'} · cancel between cycles
          </p>
        </div>

        {/* ===== Important Disclaimer ===== */}
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/[0.05] p-4">
          <p className="text-[13px] leading-relaxed text-foreground/85">
            <span className="font-semibold text-accent">Important. </span>
            Eternal Longevity peptides are dispensed under a physician
            prescription after intake review. Not a substitute for medical
            care; do not use if pregnant, nursing, or under 18.
          </p>
        </div>

        {/* ===== Overview ===== */}
        <Section title="Overview" eyebrow="01">
          <p className="text-foreground/70 leading-relaxed">
            {product.longDescription}
          </p>
        </Section>

        {/* ===== Best For ===== */}
        <Section title="Best for" eyebrow="02">
          <p className="text-foreground/70 leading-relaxed">{product.bestFor}</p>
        </Section>

        {/* ===== Benefits ===== */}
        <Section title="Benefits" eyebrow="03">
          <ul className="space-y-2.5">
            {product.benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 text-foreground/75">
                <span
                  aria-hidden
                  className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"
                />
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* ===== What's Included ===== */}
        <Section title="What's included" eyebrow="04">
          <ul className="space-y-2.5">
            {product.whatsIncluded.map((b) => (
              <li key={b} className="flex items-start gap-3 text-foreground/75">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-1 flex-shrink-0 text-accent"
                  aria-hidden
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* ===== Specifications ===== */}
        <Section title="Specifications" eyebrow="05">
          <dl className="divide-y divide-line text-sm">
            <SpecRow label="Delivery" value={DELIVERY_LABEL[product.delivery]} />
            <SpecRow label="Cycle length" value={product.cycleLength} />
            <SpecRow
              label="Category"
              value={
                product.category.charAt(0).toUpperCase() +
                product.category.slice(1)
              }
            />
            <SpecRow
              label="Storage"
              value="Refrigerated 2–8°C · use within compounding date"
            />
            <SpecRow label="Physician review" value="Required" />
          </dl>
        </Section>

        {/* ===== Shipping ===== */}
        <Section title="Shipping" eyebrow="06">
          <p className="text-foreground/70 leading-relaxed">
            Cold-chain shipped from our licensed 503A pharmacy in temperature-
            controlled packaging. Free shipping on every cycle. Tracking
            available in your portal once your physician signs off.
          </p>
        </Section>

        {/* ===== Questions ===== */}
        <Section title="Questions?" eyebrow="07">
          <div className="space-y-3 text-foreground/75">
            <a
              href="mailto:care@eternallongevity.com"
              className="flex items-center gap-3 hover:text-foreground transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
                aria-hidden
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>care@eternallongevity.com</span>
            </a>
            <a
              href="tel:+18555551234"
              className="flex items-center gap-3 hover:text-foreground transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
                aria-hidden
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>(855) 555-1234 · Mon–Fri 9a–6p ET</span>
            </a>
          </div>
        </Section>
      </div>

      {/* ===== 3) FLOATING BOTTOM CTA BAR (mobile only, fades in when inline CTA out of view) ===== */}
      <div
        aria-hidden={!showFloater}
        className={cn(
          'fixed left-3 right-3 z-[95] transition-opacity duration-300 ease-out',
          showFloater
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
        style={{
          bottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <div className="rounded-2xl bg-surface-raised border border-line p-3 shadow-2xl backdrop-blur-md">
          {/* Top row: tappable summary */}
          <button
            type="button"
            onClick={scrollToPlan}
            className="mb-2.5 flex w-full items-center justify-between gap-2 rounded-full bg-background/60 px-4 py-2 text-left transition-colors hover:bg-background/80"
          >
            <span className="flex items-center gap-2 text-[12px] tracking-wider text-foreground/80">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
              {active.label} · {product.cycleLength}
            </span>
            <span className="text-[11px] underline-offset-2 text-foreground/60 underline">
              Change
            </span>
          </button>
          {/* Bottom row: price + Add to Cart */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="text-[10px] tracking-wider text-foreground/50">
                TOTAL
              </div>
              <div className="text-lg font-semibold text-foreground">
                ${active.total}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-accent-soft active:scale-[0.98]"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-9 border-t border-line pt-7">
      <p className="mb-2 text-[10px] tracking-widest text-foreground/40">
        {eyebrow}
      </p>
      <h3 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className="text-[12px] tracking-wider text-foreground/55">{label}</dt>
      <dd className="text-right text-foreground/85">{value}</dd>
    </div>
  );
}
