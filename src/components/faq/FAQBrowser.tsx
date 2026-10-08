'use client';

import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { FAQ_CATEGORIES, type FAQ, type FAQCategory } from '@/lib/faq';
import { CARD_GLASS } from '@/components/lineup/Lineup';
import { cn } from '@/lib/utils';

type Filter = 'All' | FAQCategory;
const FILTERS: Filter[] = ['All', ...FAQ_CATEGORIES];

/**
 * Full FAQ: the homepage accordion at full length. Heading (passed in) and
 * category pills on the left, frosted rows on the right (the page puts an
 * Aura behind this for the glass to catch).
 */
export function FAQBrowser({ faqs, children }: { faqs: FAQ[]; children: ReactNode }) {
  const [filter, setFilter] = useState<Filter>('All');
  const reduce = useReducedMotion();
  const items = filter === 'All' ? faqs : faqs.filter((f) => f.category === filter);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
      <div className="lg:sticky lg:top-44 lg:self-start">
        {children}

        <div
          className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:-mx-10 md:px-10 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filter questions by category"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-4 text-[14px] font-medium transition-colors',
                filter === f ? 'bg-ink text-white' : 'bg-milk text-ink hover:bg-milk-deep'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        key={filter}
        className="space-y-2"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {items.map((f) => (
          <details key={f.q} name="faq" className={cn('group rounded-inner px-5 md:px-6', CARD_GLASS)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-semibold tracking-[-0.015em] text-ink md:text-[18px] [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white transition-colors group-open:bg-butter">
                <Plus className="h-4 w-4 transition-transform duration-300 group-open:rotate-45" strokeWidth={2} aria-hidden />
              </span>
            </summary>
            <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
          </details>
        ))}
      </motion.div>
    </div>
  );
}
