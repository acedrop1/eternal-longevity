'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useCatalog } from '@/components/catalog/CatalogProvider';
import { cn } from '@/lib/utils';

/**
 * Price chart (David's "a lot of protein, not a lot of calories" pattern).
 * A toggle flips every bar between the monthly plan and the quarterly plan's
 * per-month price; the monthly height stays behind as a ghost so the saving
 * reads as a drop. Numbers come straight from the catalog, nothing invented.
 */
const PLANS = [
  { key: 'monthly', label: 'Monthly plan' },
  { key: 'quarterly', label: 'Quarterly plan' },
] as const;

type Plan = (typeof PLANS)[number]['key'];

const POINTS = [
  { title: 'Charged only on approval', body: 'Your card is charged after the physician signs, not when you apply.' },
  { title: 'Shipping included', body: 'Free, cold-chain shipping on every cycle. No add-ons at checkout.' },
  { title: 'Pause or cancel anytime', body: 'Change your refill date, pause, or cancel before the next billing date.' },
];

export function PriceChart() {
  const { showcase } = useCatalog();
  const ITEMS = showcase.filter((p) => p.price);
  // Headroom above the tallest bar for its price label.
  const MAX = Math.max(1, ...ITEMS.map((p) => p.price!.was)) * 1.12;
  const [plan, setPlan] = useState<Plan>('monthly');
  const reduce = useReducedMotion();

  return (
    <section className="bg-[#F2F2F0] px-5 py-16 text-black md:px-8 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-16">
        <div>
          <h2
            className="font-display font-normal [text-wrap:balance]"
            style={{ fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 }}
          >
            Pharmacy-grade, priced in plain sight.
          </h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-black/70">
            What each protocol costs per month, before you start.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex rounded-full bg-black/[0.07] p-1" role="group" aria-label="Plan">
            {PLANS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={plan === p.key}
                onClick={() => setPlan(p.key)}
                className="relative rounded-full px-4 py-2 font-mono text-[13px] transition-colors"
              >
                {plan === p.key && (
                  <motion.span
                    layoutId="plan-pill"
                    className="absolute inset-0 rounded-full bg-black"
                    transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span className={cn('relative', plan === p.key ? 'text-white' : 'text-black/70')}>{p.label}</span>
              </button>
            ))}
          </div>

          {/* Chart */}
          <figure className="mt-10">
            <div className="flex h-[260px] items-end gap-3 border-b border-black/20 md:h-[320px] md:gap-6">
              {ITEMS.map((item) => {
                const { was, now } = item.price!;
                const value = plan === 'monthly' ? was : now;
                return (
                  <div key={item.id} className="relative flex h-full flex-1 items-end justify-center">
                    {/* Ghost of the monthly price */}
                    <div
                      aria-hidden
                      className="absolute bottom-0 w-full max-w-[88px] rounded-t-[2px] border border-dashed border-black/25"
                      style={{ height: `${(was / MAX) * 100}%` }}
                    />
                    <motion.div
                      className="relative w-full max-w-[88px] rounded-t-[2px] bg-black"
                      initial={false}
                      animate={{ height: `${(value / MAX) * 100}%` }}
                      transition={{ duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <span className="absolute inset-x-0 -top-7 text-center text-[15px] font-medium tabular-nums md:text-[17px]">
                        ${value}
                      </span>
                      {plan === 'quarterly' && was > now && (
                        <span className="absolute inset-x-0 top-3 text-center font-mono text-[11px] text-accent">
                          −${was - now}
                        </span>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Product under each bar */}
            <div className="mt-4 flex gap-3 md:gap-6">
              {ITEMS.map((item) => (
                <div key={item.id} className="flex flex-1 flex-col items-center gap-2 text-center">
                  <span className="relative aspect-square w-full max-w-[64px] overflow-hidden rounded-[2px] bg-neutral-300">
                    <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                  <span className="text-[13px] leading-tight md:text-[14px]">{item.name}</span>
                </div>
              ))}
            </div>

            <figcaption className="mt-8 max-w-xl text-[12px] leading-relaxed text-black/55">
              Price per month, from our current catalog. The quarterly plan is billed every three months. Prescription
              required: if the physician doesn&rsquo;t prescribe, you aren&rsquo;t charged. Residents of NJ, NY, PA and MI, 18+.
            </figcaption>
          </figure>
        </div>

        {/* Points */}
        <ul className="flex flex-col gap-8 self-center lg:gap-10">
          {POINTS.map((p) => (
            <li key={p.title} className="border-t border-black/15 pt-5">
              <p className="font-display text-[1.5rem] leading-tight" style={{ fontStretch: '75%' }}>
                {p.title}
              </p>
              <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-black/70">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
