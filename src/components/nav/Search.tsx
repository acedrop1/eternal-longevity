'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search as SearchIcon, X } from 'lucide-react';
import { LineupRow, useListedCategories } from '@/components/lineup/Lineup';
import { ALL_ITEMS, CATEGORIES, FORM_LABEL } from '@/lib/lineup';
import { cn } from '@/lib/utils';

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Words people search by that aren't in the name or description. */
const KEYWORDS: Record<string, string> = {
  'sildenafil-tadalafil': 'erectile dysfunction tadalafil',
  sildenafil: 'erectile dysfunction',
  'pt-141': 'bremelanotide desire',
  'hrt-cream': 'estrogen estradiol progesterone hormone replacement',
  enclomiphene: 'low t',
  'mic-b12': 'lipo vitamin',
  'fin-min-tret': 'finasteride minoxidil hair loss',
  tretinoin: 'retinoid wrinkles',
  'glow-cream': 'tretinoin wrinkles',
  'even-tone-cream': 'dark spots hyperpigmentation',
  brightening: 'hyperpigmentation',
  'hq-free': 'dark spots hyperpigmentation',
  spironolactone: 'hair loss',
  finasteride: 'hair loss',
  'oral-minoxidil': 'hair loss',
};

// Name, what it's for, form, keywords and every category it's listed in.
const INDEX = ALL_ITEMS.map(({ item, category }) => ({
  item,
  tint: category.tint,
  words: words(
    [item.name, item.what, FORM_LABEL[item.form], KEYWORDS[item.slug] ?? '', ...CATEGORIES.filter((c) => c.items.includes(item)).map((c) => c.name)].join(' ')
  ),
}));

/** Every query word must start some word of the product (so "fin min" and "nad+" both work). Only listed slugs are searched. */
export function searchLineup(q: string, listed: Set<string>) {
  const qs = words(q);
  return qs.length ? INDEX.filter((x) => listed.has(x.item.slug) && qs.every((w) => x.words.some((h) => h.startsWith(w)))) : [];
}

/** Header search: icon opens a modal with instant results (⌘K / Ctrl+K too). */
export function Search({ onPhoto }: { onPhoto: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState('');
  const categories = useListedCategories().filter((c) => c.items.length);
  const listed = useMemo(() => new Set(categories.flatMap((c) => c.items.map((i) => i.slug))), [categories]);
  const results = useMemo(() => searchLineup(q, listed), [q, listed]);
  const close = () => ref.current?.close();
  const pathname = usePathname();

  // Close once the route changes. Closing inside the link's own click cancelled
  // the navigation (the dialog tore down mid-click), so links just navigate.
  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!ref.current?.open) ref.current?.showModal();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Search treatments"
        onClick={() => ref.current?.showModal()}
        className={cn(
          'grid h-10 w-10 place-items-center rounded-full transition-colors',
          onPhoto ? 'bg-white/20 hover:bg-white/30' : 'bg-white/70 ring-1 ring-black/5 hover:bg-white'
        )}
      >
        <SearchIcon className="h-[17px] w-[17px]" strokeWidth={1.8} aria-hidden />
      </button>

      <dialog
        ref={ref}
        aria-label="Search treatments"
        onClose={() => setQ('')}
        onClick={(e) => e.target === ref.current && close()}
        className="mx-auto mb-auto mt-3 w-[calc(100%-24px)] max-w-[760px] rounded-shell bg-white/90 p-3 text-ink shadow-[0_30px_80px_-30px_rgba(17,17,17,0.45)] ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150 backdrop:bg-ink/25 backdrop:backdrop-blur-sm md:mt-4 md:p-4"
      >
        <div className="flex items-center gap-2 rounded-inner bg-milk pl-4 pr-1.5 focus-within:ring-1 focus-within:ring-ink/20">
          <SearchIcon className="h-[18px] w-[18px] shrink-0 text-ink/50" strokeWidth={1.8} aria-hidden />
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search treatments…"
            aria-label="Search treatments"
            className="h-12 min-w-0 flex-1 bg-transparent text-[16px] placeholder:text-ink/40 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="button" onClick={close} aria-label="Close search" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-white">
            <X className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <div className="mt-3 max-h-[min(60vh,560px)] overflow-y-auto" aria-live="polite">
          {!q.trim() ? (
            <>
              <p className="px-1 pb-2 text-[13px] font-medium text-ink/55">Browse by category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Link key={c.slug} href={`/treatments/${c.slug}`} onClick={() => pathname === `/treatments/${c.slug}` && close()} className="rounded-full bg-milk px-4 py-2 text-[14px] font-semibold transition-colors hover:bg-butter">
                    {c.name}
                  </Link>
                ))}
              </div>
            </>
          ) : results.length ? (
            <>
              <p className="px-1 pb-2 text-[13px] font-medium text-ink/55">
                {results.length} {results.length === 1 ? 'treatment' : 'treatments'}
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {results.map(({ item, tint }) => (
                  <LineupRow key={item.slug} item={item} tint={tint} />
                ))}
              </div>
            </>
          ) : (
            <p className="px-1 py-8 text-center text-[14px] text-ink-soft">
              No treatments match &ldquo;{q.trim()}&rdquo;.{' '}
              <Link href="/shop" className="font-semibold text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
                Browse all
              </Link>
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
