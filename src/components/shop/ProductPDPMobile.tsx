'use client';

import { EXPLAINER } from '@/lib/explainers';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cadenceTiersForProduct, defaultTier, type CadenceTier, type ShopProduct } from '@/lib/shopProducts';
import { useCart } from '@/components/cart/CartProvider';
import { BuyBar, ctaTarget, useCtaOffscreen } from './BuyBar';
import { billedLine, Disclosure, MonthlyRate, PlanSegments, ProductDetails, ProductImage, shippingLine, shippingNote } from './pdpParts';
import type { ShippingSettings } from '@/lib/shipping-settings';

interface ProductPDPMobileProps {
  product: ShopProduct;
  /** Shipping price and first-order rule (getShippingSettings, read on the server page). */
  shipping: ShippingSettings;
  /**
   * When set, CTAs link here instead of adding to cart. The public
   * storefront points it at the assessment.
   */
  ctaHref?: string;
  /** Label for the ctaHref button. Default: Start assessment. */
  ctaLabel?: string;
}

/**
 * Mobile-only product page. The first screen holds everything needed to buy:
 * a shorter photo, name + price, a one-row plan picker and the CTA. What the
 * plan includes, the disclosures, details and safety follow below. A fixed buy bar (BuyBar) docks at the bottom whenever the inline
 * CTA is off screen; "Change" scrolls back to the plan picker and flashes the
 * selected row. Hidden from md, where ProductPDP takes over.
 */
export function ProductPDPMobile({ product, shipping, ctaHref, ctaLabel = 'Start assessment' }: ProductPDPMobileProps) {
  const { addItem } = useCart();
  const tiers = cadenceTiersForProduct(product, shipping.pricePerShipment);
  const initialTier = defaultTier(tiers);
  const [selectedTier, setSelectedTier] = useState<CadenceTier['key']>(initialTier.key);
  const active = tiers.find((t) => t.key === selectedTier) ?? initialTier;

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
  const { href, pickPlan } = ctaTarget(ctaHref, selectedTier);

  return (
    <div className="text-ink md:hidden">
      {/* First screen: photo, name + price, plan picker and CTA, so nobody
          has to scroll to buy (System Labs pattern). Details follow below. */}
      <ProductImage
        product={product}
        sizes="100vw"
        className="h-[36svh] min-h-[240px] w-full"
        // The box is wider than the 4:5 photo; centre the crop on the product
        // so vials and taller bottles both stay whole.
        position="50% 55%"
      />

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {/* The desktop variant (ProductPDP) carries the page's one <h1>. This one is a level-1
              heading only to assistive tech, which sees just the variant that is displayed. */}
          <p role="heading" aria-level={1} className="text-[36px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance]">{product.name}</p>
          <p className="mt-1.5 text-[14px] text-ink-soft">{product.tagline}</p>
        </div>
        <div className="shrink-0 text-right tabular-nums">
          <p className="flex items-baseline justify-end gap-1.5">
            <span className="text-[30px] font-semibold leading-none tracking-[-0.04em]">${active.perMonth}</span>
            <span className="text-[14px] text-ink-soft">/mo</span>
          </p>
          <MonthlyRate product={product} active={active} className="mt-1 block text-[11px]" />
        </div>
      </div>

      {/* Full width under the name and price, not squeezed beside the price. */}
      <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{EXPLAINER[product.id] ?? product.shortDescription}</p>

      {pickPlan && (
        <div ref={planRef} className="mt-5 scroll-mt-40">
          <PlanSegments tiers={tiers} selected={selectedTier} onSelect={setSelectedTier} pulse={pulse} />
        </div>
      )}

      <div ref={ctaRef} className="mt-3">
        {href ? (
          <Link
            href={href}
            className="block w-full rounded-full bg-butter px-5 py-4 text-center text-[15px] font-semibold text-ink transition-colors hover:bg-butter-deep"
          >
            {ctaLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="block w-full rounded-full bg-butter px-5 py-4 text-center text-[15px] font-semibold text-ink transition-colors hover:bg-butter-deep"
          >
            Add to Cart. ${active.total}
          </button>
        )}
        {pickPlan && <p className="mt-2.5 text-center text-[12px] text-ink/65 tabular-nums">
          {billedLine(active)} · {shippingLine(product)} · {active.key === 'annual' ? 'cancel before your next yearly billing' : 'cancel anytime'}
        </p>}
        <p className="mt-1 text-center text-[12px] text-ink/65 tabular-nums">{shippingNote(shipping)}</p>
      </div>

      {/* Below the fold: what the chosen plan includes, then the rest. */}
      <div className="mt-10 rounded-shell bg-milk p-5">
        <p className="text-[13px] font-medium text-ink/65">Compounded by a licensed 503A pharmacy</p>
        <p className="mt-4 text-[15px] font-semibold tracking-[-0.01em]">{active.label} plan includes</p>
        <ul className="mt-3 space-y-2">
          {active.breakdown.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-soft">
              <Check aria-hidden className="mt-[3px] h-4 w-4 shrink-0" strokeWidth={2} />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 space-y-3 border-t border-ink/10 pt-5">
        <p className="text-[14px] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">Important. </span>
          This medication is compounded by a licensed 503A pharmacy against a prescription. Not a substitute
          for medical care; do not use if pregnant, nursing, or under 18.
        </p>
        <Disclosure />
      </div>

      <div className="mt-16">
        <ProductDetails product={product} shipping={shipping} ordering={!ctaHref} />
      </div>

      {/* Room for the buy bar, so the last row is never trapped under it. */}
      <div aria-hidden className="h-28" />

      <BuyBar
        product={product}
        active={active}
        visible={showBar}
        ctaHref={href}
        ctaLabel={ctaLabel}
        onAddToCart={handleAddToCart}
        onChangePlan={pickPlan ? scrollToPlan : undefined}
      />
    </div>
  );
}
