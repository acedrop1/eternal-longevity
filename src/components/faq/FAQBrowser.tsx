'use client';

import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { FAQS, FAQ_CATEGORIES, withPrices, type FAQCategory } from '@/lib/faq';
import { useCatalog } from '@/components/catalog/CatalogProvider';
import { cn } from '@/lib/utils';

type Filter = 'All' | FAQCategory;
const FILTERS: Filter[] = ['All', ...FAQ_CATEGORIES];

/**
 * Full FAQ: the homepage accordion at full length. Heading (passed in) and a
 * category filter on the left, hairline rows on the right. The filter is
 * PriceChart's segmented toggle, laid out vertically on desktop so all six
 * options fit the narrow column.
 */
export function FAQBrowser({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<Filter>('All');
  const reduce = useReducedMotion();
  const faqs = withPrices(FAQS, useCatalog().products);
  const items = filter === 'All' ? faqs : faqs.filter((f) => f.category === filter);

  return (
    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
      <div className="lg:sticky lg:top-[166px] lg:self-start">
        {children}

        <div className="-mx-5 mt-8 overflow-x-auto px-5 [scrollbar-width:none] md:-mx-8 md:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
          <div
            className="inline-flex rounded-full bg-black/[0.07] p-1 lg:flex-col lg:rounded-[1.25rem]"
            role="group"
            aria-label="Filter questions by category"
          >
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className="relative whitespace-nowrap rounded-full px-4 py-2 text-left font-mono text-[13px] transition-colors"
              >
                {filter === f && (
                  <motion.span
                    layoutId="faq-filter-pill"
                    className="absolute inset-0 rounded-full bg-black"
                    transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span className={cn('relative', filter === f ? 'text-white' : 'text-black/70 hover:text-black')}>
                  {f}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        key={filter}
        className="border-t border-black/15"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {items.map((f) => (
          <details key={f.q} name="faq" className="group border-b border-black/15">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[17px] md:text-[19px] [&::-webkit-details-marker]:hidden">
              {f.q}
              <Plus className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-45" strokeWidth={1.75} />
            </summary>
            <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-black/70">{f.a}</p>
          </details>
        ))}
      </motion.div>
    </div>
  );
}
