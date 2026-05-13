'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { FAQS, FAQ_CATEGORIES, type FAQCategory } from '@/lib/faq';

type Filter = 'All' | FAQCategory;

export function FAQAccordion() {
  const [filter, setFilter] = useState<Filter>('All');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const filtered = useMemo(
    () => (filter === 'All' ? FAQS : FAQS.filter((f) => f.category === filter)),
    [filter]
  );

  // Reset open question when filter changes
  function changeFilter(next: Filter) {
    setFilter(next);
    setOpenIdx(0);
  }

  return (
    <div>
      {/* Category pill row */}
      <div className="mb-10 flex flex-wrap gap-2">
        <FilterPill active={filter === 'All'} onClick={() => changeFilter('All')}>
          All
        </FilterPill>
        {FAQ_CATEGORIES.map((cat) => (
          <FilterPill
            key={cat}
            active={filter === cat}
            onClick={() => changeFilter(cat)}
          >
            {cat}
          </FilterPill>
        ))}
      </div>

      {/* Accordion list */}
      <div className="rounded-3xl border border-line bg-surface overflow-hidden">
        {filtered.map((item, i) => {
          const open = openIdx === i;
          const isLast = i === filtered.length - 1;
          return (
            <div
              key={`${item.category}-${item.q}`}
              className={cn('group', !isLast && 'border-b border-line')}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-start justify-between gap-6 px-6 py-6 text-left md:px-8 md:py-7 transition-colors hover:bg-foreground/[0.02]"
              >
                <span className="flex flex-col gap-1.5">
                  <span className="text-[10px] tracking-widest text-accent">
                    {item.category.toUpperCase()}
                  </span>
                  <span className="text-base md:text-lg font-medium tracking-tight text-foreground">
                    {item.q}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'mt-1.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border transition-all duration-500 ease-out-expo',
                    open
                      ? 'border-accent bg-accent text-background rotate-45'
                      : 'border-line text-foreground/60 group-hover:border-foreground/30'
                  )}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
              </button>
              <div
                className={cn(
                  'grid transition-all duration-500 ease-out-expo',
                  open
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-6 md:px-8 md:pb-8 max-w-3xl">
                    <p className="text-foreground/70 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-foreground/55">
          No questions in this category yet.
        </p>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 text-xs tracking-wider font-medium transition-all border',
        active
          ? 'bg-accent text-background border-accent'
          : 'bg-surface text-foreground/70 border-line hover:border-foreground/30 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
