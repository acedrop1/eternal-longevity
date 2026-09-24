'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useCatalog } from '@/components/catalog/CatalogProvider';
import { cn } from '@/lib/utils';

/**
 * How it works, intake to doorstep. Four steps on the left, a small live
 * "screen" on the right that acts each one out. Auto-advances while on
 * screen (a progress line fills under the active step); clicking a step jumps
 * to it and restarts the clock. Reduced motion: no autoplay, no slide.
 *
 * Every line here is something the site already states: the ~3 minute
 * profile, one physician reading every intake, no charge unless approved,
 * a licensed 503A pharmacy, free shipping, 3-5 days.
 */
const STEP_MS = 5000;
const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    title: 'Tell us about you',
    body: 'A three-minute online profile: your goals, your history, your current medications.',
  },
  {
    title: 'A physician reviews it',
    body: 'Dr. Elder reads every intake himself. Nothing is charged unless he approves.',
  },
  {
    title: 'Compounded for you',
    body: 'Your prescription goes to a licensed 503A pharmacy and is made to order.',
  },
  {
    title: 'At your door',
    body: 'Shipped free, cold-chain, in typically three to five days. Refills from your portal.',
  },
];

export function Process() {
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState(0); // bumps on click so the timer restarts
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const playing = inView && !reduce;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(t);
  }, [active, cycle, playing]);

  const pick = (i: number) => {
    setActive(i);
    setCycle((c) => c + 1);
  };

  return (
    <section ref={ref} className="bg-black px-5 py-16 text-white md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 md:mb-14 md:flex-row md:items-end md:justify-between">
          <h2
            className="font-display font-normal [text-wrap:balance]"
            style={{ fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 }}
          >
            From intake to your door.
          </h2>
          <Link
            href="/start"
            className="self-start rounded-full bg-white px-4 py-2.5 font-mono text-[13px] text-black transition-colors hover:bg-white/85 md:self-auto"
          >
            Start your assessment
          </Link>
        </div>

        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
          {/* Steps */}
          <ol className="order-2 flex flex-col lg:order-1">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.title} className="border-t border-white/15 last:border-b">
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    aria-current={on ? 'step' : undefined}
                    className="group relative flex w-full items-start gap-4 py-5 text-left md:py-6"
                  >
                    <span className={cn('pt-1 font-mono text-[13px] tabular-nums transition-colors', on ? 'text-accent' : 'text-white/40')}>
                      0{i + 1}
                    </span>
                    <span className="flex-1">
                      <span
                        className={cn('block font-display transition-colors', on ? 'text-white' : 'text-white/45 group-hover:text-white/75')}
                        style={{ fontSize: 'clamp(1.35rem, 0.8vw + 1.1rem, 1.9rem)', fontStretch: '75%', lineHeight: 1.1 }}
                      >
                        {s.title}
                      </span>
                      {/* grid-rows 0fr → 1fr: height animates without measuring */}
                      <span
                        className={cn(
                          'grid transition-[grid-template-rows,opacity] duration-500 ease-out-expo',
                          on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        )}
                      >
                        <span className="overflow-hidden">
                          <span className="block max-w-md pt-2 text-[15px] leading-relaxed text-white/70">{s.body}</span>
                        </span>
                      </span>
                    </span>
                    {/* Progress line */}
                    {on && (
                      <span aria-hidden className="absolute inset-x-0 -top-px h-px overflow-hidden">
                        <motion.span
                          key={`${active}-${cycle}-${playing}`}
                          className="block h-full origin-left bg-accent"
                          initial={{ scaleX: playing ? 0 : 1 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: playing ? STEP_MS / 1000 : 0, ease: 'linear' }}
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Stage */}
          <div
            className="relative order-1 aspect-[10/11] overflow-hidden sm:aspect-[4/3] rounded-[4px] bg-[#141414] ring-1 ring-white/10 lg:order-2 lg:aspect-auto lg:min-h-[440px]"
            aria-live="polite"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(213,168,80,0.16),transparent)]"
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                className="absolute inset-0 grid place-items-center p-6 md:p-10"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {active === 0 && <IntakeScene />}
                {active === 1 && <ReviewScene />}
                {active === 2 && <PharmacyScene />}
                {active === 3 && <ShipScene />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- scenes ---------- */

const panel = 'w-full max-w-sm rounded-[4px] bg-white p-5 text-black shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] md:p-6';

function IntakeScene() {
  const chips = ['Energy', 'Recovery', 'Sleep', 'Longevity'];
  return (
    <div className={panel}>
      <div className="mb-4 flex items-center justify-between font-mono text-[11px] text-black/55">
        <span>Your profile</span>
        <span>~3 min</span>
      </div>
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-black/10">
        <motion.div
          className="h-full origin-left rounded-full bg-black"
          initial={{ scaleX: 0.15 }}
          animate={{ scaleX: 0.72 }}
          transition={{ duration: 2.4, ease: EASE, delay: 0.2 }}
        />
      </div>
      <p className="font-display text-xl" style={{ fontStretch: '75%' }}>
        What are you focused on?
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((c, i) => (
          <motion.span
            key={c}
            className="rounded-full px-3 py-1.5 text-[13px] ring-1 ring-black/15"
            initial={{ backgroundColor: 'rgba(0,0,0,0)', color: '#000' }}
            animate={i === 1 || i === 3 ? { backgroundColor: '#000', color: '#fff' } : {}}
            transition={{ delay: 0.6 + i * 0.35, duration: 0.25 }}
          >
            {c}
          </motion.span>
        ))}
      </div>
      <div className="mt-5 rounded-[2px] bg-black px-4 py-3 text-center font-mono text-[13px] text-white">Continue</div>
    </div>
  );
}

function ReviewScene() {
  return (
    <div className={cn(panel, 'relative')}>
      <div className="flex items-center gap-3">
        <span className="relative h-11 w-11 overflow-hidden rounded-full bg-neutral-200">
          <Image src="/dr-elder.webp" alt="" fill sizes="44px" className="object-cover object-top grayscale" />
        </span>
        <div>
          <p className="text-[15px] font-semibold">Dr. Bader Elder, DO</p>
          <p className="font-mono text-[11px] text-black/55">Prescriber of record · NJ, NY, PA, MI</p>
        </div>
      </div>
      <div className="mt-5 space-y-2.5">
        {['Goals and history', 'Medications and allergies', 'Contraindications'].map((row, i) => (
          <motion.div
            key={row}
            className="flex items-center justify-between rounded-[2px] bg-black/[0.04] px-3 py-2.5 text-[14px]"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.3, duration: 0.35, ease: EASE }}
          >
            {row}
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </motion.div>
        ))}
      </div>
      <motion.div
        className="mt-5 flex items-center justify-between rounded-[2px] bg-accent px-4 py-3 text-black"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.35, duration: 0.4, ease: EASE }}
      >
        <span className="font-mono text-[13px]">Approved</span>
        <span className="text-[12px] text-black/70">Charged only now</span>
      </motion.div>
    </div>
  );
}

function PharmacyScene() {
  const p = useCatalog().products[0];
  if (!p) return null;
  return (
    <div className="flex w-full max-w-md items-center gap-5">
      <motion.div
        className="relative aspect-[3/4] w-[44%] shrink-0 overflow-hidden rounded-[4px] bg-neutral-800"
        initial={{ scale: 0.94 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      >
        <Image src={p.image} alt="" fill sizes="200px" className="object-cover" />
      </motion.div>
      <div className="flex-1 space-y-3">
        {[
          ['Pharmacy', 'Licensed 503A'],
          ['Made', 'To order, for you'],
          ['Label', 'Rx only'],
        ].map(([k, v], i) => (
          <motion.div
            key={k}
            className="border-b border-white/15 pb-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.25, duration: 0.4, ease: EASE }}
          >
            <p className="font-mono text-[11px] text-white/50">{k}</p>
            <p className="mt-1 text-[16px] text-white">{v}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ShipScene() {
  const stops = ['Packed cold', 'In transit', 'Delivered'];
  return (
    <div className={panel}>
      <div className="mb-5 flex items-center justify-between">
        <p className="font-display text-xl" style={{ fontStretch: '75%' }}>
          Your order
        </p>
        <span className="rounded-full bg-black/[0.06] px-2.5 py-1 font-mono text-[11px]">Free shipping</span>
      </div>
      <div className="relative pl-6">
        <span aria-hidden className="absolute bottom-2 left-[7px] top-2 w-px bg-black/15" />
        <motion.span
          aria-hidden
          className="absolute left-[7px] top-2 w-px origin-top bg-black"
          style={{ height: 'calc(100% - 1rem)' }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.8, ease: EASE, delay: 0.2 }}
        />
        {stops.map((s, i) => (
          <motion.div
            key={s}
            className="relative pb-5 last:pb-0"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.6, duration: 0.3 }}
          >
            <span className="absolute -left-6 top-1 grid h-[15px] w-[15px] place-items-center rounded-full bg-black">
              <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
            </span>
            <p className="text-[15px] font-medium">{s}</p>
            <p className="font-mono text-[11px] text-black/50">{['Insulated box', 'Typically 3–5 days', 'Refill from your portal'][i]}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
