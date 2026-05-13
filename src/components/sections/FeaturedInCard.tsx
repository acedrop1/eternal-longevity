'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * Juvenx-style "rounded-top card" intro panel.
 *
 * Layout (top → bottom):
 *   1. Thin TEAL accent bar (rounded top corners) — like a tagline strip
 *      that visually pins the panel to the page.
 *   2. Black marquee strip: scrolling row of press brand names separated by
 *      small teal dots (continuous loop, edge-faded both sides).
 *   3. Two-column body — text on the left, image on the right.
 *      Stacks vertically on mobile.
 *
 * Reveal:
 *   IntersectionObserver at threshold 0.2 fires once (unobserves after).
 *   Animates opacity 0 → 1 and translateY(60px) → translateY(0)
 *   over 0.8s with a smooth ease-out curve.
 *   Honors prefers-reduced-motion.
 */

const PRESS_NAMES = [
  'VANITY FAIR',
  'MARIE CLAIRE',
  'ESSENCE',
  'YAHOO!',
  'MEDIUM',
  'SHAPE',
  'INSTYLE',
  'VOGUE',
  'GOLF DIGEST',
  'GQ',
];

export function FeaturedInCard() {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Duplicate for seamless marquee loop (CSS keyframe translates -50%).
  const loop = [...PRESS_NAMES, ...PRESS_NAMES];

  return (
    <section
      ref={sectionRef}
      className="relative bg-background px-0 md:px-6 py-8 md:py-12"
    >
      <div
        className="mx-auto max-w-7xl"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(60px)',
          transition:
            'opacity 800ms cubic-bezier(0.16, 1, 0.3, 1), transform 800ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'opacity, transform',
        }}
      >
        <div className="relative overflow-hidden rounded-t-[1.5rem] md:rounded-[2rem] bg-black">
          {/* ===== 1) Teal accent bar (rounded top) ===== */}
          <div className="w-full bg-accent text-black text-center py-2.5 md:py-3 px-6">
            <p className="text-[11px] md:text-xs tracking-[0.18em] font-semibold">
              AS FEATURED IN — TRUSTED BY THE WORLD&apos;S LEADING PUBLICATIONS
            </p>
          </div>

          {/* ===== 2) Marquee strip — press names with teal dot separators ===== */}
          <div className="relative overflow-hidden border-b border-white/10 py-5 md:py-6">
            {/* Edge fade gradients */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 md:w-24 bg-gradient-to-r from-black to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 md:w-24 bg-gradient-to-l from-black to-transparent"
            />

            <div className="flex anim-marquee whitespace-nowrap will-change-transform items-center">
              {loop.map((name, i) => (
                <div
                  key={`${name}-${i}`}
                  className="flex flex-shrink-0 items-center"
                >
                  <span
                    className="px-8 md:px-12 text-sm md:text-base tracking-[0.2em] text-white/55 font-medium select-none"
                    title={name}
                  >
                    {name}
                  </span>
                  <span
                    aria-hidden
                    className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ===== 3) Two-column body ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left — text */}
            <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16">
              <p className="mb-5 text-[11px] tracking-widest text-accent">
                01 / WHY ETERNAL LONGEVITY
              </p>
              <h2
                className="font-semibold tracking-tight text-white mb-6"
                style={{
                  fontSize: 'clamp(1.85rem, 3.5vw, 3.25rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                The science of regeneration,
                <br />
                <span className="text-accent">now physician-supervised.</span>
              </h2>
              <p className="text-white/65 leading-relaxed max-w-md mb-8">
                Premium compounded peptides with verified purity. Third-party
                tested, clinician-reviewed, and shipped from a licensed 503A
                pharmacy.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/start"
                  className="pill bg-accent text-black font-semibold text-base px-7 py-3 hover:bg-accent-soft transition-colors"
                >
                  Start Your Assessment →
                </a>
                <a
                  href="/science"
                  className="pill border border-white/20 text-white/85 font-medium text-base px-6 py-3 hover:bg-white/5 transition-colors"
                >
                  See the science
                </a>
              </div>
            </div>

            {/* Right — image */}
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[440px] overflow-hidden">
              <Image
                src="/images/11.jpg"
                alt="Peptide vials being compounded in a licensed pharmacy"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={false}
              />
              {/* Bottom gradient for legibility */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 via-transparent to-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
