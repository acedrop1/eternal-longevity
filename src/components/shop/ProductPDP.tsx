'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { ProductCard } from '@/components/sections/ProductRail';
import {
  cadenceTiersForProduct,
  defaultTier,
  SHOP_CATEGORIES,
  type CadenceTier,
  type ShopProduct,
} from '@/lib/shopProducts';
import { fromPrice } from '@/lib/lineup';
import { useCart } from '@/components/cart/CartProvider';
import { BuyBar, useCtaOffscreen } from './BuyBar';
import { coldChain, Disclosure, PlanOptions, PriceBlock, ProductDetails, ProductImage } from './pdpParts';

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
  const initialTier = defaultTier(tiers);
  const [selectedTier, setSelectedTier] = useState<CadenceTier['key']>(initialTier.key);
  const active = tiers.find((t) => t.key === selectedTier) ?? initialTier;

  // Fixed buy bar once the buy column's CTA is off screen.
  const ctaRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const showBar = useCtaOffscreen(ctaRef);

  const categoryLabel = SHOP_CATEGORIES.find((c) => c.key === product.category)?.label;
  const { addItem } = useCart();

  return (
    <div className="space-y-16 text-ink md:space-y-24">
      {/* The photo never runs past the window: its width is capped at 4/5 of the height left below where it
          starts (--pdp-fit: header + breadcrumb + a bottom margin), so it keeps its shape at any screen size
          and sits beside the buy column as one centred pair. */}
      <section className="grid items-start gap-8 md:grid-cols-2 lg:grid-cols-[auto_minmax(0,600px)] lg:justify-center lg:gap-16">
        <ProductImage
          product={product}
          sizes="(max-width: 1024px) 50vw, 760px"
          className="aspect-[4/5] w-full md:sticky md:top-[var(--pdp-sticky-top,5rem)] md:w-[min(100%,calc((100svh-var(--pdp-fit,12rem))*0.8))] lg:w-[min(760px,calc((100svh-var(--pdp-fit,12rem))*0.8))]"
        />

        <div className="md:sticky md:top-[var(--pdp-sticky-top,5rem)]">
          <p className="flex items-center gap-2 text-[13px] font-medium text-ink/55">
            {categoryLabel}
            {product.popular && (
              <span className="rounded-full bg-butter px-2.5 py-0.5 text-[12px] font-semibold text-ink">Popular</span>
            )}
          </p>
          <h1 className="mt-3 text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] lg:text-[64px]">
            {product.name}
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">{product.tagline}</p>

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
                className="block w-full rounded-full bg-butter px-5 py-4 text-center text-[15px] font-semibold text-ink transition-colors hover:bg-butter-deep"
              >
                Start assessment
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => addItem(product.id, selectedTier)}
                className="block w-full rounded-full bg-butter px-5 py-4 text-center text-[15px] font-semibold text-ink transition-colors hover:bg-butter-deep"
              >
                {active.key === 'once' ? 'Buy once' : 'Subscribe'}
              </button>
            )}
          </div>

          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-ink-soft">
            {['Only charged if approved', coldChain(product) ? 'Free cold-chain shipping' : 'Free shipping', 'Physician-reviewed', 'Cancel anytime'].map(
              (t) => (
                <li key={t} className="flex items-start gap-1.5">
                  <Check aria-hidden className="mt-[2px] h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {t}
                </li>
              )
            )}
          </ul>

          <div className="mt-6 border-t border-ink/10 pt-5">
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
    <div className="text-ink">
      <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
        <h2 className="text-[36px] font-semibold leading-[1] tracking-[-0.05em] text-ink md:text-[56px]">Keep exploring.</h2>
        <Link
          href={basePath}
          className="shrink-0 text-[14px] font-medium underline decoration-ink/30 underline-offset-[3px] transition-colors hover:decoration-ink"
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
              price: { was: r.pricing.monthly, now: fromPrice(r.pricing) },
              href: `${basePath}/${r.id}`,
              preview: false,
            }}
          />
        ))}
      </div>
    </div>
  );
}
