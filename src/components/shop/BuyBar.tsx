'use client';

import { useEffect, useState, type RefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { CadenceTier, ShopProduct } from '@/lib/shopProducts';

/**
 * True while `ref` (the page's own CTA) is off screen, above or below, and
 * the footer hasn't come into view. A position check on scroll rather than an
 * IntersectionObserver: a fast fling can skip straight past the CTA without
 * an intersection change to observe.
 */
export function useCtaOffscreen(ref: RefObject<HTMLElement | null>) {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const update = () => {
      const node = ref.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      // Hidden layout (e.g. the mobile block at desktop width) has no box.
      if (r.width === 0 && r.height === 0) return setOff(false);
      const outOfView = r.bottom < 0 || r.top > window.innerHeight;
      // Any rendered footer on screen (skip hidden copies with no box).
      const footerIn = [...document.querySelectorAll('footer')].some((f) => {
        const fr = f.getBoundingClientRect();
        return fr.height > 0 && fr.top < window.innerHeight;
      });
      setOff(outOfView && !footerIn);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ref]);
  return off;
}

/**
 * Floating buy card: a frosted white container inset from the screen edges
 * (centered and width-capped on desktop), not docked to the bottom. One row: product + selected plan and price (with a "Change" link back
 * to the plan picker) on the left, the CTA on the right.
 */
export function BuyBar({
  product,
  active,
  visible,
  ctaHref,
  ctaLabel = 'Start assessment',
  onAddToCart,
  onChangePlan,
}: {
  product: ShopProduct;
  active: CadenceTier;
  visible: boolean;
  /** Public page: link to the assessment. Portal: omit and pass onAddToCart. */
  ctaHref?: string;
  ctaLabel?: string;
  onAddToCart?: () => void;
  onChangePlan: () => void;
}) {
  const ctaCls =
    'shrink-0 rounded-full bg-butter px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-butter-deep md:px-5 md:py-3 md:text-[14px]';

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        'fixed inset-x-3 z-40 mx-auto max-w-3xl rounded-shell bg-white/85 text-ink shadow-[0_20px_50px_-15px_rgba(17,17,17,0.3)] ring-1 ring-ink/5 backdrop-blur-2xl backdrop-saturate-150 transition-[transform,opacity] duration-500 ease-out-expo motion-reduce:transition-none md:inset-x-8',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      )}
      // Floats clear of the edge, and of the home indicator on iPhones.
      style={{ bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))' }}
    >
      <div className="flex items-center gap-3 py-2.5 pl-4 pr-2.5 md:gap-4 md:py-3 md:pl-3 md:pr-3">
        <span className="relative hidden h-11 w-11 shrink-0 overflow-hidden rounded-thumb bg-milk sm:block">
          <Image src={product.image} alt="" fill sizes="44px" className="object-cover" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold leading-none tracking-[-0.03em] md:text-[20px]">{product.name}</p>
          <p className="mt-1 flex items-center gap-2 truncate text-[12px] text-ink-soft">
            {/* Plan name drops on phones so the price always fits. */}
            <span className="truncate">
              <span className="hidden sm:inline">{active.label} · </span>
              <span className="tabular-nums font-medium text-ink">${active.perMonth}/mo</span>
            </span>
            <button
              type="button"
              onClick={onChangePlan}
              className="shrink-0 underline decoration-ink/30 underline-offset-[3px] transition-colors hover:text-ink hover:decoration-ink"
            >
              Change
            </button>
          </p>
        </div>

        {ctaHref ? (
          <Link href={ctaHref} className={ctaCls}>
            {ctaLabel}
          </Link>
        ) : (
          <button type="button" onClick={onAddToCart} className={ctaCls}>
            {active.key === 'once' ? 'Buy once' : 'Add to cart'}
          </button>
        )}
      </div>
    </div>
  );
}
