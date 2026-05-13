'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useScrollProgress } from '@/lib/useScrollProgress';
import { cn } from '@/lib/utils';

/** Triangle function — returns 0 when |x|>=1, 1 at x=0, linear in between */
function triangle(x: number) {
  return Math.max(0, 1 - Math.abs(x));
}

/**
 * POUCH "Drinkable IV Formula" pattern, adapted for peptide science.
 *
 * Sticky scroll section:
 *   - Left rail: numbered indicators (001, 002, 003, 004) that activate
 *     as the corresponding text block scrolls into view.
 *   - Center-left: editorial title, then a tall column of scroll-revealed
 *     text blocks (eyebrow + body for each chapter of the story).
 *   - Right: a floating product visual that stays pinned while the text
 *     scrolls past, with a deep gradient backdrop and ambient water-drop
 *     style particles (CSS dots so we don't need imagery yet).
 *
 * Pure CSS + a vanilla scroll-progress hook — no framer-motion entrance bug.
 */

const CHAPTERS = [
  {
    eyebrow: 'PEPTIDE THERAPY, MEDICAL-GRADE',
    body: 'Every Eternal Longevity protocol mirrors the rigor of clinical compounding — small chains of amino acids, prescribed by a licensed physician, compounded for purity and potency.',
    image: '/images/9.jpg', // gel / molecule
  },
  {
    eyebrow: 'QUALITY INGREDIENTS, BETTER ABSORPTION',
    body: 'We work only with 503A pharmacies that test for purity, sterility, and bioavailability before shipping. Every batch is documented. Every vial is traceable.',
    image: '/images/11.jpg', // pipette / beaker
  },
  {
    eyebrow: 'TARGETED PROTOCOLS',
    body: 'Stacks are physician-selected against your goals — recovery, performance, body composition, or longevity. No one-size-fits-all kits. No guesswork.',
    image: '/images/13.jpg', // bubble field
  },
  {
    eyebrow: 'ADVANCED CARE, MADE SIMPLE',
    body: 'Manage everything through your member portal — refills, dosing instructions, check-ins with your clinical liaison. Concierge in your pocket.',
    image: '/images/14.jpg', // single sphere
  },
];

export function Science() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref);

  // Determine active chapter from scroll progress
  // We use 20%-90% of the section's scroll as the active reveal band.
  const REVEAL_START = 0.18;
  const REVEAL_END = 0.92;
  const span = (REVEAL_END - REVEAL_START) / CHAPTERS.length;
  const activeIndex = Math.min(
    CHAPTERS.length - 1,
    Math.max(0, Math.floor((progress - REVEAL_START) / span))
  );

  return (
    <section
      ref={ref}
      className="relative bg-background"
      style={{ minHeight: '300vh' }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Dark forest gradient with gold radial warmth from the right —
            matches FeatureSpotlight's WHAT'S INSIDE treatment so the two
            scroll-pinned sections read as a deliberate visual pair. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 75% 50%, rgba(213,168,80,0.10) 0%, rgba(0, 0, 0,0) 50%), #000000',
          }}
        />

        {/* Faint ambient drops on the dark bg */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <span className="absolute top-[14%] right-[20%] h-3 w-3 rounded-full bg-accent/20 blur-[1px]" />
          <span className="absolute top-[26%] right-[44%] h-2 w-2 rounded-full bg-foreground/10 blur-[1px]" />
          <span className="absolute top-[58%] right-[16%] h-4 w-4 rounded-full bg-accent/15 blur-[2px]" />
          <span className="absolute top-[72%] right-[36%] h-2 w-2 rounded-full bg-foreground/8 blur-[1px]" />
          <span className="absolute top-[44%] right-[8%] h-2.5 w-2.5 rounded-full bg-accent/25 blur-[1px]" />
        </div>

        <div className="relative h-full px-6 md:px-12">
          {/* Top section label — pushed below fixed header */}
          <div className="absolute top-24 left-6 md:left-12 text-[11px] tracking-widest text-foreground/50">
            03 / THE SCIENCE
          </div>

          <div className="mx-auto h-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-28 md:pt-32">
            {/* Left rail — numbered indicators */}
            <div className="md:col-span-1 flex md:flex-col items-start md:items-start justify-start gap-3 md:gap-6 md:pt-32">
              {CHAPTERS.map((_, i) => (
                <div key={i} className="flex items-center md:flex-col md:items-start gap-2">
                  <span
                    className={cn(
                      'text-[11px] tracking-widest transition-colors duration-500',
                      i === activeIndex
                        ? 'text-accent'
                        : i < activeIndex
                          ? 'text-foreground/50'
                          : 'text-foreground/25'
                    )}
                  >
                    {String(i + 1).padStart(3, '0')}
                  </span>
                  <span
                    className={cn(
                      'block transition-all duration-500 ease-out-expo',
                      i === activeIndex
                        ? 'h-px w-12 md:h-12 md:w-px bg-accent'
                        : 'h-px w-6 md:h-6 md:w-px bg-foreground/20'
                    )}
                  />
                </div>
              ))}
            </div>

            {/* Center — title + active chapter */}
            <div className="md:col-span-6">
              <h2
                className="font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2.5rem, 5.5vw, 5rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                Compounded
                <br />
                Peptide Therapy<sup className="text-accent text-[0.4em] align-super">™</sup>
              </h2>

              {/* Active chapter — opacity driven directly by scroll progress
                  so transitions can't be restart-spammed mid-flight. */}
              <div className="relative mt-12 max-w-md min-h-[12rem]">
                {CHAPTERS.map((c, i) => {
                  const center = REVEAL_START + (i + 0.5) * span;
                  // Triangle: opacity ramps from 0 at edge of band, peaks 1 at center.
                  const opacity = triangle((progress - center) / (span * 0.45));
                  const isActive = i === activeIndex;
                  return (
                    <div
                      key={i}
                      style={{
                        opacity,
                        transform: `translateY(${(1 - opacity) * 12}px)`,
                      }}
                      className={cn(
                        'absolute inset-0',
                        !isActive && 'pointer-events-none'
                      )}
                    >
                      <p className="mb-4 text-[11px] tracking-widest text-accent">
                        {c.eyebrow}
                      </p>
                      <p className="text-base md:text-lg text-foreground/75 leading-relaxed">
                        {c.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right — floating product visual that crossfades through the chapter images */}
            <div className="md:col-span-5 flex justify-center md:justify-end items-center">
              <div
                className="relative aspect-[3/5] w-[60vw] max-w-[360px] rounded-3xl overflow-hidden border border-line"
                style={{
                  boxShadow: '0 60px 120px -20px rgba(213,168,80,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
                  transform: 'rotate(-6deg)',
                }}
              >
                {CHAPTERS.map((c, i) => {
                  const center = REVEAL_START + (i + 0.5) * span;
                  const opacity = triangle((progress - center) / (span * 0.45));
                  return (
                    <div
                      key={i}
                      className="absolute inset-0"
                      style={{ opacity }}
                    >
                      <Image
                        src={c.image}
                        alt={c.eyebrow}
                        fill
                        sizes="(max-width: 1024px) 90vw, 640px"
                        className="object-cover"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70"
                      />
                    </div>
                  );
                })}
                {/* Overlay label — explicit white because the card is image-backed */}
                <div className="relative flex h-full flex-col items-center justify-between p-6 pointer-events-none">
                  <span className="text-[10px] tracking-widest text-white/80">
                    ETERNAL LONGEVITY
                  </span>
                  <div className="text-center" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
                    <div className="mb-1 text-[10px] tracking-widest text-accent">
                      THE SCIENCE
                    </div>
                    <div
                      className="font-bold tracking-tight text-white"
                      style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}
                    >
                      COMPOUNDED
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
