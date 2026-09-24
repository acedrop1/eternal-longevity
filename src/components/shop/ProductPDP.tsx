'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { ProductCard } from '@/components/sections/ProductRail';
import {
  cadenceTiersForProduct,
  SHOP_CATEGORIES,
  type CadenceTier,
  type ShopProduct,
} from '@/lib/shopProducts';
import { useCart } from '@/components/cart/CartProvider';
import { BuyBar, useCtaOffscreen } from './BuyBar';
import { Disclosure, PlanOptions, PriceBlock, ProductDetails, ProductImage } from './pdpParts';

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
  /** Kept for callers; related products render through <RelatedProducts />. */
  related: ShopProduct[];
}

/**
 * Desktop product page (David pattern): large photo left, sticky buy column
 * right, then details and safety information. The sticky offset reads
 * --pdp-sticky-top so the public page can clear its taller fixed header.
 */
export function ProductPDP({ product, ctaHref }: ProductPDPProps) {
  const tiers = cadenceTiersForProduct(product);
  const defaultTier = tiers.find((t) => t.key === 'quarterly') ?? tiers[0];
  const [selectedTier, setSelectedTier] = useState<CadenceTier['key']>(defaultTier.key);
  const active = tiers.find((t) => t.key === selectedTier) ?? defaultTier;

  // Fixed buy bar once the buy column's CTA is off screen.
  const ctaRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const showBar = useCtaOffscreen(ctaRef);

  const categoryLabel = SHOP_CATEGORIES.find((c) => c.key === product.category)?.label;
  const { addItem } = useCart();

  return (
    <div className="space-y-16 text-black md:space-y-24">
      <section className="grid items-start gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
        <ProductImage product={product} sizes="(max-width: 1024px) 50vw, 760px" className="aspect-[4/5] w-full" />

        <div className="md:sticky md:top-[var(--pdp-sticky-top,5rem)]">
          <p className="flex items-center gap-2 font-mono text-[13px] text-black/55">
            {categoryLabel}
            {product.popular && (
              <span className="rounded-full bg-[#D5A850] px-2 py-0.5 text-[12px] text-black">Popular</span>
            )}
          </p>
          <h1
            className="mt-3 font-display font-normal [text-wrap:balance]"
            style={{ fontSize: 'clamp(2.4rem, 3.4vw + 1rem, 4.5rem)', fontStretch: '75%', lineHeight: 1 }}
          >
            {product.name}
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed text-black/70">{product.tagline}</p>

          <div className="mt-6">
            <PriceBlock product={product} active={active} />
          </div>

          <div ref={planRef} className="mt-6 scroll-mt-48">
            <PlanOptions tiers={tiers} selected={selectedTier} onSelect={setSelectedTier} />
          </div>

          {/* Members add to cart; public visitors start the assessment. */}
          <div ref={ctaRef} className="mt-6">
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
                onClick={() => addItem(product.id, selectedTier)}
                className="block w-full rounded-full bg-black px-5 py-3.5 text-center font-mono text-[14px] text-white transition-colors hover:bg-black/85"
              >
                {active.key === 'once' ? 'Buy once' : 'Subscribe'}
              </button>
            )}
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[13px] text-black/70">
            {['Only charged if approved', 'Free cold-chain shipping', 'Tested before release', 'Cancel anytime'].map(
              (t) => (
                <li key={t} className="flex items-start gap-1.5">
                  <Check aria-hidden className="mt-[2px] h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {t}
                </li>
              )
            )}
          </ul>

          <div className="mt-6 border-t border-black/15 pt-5">
            <Disclosure />
          </div>
        </div>
      </section>

      <ProductDetails product={product} ordering={!ctaHref} />

      <BuyBar
        product={product}
        active={active}
        visible={showBar}
        ctaHref={ctaHref}
        onAddToCart={() => addItem(product.id, selectedTier)}
        onChangePlan={() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
      />
    </div>
  );
}

/**
 * Related products as the homepage's photo cards. The page supplies the
 * section band around it. Withheld products never get a tile.
 */
export function RelatedProducts({ related, basePath }: { related: ShopProduct[]; basePath: string }) {
  // Callers pass live catalogue products only (lib/catalog).
  const items = related;
  if (items.length === 0) return null;
  return (
    <div className="text-black">
      <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
        <h2
          className="font-display font-normal"
          style={{ fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 }}
        >
          Keep exploring.
        </h2>
        <Link
          href={basePath}
          className="shrink-0 font-mono text-[13px] underline decoration-black/50 underline-offset-[3px] transition-colors hover:decoration-black"
        >
          Shop all
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((r) => (
          <ProductCard
            key={r.id}
            className="w-full"
            cta={!basePath.startsWith('/portal')}
            item={{
              id: r.id,
              name: r.name,
              tagline: r.tagline,
              image: r.image,
              price: { was: r.pricing.monthly, now: Math.round(r.pricing.quarterly / 3) },
              href: `${basePath}/${r.id}`,
              preview: false,
            }}
          />
        ))}
      </div>
    </div>
  );
}
