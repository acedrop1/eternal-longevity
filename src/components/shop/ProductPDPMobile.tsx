'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cadenceTiersForProduct, type CadenceTier, type ShopProduct } from '@/lib/shopProducts';
import { useCart } from '@/components/cart/CartProvider';
import { BuyBar, useCtaOffscreen } from './BuyBar';
import { Disclosure, PlanSegments, ProductDetails, ProductImage } from './pdpParts';

interface ProductPDPMobileProps {
  product: ShopProduct;
  /**
   * When set, CTAs link here instead of adding to cart. The public
   * storefront points it at the assessment.
   */
  ctaHref?: string;
}

/**
 * Mobile-only product page. The first screen holds everything needed to buy:
 * a shorter photo, name + price, a one-row plan picker and the CTA. What the
 * plan includes, the disclosures, details and safety follow below. A fixed buy bar (BuyBar) docks at the bottom whenever the inline
 * CTA is off screen; "Change" scrolls back to the plan picker and flashes the
 * selected row. Hidden from md, where ProductPDP takes over.
 */
export function ProductPDPMobile({ product, ctaHref }: ProductPDPMobileProps) {
  const { addItem } = useCart();
  const tiers = cadenceTiersForProduct(product);
  const defaultTier = tiers.find((t) => t.key === 'quarterly') ?? tiers[0];
  const [selectedTier, setSelectedTier] = useState<CadenceTier['key']>(defaultTier.key);
  const active = tiers.find((t) => t.key === selectedTier) ?? defaultTier;

  // Fixed buy bar whenever the inline CTA is off screen (above or below).
  const ctaRef = useRef<HTMLDivElement>(null);
  const showBar = useCtaOffscreen(ctaRef);

  const planRef = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(false);
  const scrollToPlan = () => {
    planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPulse(true);
    setTimeout(() => setPulse(false), 1400);
  };

  const handleAddToCart = () => addItem(product.id, selectedTier);

  return (
    <div className="text-black md:hidden">
      {/* First screen: photo, name + price, plan picker and CTA, so nobody
          has to scroll to buy (System Labs pattern). Details follow below. */}
      <ProductImage
        product={product}
        sizes="100vw"
        className="h-[44svh] min-h-[260px] w-full rounded-[4px]"
        // The box is wider than the 3:4 photo, so anchor the crop near the
        // top: the whole vial stays in and only its reflection is trimmed.
        position="50% 18%"
      />

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="font-display font-normal"
            style={{ fontSize: 'clamp(2rem, 7vw, 2.6rem)', fontStretch: '75%', lineHeight: 1 }}
          >
            {product.name}
          </h1>
          <p className="mt-1.5 text-[14px] text-black/70">{product.tagline}</p>
        </div>
        <p className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
          {active.key === 'quarterly' && active.perMonth < product.pricing.monthly && (
            <s className="text-[15px] text-black/40">${product.pricing.monthly}</s>
          )}
          <span className="text-[1.9rem] font-medium leading-none tracking-tight">${active.perMonth}</span>
          {active.key !== 'once' && <span className="text-[14px] text-black/60">/mo</span>}
        </p>
      </div>

      <div ref={planRef} className="mt-5 scroll-mt-40">
        <PlanSegments tiers={tiers} selected={selectedTier} onSelect={setSelectedTier} pulse={pulse} />
      </div>

      <div ref={ctaRef} className="mt-3">
        {ctaHref ? (
          <Link
            href={ctaHref}
            className="block w-full rounded-full bg-black px-5 py-3.5 text-center font-mono text-[14px] text-white transition-colors hover:bg-black/85"
          >
            Start assessment
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="block w-full rounded-full bg-black px-5 py-3.5 text-center font-mono text-[14px] text-white transition-colors hover:bg-black/85"
          >
            Add to Cart. ${active.total}
          </button>
        )}
        <p className="mt-2.5 text-center font-mono text-[12px] text-black/55 tabular-nums">
          {active.key === 'once'
            ? `One-time · $${active.total} · no subscription`
            : `Billed $${active.total} ${active.key === 'monthly' ? 'monthly' : 'every 3 months'} · free shipping · cancel anytime`}
        </p>
      </div>

      {/* Below the fold: what the chosen plan includes, then the rest. */}
      <div className="mt-10 border-t border-black/15 pt-5">
        <p className="font-mono text-[13px] text-black/55">Batch tested · compounded in a 503A pharmacy</p>
        <p className="mt-4 text-[15px] font-medium">{active.label} plan includes</p>
        <ul className="mt-3 space-y-2">
          {active.breakdown.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-black/70">
              <Check aria-hidden className="mt-[3px] h-4 w-4 shrink-0" strokeWidth={2} />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 space-y-3 border-t border-black/15 pt-5">
        <p className="text-[14px] leading-relaxed text-black/70">
          <span className="text-black">Important. </span>
          Eternal Longevity peptides are compounded by a licensed 503A pharmacy against a prescription. Not a substitute
          for medical care; do not use if pregnant, nursing, or under 18.
        </p>
        <Disclosure />
      </div>

      <div className="mt-16">
        <ProductDetails product={product} ordering={!ctaHref} />
      </div>

      {/* Room for the buy bar, so the last row is never trapped under it. */}
      <div aria-hidden className="h-28" />

      <BuyBar
        product={product}
        active={active}
        visible={showBar}
        ctaHref={ctaHref}
        onAddToCart={handleAddToCart}
        onChangePlan={scrollToPlan}
      />
    </div>
  );
}
