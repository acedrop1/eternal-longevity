'use client';

import { EXPLAINER } from '@/lib/explainers';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cadenceTiersForProduct, defaultTier, type CadenceTier, type ShopProduct } from '@/lib/shopProducts';
import { useCart } from '@/components/cart/CartProvider';
import { BuyBar, ctaTarget, useCtaOffscreen } from './BuyBar';
import { billedLine, usd, Disclosure, MonthlyRate, PlanSegments, ProductDetails, ProductImage, shippingLine, shippingNote } from './pdpParts';
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
      {/* Oura-style: the photo runs edge to edge under the floating header, in its own 4:5 shape so the
          whole product shows; the details ride up over its bottom edge on a rounded sheet. */}
      {/* The photo holds still (sticky) and the card scrolls up over it. */}
      <div className="sticky top-0 z-0 -mx-5">
        <ProductImage product={product} sizes="100vw" className="aspect-[4/5] rounded-none" labelClass="bottom-11 left-5" />
      </div>

      <div className="relative z-10 -mx-5 -mt-7 rounded-t-[28px] bg-white px-5 pt-7 shadow-[0_-12px_30px_-18px_rgba(17,17,17,0.35)]">

      {/* One column, top to bottom (iOS product pages): name, what it's for, price. Nothing squeezed side by side. */}
      <div>
        {/* The desktop variant (ProductPDP) carries the page's one <h1>. This one is a level-1
            heading only to assistive tech, which sees just the variant that is displayed. */}
        <p role="heading" aria-level={1} className="text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] text-ink [text-wrap:balance]">{product.name}</p>
        <p className="mt-1.5 text-[16px] leading-snug text-ink-soft">{product.tagline}</p>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
          <span className="text-[28px] font-semibold leading-none tracking-[-0.03em]">${active.perMonth}<span className="text-[16px] font-normal text-ink-soft">/mo</span></span>
          <MonthlyRate product={product} active={active} className="text-[14px]" />
        </p>
      </div>

      <p className="mt-4 text-[16px] leading-relaxed text-ink/80">{EXPLAINER[product.id] ?? product.shortDescription}</p>

      {/* The floating bar hides while the plans or the button are on screen, so it never covers them. */}
      <div ref={ctaRef}>
      {pickPlan && (
        <div ref={planRef} className="mt-5 scroll-mt-40">
          <PlanSegments tiers={tiers} selected={selectedTier} onSelect={setSelectedTier} pulse={pulse} />
        </div>
      )}

      <div className="mt-3">
        {href ? (
          <Link
            href={href}
            className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-butter px-5 text-center text-[17px] font-semibold text-ink transition-colors hover:bg-butter-deep"
          >
            {ctaLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-butter px-5 text-center text-[17px] font-semibold text-ink transition-colors hover:bg-butter-deep"
          >
            Add to cart · ${usd(active.total)}
          </button>
        )}
        {pickPlan && <p className="mt-3 text-center text-[13px] leading-snug text-ink/65 tabular-nums">
          {billedLine(active)} · {shippingLine(product)} · {active.key === 'annual' ? 'cancel before your next yearly billing' : 'cancel anytime'}
        </p>}
        <p className="mt-1 text-center text-[13px] leading-snug text-ink/65 tabular-nums">{shippingNote(shipping)}</p>
      </div>
      </div>

      {/* Below the fold: what the chosen plan includes, then the rest. */}
      <div className="mt-10 rounded-shell bg-milk p-5">
        <p className="text-[13px] font-medium text-ink/65">Compounded by a licensed 503A pharmacy</p>
        <p className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">{active.label} includes</p>
        <ul className="mt-3 space-y-2">
          {active.breakdown.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-soft">
              <Check aria-hidden className="mt-[3px] h-4 w-4 shrink-0" strokeWidth={2} />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 space-y-3 border-t border-ink/10 pt-5">
        <p className="text-[15px] leading-relaxed text-ink-soft">
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
      </div>

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
