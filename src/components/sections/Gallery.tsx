'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useScrollProgress } from '@/lib/useScrollProgress';
import { FadeIn } from '@/components/ui/FadeIn';

/**
 * Editorial gallery strip. Uses the remaining science/abstract images
 * to add a moment of brightness between the dark sections.
 *
 * Four photos, staggered heights, with a slow parallax drift driven by
 * scroll progress so the strip feels alive.
 */
const TILES = [
  { src: '/images/5.jpg', caption: 'PURITY', align: 'translate-y-0' },
  { src: '/images/12.jpg', caption: 'PRECISION', align: 'translate-y-8' },
  { src: '/images/6.jpg', caption: 'POTENCY', align: '-translate-y-4' },
  { src: '/images/10.jpg', caption: 'COMPOSITION', align: 'translate-y-6' },
];

export function Gallery() {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref);
  // Slow parallax: shift the strip 6% as the user scrolls through the section
  const shift = (progress - 0.5) * 60; // -30 → +30 px range

  return (
    <section ref={ref} className="relative bg-background px-6 py-32 md:py-40 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
            02b / IN THE LAB
          </p>
        </FadeIn>

        <FadeIn delay={120}>
          <h2
            className="mb-3 max-w-3xl text-4xl md:text-6xl font-semibold tracking-tight text-foreground"
            style={{ letterSpacing: '-0.02em', lineHeight: 1 }}
          >
            Made with intention.
            <br />
            <span className="text-accent">Tested with rigor.</span>
          </h2>
        </FadeIn>

        <FadeIn delay={220}>
          <p className="mb-16 max-w-xl text-foreground/55 leading-relaxed">
            Every vial passes through a chain of custody you can see: licensed
            compounding, lab verification, then your door.
          </p>
        </FadeIn>

        {/* Image strip with parallax drift */}
        <FadeIn delay={300}>
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5"
            style={{ transform: `translateX(${shift}px)`, transition: 'transform 0.05s linear' }}
          >
            {TILES.map((t) => (
              <div
                key={t.src}
                className={`relative aspect-[3/4] overflow-hidden rounded-2xl border border-line group transition-transform duration-700 ease-out-expo hover:-translate-y-1 ${t.align}`}
              >
                <Image
                  src={t.src}
                  alt={t.caption}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-[1.6s] ease-out-expo group-hover:scale-105"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
                />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[10px] tracking-widest text-white">
                    {t.caption}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
