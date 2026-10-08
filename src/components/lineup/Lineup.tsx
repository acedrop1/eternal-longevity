'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Droplet, Droplets, Pill, SprayCan, Syringe, Tablets, type LucideIcon } from 'lucide-react';
import { useCatalog } from '@/components/catalog/CatalogProvider';
import { FORM_LABEL, countLabel, fromPrice, hrefFor, listedCategories, type Category, type Form, type LineupItem } from '@/lib/lineup';
import type { ShopProduct } from '@/lib/shopProducts';
import { cn } from '@/lib/utils';

/** The header's milky frosted glass, so cards match the rest of the site. */
export const CARD_GLASS =
  'bg-white/60 text-ink ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_10px_40px_-16px_rgba(17,17,17,0.22),inset_0_1px_0_rgba(255,255,255,0.8)]';

/** The catalogue product behind a row, when it's live. */
function useLive(item: LineupItem): ShopProduct | undefined {
  const { products } = useCatalog();
  return item.live ? products.find((p) => p.id === item.live) : undefined;
}

/** Categories as listed publicly (live products; drafts too with LIST_DRAFTS), empty ones included. */
export function useListedCategories(): Category[] {
  const { products } = useCatalog();
  return useMemo(() => listedCategories(products.map((p) => p.id)), [products]);
}

const FORM_ICON: Record<Form, LucideIcon> = {
  injection: Syringe,
  nasal: SprayCan,
  capsule: Pill,
  tablet: Tablets,
  cream: Droplet,
  foam: Droplets,
};

/** Product shot when there is one (live catalogue image, or a lineup render); otherwise a soft tile with the dosage form. */
function Thumb({ item, live, tint, className, iconClass, sizes = '160px' }: { item: LineupItem; live?: ShopProduct; tint: string; className?: string; iconClass?: string; sizes?: string }) {
  const src = live?.image ?? item.image;
  const Icon = FORM_ICON[item.form];
  return (
    <span className={cn('relative grid shrink-0 place-items-center overflow-hidden', src ? 'bg-milk' : tint, className)}>
      {src ? <Image src={src} alt="" fill sizes={sizes} className="object-cover" /> : <Icon aria-hidden strokeWidth={1.4} className={cn('text-ink/70', iconClass)} />}
    </span>
  );
}

function Badge({ children }: { children: string }) {
  return <span className="whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">{children}</span>;
}

/** rhode-style row: thumbnail, name, what it's for, form and price. */
export function LineupRow({ item, tint, onNavigate }: { item: LineupItem; tint: string; onNavigate?: () => void }) {
  const live = useLive(item);
  return (
    <Link
      href={hrefFor(item, live)}
      onClick={onNavigate}
      className="group flex items-center gap-3 rounded-inner bg-white p-2 pr-3 ring-1 ring-black/[0.04] transition-colors hover:bg-milk"
    >
      <Thumb item={item} live={live} tint={tint} className="h-16 w-16 rounded-inner" iconClass="h-6 w-6" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold tracking-[-0.02em]">{item.name}</span>
          {live ? item.badge && <Badge>{item.badge}</Badge> : <Badge>Coming soon</Badge>}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-ink-soft">{item.what}</span>
        <span className="mt-1 block text-[12px] text-ink/60">
          {FORM_LABEL[item.form]}
          {live && ` · from $${fromPrice(live)}/mo`}
        </span>
      </span>
    </Link>
  );
}

/** Grid card for category pages: same shape and glass as the product tiles. */
export function LineupCard({ item, tint }: { item: LineupItem; tint: string }) {
  const live = useLive(item);
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-shell shadow-[0_30px_60px_-36px_rgba(17,17,17,0.5)]">
      <Thumb
        item={item}
        live={live}
        tint={tint}
        sizes="(max-width: 1024px) 50vw, 25vw"
        className="absolute inset-0 -translate-y-[9%] scale-[1.2] transition-transform duration-700 ease-out-expo group-hover:scale-[1.25]"
        iconClass="-mt-16 h-14 w-14 md:-mt-24 md:h-20 md:w-20"
      />

      <div className={cn('absolute left-2 top-2 flex items-baseline gap-1 rounded-full px-2.5 py-1 md:left-4 md:top-4 md:gap-1.5 md:px-4 md:py-2', CARD_GLASS)}>
        {live ? (
          <>
            <span className="text-[11px] text-ink-soft md:text-[13px]">from</span>
            <span className="text-[13px] font-semibold md:text-[17px]">${fromPrice(live)}</span>
            <span className="text-[11px] text-ink-soft md:text-[13px]">/mo</span>
          </>
        ) : (
          <span className="text-[12px] font-semibold md:text-[14px]">Coming soon</span>
        )}
      </div>
      {live && item.badge && (
        <span className="absolute right-2 top-2.5 md:right-4 md:top-5">
          <Badge>{item.badge}</Badge>
        </span>
      )}

      <div className={cn('pointer-events-none absolute inset-x-2 bottom-2 z-[2] rounded-inner px-3 py-2.5 md:inset-x-4 md:bottom-4 md:p-5', CARD_GLASS)}>
        <p className="text-[16px] font-semibold leading-tight tracking-[-0.03em] md:text-[22px]">{item.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-soft md:mt-1 md:whitespace-normal md:text-[14px]">{item.what}</p>
        <div className="hidden items-center justify-between gap-3 border-t border-ink/10 pt-3 md:mt-3 md:flex">
          <span className="text-[13px] text-ink-soft">{FORM_LABEL[item.form]}</span>
          <Link
            href={`/start?product=${item.live ?? item.slug}`}
            className="pointer-events-auto shrink-0 whitespace-nowrap rounded-full bg-butter px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-butter-deep"
          >
            Start assessment
          </Link>
        </div>
      </div>

      <Link href={hrefFor(item, live)} aria-label={item.name} className="absolute inset-0 z-[1]" />
    </div>
  );
}

/** Category tile: photo, name, count. Pass a listed category (useListedCategories / listedCategories) so the count is what's shown. */
export function CategoryTile({ c, className, sizes = '(max-width: 768px) 50vw, 20vw' }: { c: Category; className?: string; sizes?: string }) {
  return (
    <Link href={`/treatments/${c.slug}`} className={cn('group relative block overflow-hidden rounded-shell bg-milk', className)}>
      <Image src={c.image} alt="" fill sizes={sizes} className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.05]" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
      <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-white md:inset-x-5 md:bottom-5">
        <span>
          <span className="block text-[20px] font-semibold leading-none tracking-[-0.04em] md:text-[28px]">{c.name}</span>
          <span className="mt-1.5 block text-[12px] text-white/85 md:text-[13px]">{countLabel(c.items.length)}</span>
        </span>
      </span>
    </Link>
  );
}
