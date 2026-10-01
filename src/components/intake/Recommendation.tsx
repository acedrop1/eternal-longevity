'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { PlanOptions } from '@/components/shop/pdpParts';
import { sexOnly, type Recommendation } from '@/lib/recommend';
import type { CadenceTier } from '@/lib/shopProducts';

/** A live product as the assessment offers it (built on the server by /start). */
export interface Offer {
  id: string;
  name: string;
  /** What it supports, in plain words. */
  what: string;
  image: string;
  swatch: string;
  contraindications: string[];
  tiers: CadenceTier[];
  /** Cheapest per month: the plan the screen opens on. */
  defaultCadence: CadenceTier['key'];
  /** Whole dollars per shipment (lib/shipping), charged on every shipment. */
  shipping: number;
}

export type PlanChoice = { productId: string; cadence: CadenceTier['key'] };

function ProductRow({ p, size = 'lg' }: { p: Offer; size?: 'lg' | 'sm' }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={size === 'lg' ? 'relative h-24 w-24 flex-none overflow-hidden rounded-inner bg-white' : 'relative h-14 w-14 flex-none overflow-hidden rounded-thumb bg-white'}
        style={{ background: p.swatch }}
      >
        <Image src={p.image} alt={p.name} fill sizes={size === 'lg' ? '96px' : '56px'} className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className={size === 'lg' ? 'text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink md:text-[26px]' : 'text-[16px] font-semibold tracking-[-0.01em] text-ink'}>
          {p.name}
        </p>
        <p className="mt-1 text-[14px] leading-snug text-ink-soft md:text-[15px]">{p.what}</p>
      </div>
    </div>
  );
}

/**
 * The recommendation screen: the product their physician may prescribe, its
 * plans (cheapest per month selected), and "Also a good fit" when the rules
 * found one. The answer is { productId, cadence }; it is always set, so
 * Continue works without touching anything.
 */
export function RecommendationPicker({
  rec,
  offers,
  value,
  onChange,
  startedName,
}: {
  rec: Recommendation | null;
  offers: Record<string, Offer>;
  value: unknown;
  onChange: (v: PlanChoice) => void;
  /** Name of the product they started from, for the "switched" note. */
  startedName?: string;
}) {
  const primary = rec?.primary ? offers[rec.primary] : undefined;
  const alt = rec?.alternative ? offers[rec.alternative] : undefined;
  const v = (value ?? {}) as Partial<PlanChoice>;
  const chosen = alt && v.productId === alt.id ? alt : primary;
  const cadence =
    chosen && v.productId === chosen.id && chosen.tiers.some((t) => t.key === v.cadence) ? v.cadence! : chosen?.defaultCadence;

  useEffect(() => {
    if (chosen && cadence && (v.productId !== chosen.id || v.cadence !== cadence)) onChange({ productId: chosen.id, cadence });
  }, [chosen, cadence, v.productId, v.cadence, onChange]);

  if (!primary || !chosen || !cadence) {
    return (
      <p className="rounded-inner bg-milk px-4 py-3 text-[15px] leading-relaxed text-ink">
        Nothing in this category is available to order right now. Message us and our care team can talk through options.
      </p>
    );
  }
  const other = chosen === primary ? alt : primary;
  const only = rec?.switchedFrom ? sexOnly(rec.switchedFrom) : null;

  return (
    <div>
      {rec?.switchedFrom && (
        <p className="mb-4 rounded-inner bg-butter-soft px-4 py-3 text-[14px] leading-relaxed text-ink ring-1 ring-butter-deep/40">
          {startedName ?? 'The product you started with'}{' '}
          {only ? `is prescribed for ${only === 'm' ? 'men' : 'women'} only` : "isn't available right now"}, so we&rsquo;ve suggested{' '}
          {primary.name} instead.
        </p>
      )}
      <div className="rounded-shell bg-milk p-4 md:p-5">
        <ProductRow p={chosen} />
      </div>

      <p className="mb-3 mt-6 text-[13px] font-medium text-ink/55">Choose your plan</p>
      <PlanOptions tiers={chosen.tiers} selected={cadence} onSelect={(key) => onChange({ productId: chosen.id, cadence: key })} />
      <p className="mt-2 text-[14px] tabular-nums text-ink-soft">+ ${chosen.shipping} shipping each shipment</p>

      <p className="mt-5 text-[14px] leading-relaxed text-ink-soft">
        Nothing is charged unless your physician approves. Your physician makes the final decision.
      </p>

      {other && (
        <div className="mt-6 rounded-shell p-4 ring-1 ring-ink/10 md:p-5">
          <p className="mb-3 text-[13px] font-medium text-ink/55">{other === alt ? 'Also a good fit' : 'Our first suggestion'}</p>
          <ProductRow p={other} size="sm" />
          {other === alt && rec?.reason && <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{rec.reason}</p>}
          <button
            type="button"
            onClick={() => onChange({ productId: other.id, cadence: other.defaultCadence })}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-milk px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-milk-deep"
          >
            Switch to {other.name}
          </button>
        </div>
      )}
    </div>
  );
}
