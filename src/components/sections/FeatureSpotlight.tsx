'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useScrollProgress } from '@/lib/useScrollProgress';
import { FadeIn } from '@/components/ui/FadeIn';
import { cn } from '@/lib/utils';

/**
 * Scroll-pinned feature spotlight, Eight Sleep style.
 *
 * The section is 3x viewport tall. As you scroll through it, three features
 * crossfade through the viewport. The active feature has a giant number, the
 * headline lights up, the body copy is visible, and a visual plate rotates
 * in on the right. Opacity is driven directly from scroll progress so we
 * don't hit the CSS-transition-restart bug we saw in Science.
 */

const FEATURES = [
  {
    title: 'Recovery',
    body: 'Accelerate soft tissue repair and reduce inflammation. Train harder, recover faster, prevent injury. Backed by structured cycles and clinical-grade compounds.',
    label: '01',
    image: '/images/8.jpg', // core / athletic
  },
  {
    title: 'Performance',
    body: 'Enhance growth hormone signaling and improve body composition. Designed for cycle-based training and metabolic optimization, with clear dosing and ongoing check-ins.',
    label: '02',
    image: '/images/7.jpg', // stretching / strength
  },
  {
    title: 'Longevity',
    body: 'Cellular support, metabolic regulation, cognitive clarity. Engineered for the long arc. Protocols you can sustain across years, not weeks.',
    label: '03',
    image: '/images/1.jpg', // desert yoga / lifestyle
  },
];

function triangle(x: number) {
  return Math.max(0, 1 - Math.abs(x));
}

export function FeatureSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref);

  const REVEAL_START = 0.18;
  const REVEAL_END = 0.92;
  const span = (REVEAL_END - REVEAL_START) / FEATURES.length;

  return (
    <section ref={ref} className="relative bg-background" style={{ minHeight: '250vh' }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Dark forest gradient with gold radial warmth from the left */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 25% 50%, rgba(213,168,80,0.10) 0%, rgba(0, 0, 0,0) 50%), #000000',
          }}
        />

        <div className="relative h-full px-6 md:px-12">
          {/* Top section label */}
          <FadeIn>
            <div className="absolute top-24 left-6 md:left-12 text-[11px] tracking-widest text-foreground/50">
              05 / WHAT&apos;S INSIDE
            </div>
          </FadeIn>

          <div className="mx-auto h-full max-w-7xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-28 md:pt-0">
            {/* Left. Number + title */}
            <div className="md:col-span-6 relative min-h-[60vh] flex flex-col justify-center">
              {FEATURES.map((f, i) => {
                const center = REVEAL_START + (i + 0.5) * span;
                const opacity = triangle((progress - center) / (span * 0.45));
                return (
                  <div
                    key={f.label}
                    className="absolute inset-0 flex flex-col justify-center"
                    style={{
                      opacity,
                      transform: `translateY(${(1 - opacity) * 16}px)`,
                    }}
                  >
                    <div
                      className="font-bold text-accent/15 leading-none mb-4"
                      style={{ fontSize: 'clamp(6rem, 18vw, 14rem)', letterSpacing: '-0.04em' }}
                    >
                      {f.label}
                    </div>
                    <h3
                      className="font-semibold tracking-tight text-foreground"
                      style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.02em', lineHeight: 0.95 }}
                    >
                      {f.title}
                    </h3>
                    <p className="mt-6 max-w-md text-foreground/70 leading-relaxed">
                      {f.body}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Right. Visual plates that crossfade */}
            <div className="md:col-span-6 flex justify-center md:justify-end items-center">
              <div className="relative aspect-[4/5] w-[70vw] max-w-[420px]">
                {FEATURES.map((f, i) => {
                  const center = REVEAL_START + (i + 0.5) * span;
                  const opacity = triangle((progress - center) / (span * 0.45));
                  return (
                    <div
                      key={f.label}
                      className="absolute inset-0 rounded-3xl border border-line overflow-hidden"
                      style={{
                        opacity,
                        boxShadow: '0 60px 120px -20px rgba(213,168,80,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
                        transform: `rotate(${-3 + i * 1.5}deg) scale(${0.94 + opacity * 0.06})`,
                        transition: 'transform 600ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                    >
                      <Image
                        src={f.image}
                        alt={f.title}
                        fill
                        sizes="(max-width: 1024px) 80vw, 480px"
                        className="object-cover"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/70"
                      />
                      <div className="relative flex h-full flex-col items-center justify-between p-8">
                        <span className="text-[10px] tracking-widest text-white/80">
                          ETERNAL LONGEVITY
                        </span>
                        <div />
                        <div className="text-center">
                          <div className="mb-1 text-[10px] tracking-widest text-accent">
                            {f.label} · FEATURED
                          </div>
                          <div
                            className="font-bold tracking-tight text-white"
                            style={{
                              fontSize: '1.5rem',
                              letterSpacing: '-0.02em',
                              textShadow: '0 2px 20px rgba(0,0,0,0.6)',
                            }}
                          >
                            {f.title.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom progress bar */}
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2 px-6">
            {FEATURES.map((f, i) => {
              const center = REVEAL_START + (i + 0.5) * span;
              const opacity = triangle((progress - center) / (span * 0.45));
              const isActive = opacity > 0.4;
              return (
                <span
                  key={f.label}
                  className={cn(
                    'h-px transition-all duration-700 ease-out-expo',
                    isActive ? 'w-16 bg-accent' : 'w-8 bg-foreground/20'
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
