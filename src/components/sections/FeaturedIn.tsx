import type { ReactNode } from 'react';
import { FadeIn } from '@/components/ui/FadeIn';

/**
 * "As Featured In" press strip — continuous horizontally-scrolling marquee
 * of media-outlet wordmarks. Each outlet is styled in monochrome cream so
 * the strip reads as a single premium credit row on the dark forest bg.
 *
 * Hovering the marquee pauses it (see globals.css `.anim-marquee:hover`).
 * Edge fade-gradients soften the start/end of each loop.
 *
 * Swap each `el` with a real SVG logo when those assets are licensed.
 */

interface PressItem {
  name: string;
  el: ReactNode;
}

const PRESS: PressItem[] = [
  {
    name: 'Golf Digest',
    el: (
      <span className="flex items-baseline gap-1.5 font-serif">
        <span className="text-2xl italic font-semibold">Golf</span>
        <span className="text-xl font-bold tracking-tight">Digest</span>
      </span>
    ),
  },
  {
    name: 'GQ',
    el: (
      <span
        className="font-black text-4xl leading-none"
        style={{ letterSpacing: '-0.06em' }}
      >
        <span>G</span>
        <span className="text-accent">Q</span>
      </span>
    ),
  },
  {
    name: 'Vanity Fair',
    el: (
      <span
        className="font-serif font-bold text-xl"
        style={{ letterSpacing: '0.08em' }}
      >
        VANITY FAIR
      </span>
    ),
  },
  {
    name: 'Marie Claire',
    el: (
      <span className="font-serif italic text-xl tracking-tight lowercase">
        <span className="font-light">marie</span>{' '}
        <span className="font-bold">claire</span>
      </span>
    ),
  },
  {
    name: 'Essence',
    el: (
      <span
        className="text-xl"
        style={{ letterSpacing: '-0.02em' }}
      >
        <span className="font-bold italic">ess</span>
        <span className="font-light italic">ence</span>
      </span>
    ),
  },
  {
    name: 'Yahoo',
    el: (
      <span className="font-black italic text-3xl leading-none tracking-tight">
        yahoo<span className="text-accent">!</span>
      </span>
    ),
  },
  {
    name: 'Medium',
    el: (
      <span className="flex items-center gap-2 text-xl font-serif">
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full bg-foreground"
        />
        <span className="font-semibold tracking-tight">Medium</span>
      </span>
    ),
  },
  {
    name: 'Shape',
    el: (
      <span
        className="inline-flex items-center rounded-sm bg-accent text-background px-3 py-1 font-black text-base"
        style={{ letterSpacing: '0.05em' }}
      >
        SHAPE
      </span>
    ),
  },
  {
    name: 'InStyle',
    el: (
      <span className="text-xl italic tracking-tight">
        <span className="font-black">In</span>
        <span className="font-light">Style</span>
      </span>
    ),
  },
  {
    name: 'Vogue',
    el: (
      <span
        className="font-serif font-bold text-2xl"
        style={{ letterSpacing: '0.18em' }}
      >
        VOGUE
      </span>
    ),
  },
];

export function FeaturedIn() {
  // Render the list twice for a seamless loop. The CSS keyframe translates
  // by -50% (= one full set), so the second copy lines up exactly where the
  // first started.
  const loop = [...PRESS, ...PRESS];

  return (
    <section className="relative bg-background border-y border-line py-14 md:py-16 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <FadeIn>
          <p className="mb-10 text-center text-[11px] tracking-widest text-foreground/55">
            AS FEATURED IN
          </p>
        </FadeIn>
      </div>

      <FadeIn delay={120}>
        <div className="relative">
          {/* Edge fade gradients so the loop dissolves at both sides */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 md:w-32 bg-gradient-to-r from-background to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 md:w-32 bg-gradient-to-l from-background to-transparent"
          />

          {/* Marquee track */}
          <div className="flex anim-marquee whitespace-nowrap will-change-transform text-foreground/85">
            {loop.map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                className="flex h-16 flex-shrink-0 items-center justify-center px-8 md:px-12 lg:px-14 select-none"
                title={p.name}
              >
                {p.el}
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
