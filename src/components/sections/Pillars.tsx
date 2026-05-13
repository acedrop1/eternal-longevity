'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FadeIn } from '@/components/ui/FadeIn';
import { cn } from '@/lib/utils';

/**
 * Premium reimagining: large expandable rows, not little cards.
 * Each pillar:
 *   - tall numbered row with title + short kicker
 *   - subtle accent line that grows on hover
 *   - expands inline on hover/focus to reveal full body copy
 *   - active row gets a gold left-bar and a soft gold halo
 *
 * Feels closer to Eight Sleep's "deeper recovery, on any bed" feature lists
 * than to the small card grid we started with.
 */

const PILLARS = [
  {
    title: 'Medical-Grade',
    kicker: 'Compounded by licensed 503A pharmacies.',
    body: 'Every protocol is compounded in an FDA-registered facility, tested for purity, potency, and sterility before it ships. Vials are batch-documented and traceable.',
    image: '/images/11.jpg', // pipette / science
  },
  {
    title: 'Physician-Reviewed',
    kicker: 'Reviewed and signed by a licensed physician.',
    body: 'No algorithms, no shortcuts. Your clinical team drafts a personalized protocol, your physician reviews your intake and signs the prescription before any compound is shipped.',
    image: '/images/7.jpg', // athlete / performance
  },
  {
    title: 'Concierge Care',
    kicker: 'Direct access to your clinical liaison.',
    body: 'Schedule onboarding calls, message your team in the portal, request dose adjustments. Cycle check-ins are built into every protocol so nothing falls through the cracks.',
    image: '/images/1.jpg', // desert yoga / lifestyle
  },
];

export function Pillars() {
  const [hoverIdx, setHoverIdx] = useState<number | null>(0);

  return (
    <section className="relative bg-background px-6 py-32 md:py-40">
      {/* Atmospheric top spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-[40vh] w-[60vw] -translate-x-1/2 rounded-full bg-accent/[0.04] blur-[100px]"
      />

      <div className="relative mx-auto max-w-6xl">
        <FadeIn>
          <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
            01 / WHAT WE DO
          </p>
        </FadeIn>

        <FadeIn delay={120}>
          <h2
            className="mb-4 max-w-3xl text-4xl md:text-6xl font-semibold tracking-tight text-foreground"
            style={{ letterSpacing: '-0.02em', lineHeight: 1 }}
          >
            A protocole. Not a trend.
          </h2>
        </FadeIn>

        <FadeIn delay={220}>
          <p className="mb-16 max-w-xl text-foreground/55 leading-relaxed">
            Physician-supervised peptide therapy, engineered around three
            non-negotiables.
          </p>
        </FadeIn>

        {/* Pillar rows */}
        <div className="border-t border-line">
          {PILLARS.map((p, i) => {
            const isActive = hoverIdx === i;
            return (
              <FadeIn key={p.title} delay={300 + i * 100}>
                <div
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onFocus={() => setHoverIdx(i)}
                  onBlur={() => setHoverIdx(null)}
                  onClick={() => setHoverIdx(isActive ? null : i)}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'group relative border-b border-line transition-all duration-700 ease-out-expo cursor-pointer',
                    isActive ? 'py-12 md:py-16' : 'py-8 md:py-10'
                  )}
                >
                  {/* Left accent bar */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-0 top-0 bottom-0 w-px bg-accent transition-all duration-700 ease-out-expo origin-top',
                      isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
                    )}
                  />

                  {/* Soft halo when active */}
                  <span
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-[120%] w-[40%] rounded-full bg-accent/0 blur-3xl transition-all duration-700',
                      isActive && 'bg-accent/[0.05]'
                    )}
                  />

                  <div className="relative grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_2fr] gap-4 md:gap-12 items-start pl-4 md:pl-8">
                    {/* Number */}
                    <span
                      className={cn(
                        'text-[11px] tracking-widest pt-1 transition-colors duration-500',
                        isActive ? 'text-accent' : 'text-foreground/40'
                      )}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Title + kicker (+ body on mobile under it) */}
                    <div>
                      <h3
                        className="text-2xl md:text-4xl font-semibold tracking-tight text-foreground"
                        style={{ letterSpacing: '-0.02em', lineHeight: 1.05 }}
                      >
                        {p.title}
                      </h3>
                      <p
                        className={cn(
                          'mt-2 text-sm md:text-base text-foreground/55 transition-opacity duration-500',
                          isActive ? 'opacity-100' : 'opacity-80'
                        )}
                      >
                        {p.kicker}
                      </p>

                      {/* Mobile-only expanded body (lives under title-kicker) */}
                      <div
                        className="md:hidden overflow-hidden transition-all duration-700 ease-out-expo"
                        style={{
                          maxHeight: isActive ? '400px' : '0px',
                          opacity: isActive ? 1 : 0,
                          marginTop: isActive ? '1rem' : '0',
                        }}
                      >
                        <p className="text-sm text-foreground/70 leading-relaxed">
                          {p.body}
                        </p>
                        <span className="mt-3 inline-flex items-center gap-2 text-[10px] tracking-widest text-accent">
                          LEARN MORE
                          <span aria-hidden>→</span>
                        </span>
                      </div>
                    </div>

                    {/* Desktop-only expanded body + image (right column) */}
                    <div
                      className="hidden md:flex gap-6 overflow-hidden transition-all duration-700 ease-out-expo items-start"
                      style={{
                        maxHeight: isActive ? '400px' : '0px',
                        opacity: isActive ? 1 : 0,
                      }}
                    >
                      <div className="flex-1">
                        <p className="text-foreground/70 leading-relaxed">
                          {p.body}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-2 text-[11px] tracking-widest text-accent">
                          LEARN MORE
                          <span aria-hidden>→</span>
                        </span>
                      </div>
                      {/* Image preview that fades in alongside the body */}
                      <div className="relative w-40 lg:w-56 aspect-[4/5] flex-shrink-0 overflow-hidden rounded-2xl border border-line">
                        <Image
                          src={p.image}
                          alt=""
                          fill
                          sizes="(max-width: 1024px) 10rem, 14rem"
                          className="object-cover"
                        />
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
