'use client';

import { useRef, type ReactNode } from 'react';
import Image from 'next/image';
import { useScrollProgress } from '@/lib/useScrollProgress';

/**
 * IntroPanel. Juvenx-style rounded-top dark card that rises up over the
 * sticky Hero as the user scrolls down. The Hero is position:sticky and the
 * IntroPanel sits at z-10 in normal flow, so natural page scroll makes the
 * card physically slide up over the pinned hero.
 *
 * Three stacked layers inside one rounded card:
 *   1. Thin TEAL/ACCENT bar (rounded top corners) with a short tagline.
 *   2. Black marquee strip. Scrolling row of AS FEATURED IN press brand
 *      names separated by small accent dots, edge-faded both sides.
 *   3. The existing Saki-style brand-statement paragraph that reveals
 *      word-by-word as the user scrolls, with inline image pills appearing
 *      at their thresholds.
 */

// --- 1) Press wordmarks for the marquee -------------------------------
interface PressItem {
  name: string;
  el: ReactNode;
}

const PRESS: PressItem[] = [
  {
    name: 'Vanity Fair',
    el: (
      <span
        className="font-serif font-bold text-2xl md:text-[28px] leading-none"
        style={{ letterSpacing: '0.08em' }}
      >
        VANITY FAIR
      </span>
    ),
  },
  {
    name: 'Marie Claire',
    el: (
      <span className="font-serif italic text-2xl md:text-[28px] tracking-tight lowercase leading-none">
        <span className="font-light">marie</span>{' '}
        <span className="font-bold">claire</span>
      </span>
    ),
  },
  {
    name: 'Essence',
    el: (
      <span
        className="text-2xl md:text-[28px] leading-none"
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
      <span className="font-black italic text-3xl md:text-4xl leading-none tracking-tight">
        yahoo<span className="text-accent">!</span>
      </span>
    ),
  },
  {
    name: 'Medium',
    el: (
      <span className="flex items-center gap-2 text-2xl md:text-[26px] font-serif leading-none">
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full bg-white/90"
        />
        <span className="font-semibold tracking-tight">Medium</span>
      </span>
    ),
  },
  {
    name: 'Shape',
    el: (
      <span
        className="inline-flex items-center rounded-sm bg-accent text-black px-3 py-1.5 font-black text-base md:text-lg leading-none"
        style={{ letterSpacing: '0.05em' }}
      >
        SHAPE
      </span>
    ),
  },
  {
    name: 'InStyle',
    el: (
      <span className="text-2xl md:text-[28px] italic tracking-tight leading-none">
        <span className="font-black">In</span>
        <span className="font-light">Style</span>
      </span>
    ),
  },
  {
    name: 'Vogue',
    el: (
      <span
        className="font-serif font-bold text-2xl md:text-3xl leading-none"
        style={{ letterSpacing: '0.18em' }}
      >
        VOGUE
      </span>
    ),
  },
  {
    name: 'Golf Digest',
    el: (
      <span className="flex items-baseline gap-1.5 font-serif leading-none">
        <span className="text-3xl md:text-[32px] italic font-semibold">Golf</span>
        <span className="text-xl md:text-2xl font-bold tracking-tight">Digest</span>
      </span>
    ),
  },
  {
    name: 'GQ',
    el: (
      <span
        className="font-black text-4xl md:text-5xl leading-none"
        style={{ letterSpacing: '-0.06em' }}
      >
        <span>G</span>
        <span className="text-accent">Q</span>
      </span>
    ),
  },
];

// --- 2) Brand-statement paragraph tokens ------------------------------
type Tok =
  | { type: 'word'; text: string }
  | { type: 'img'; src: string; alt: string };

const TOKENS: Tok[] = [
  { type: 'word', text: 'At' },
  { type: 'word', text: 'Eternal' },
  { type: 'word', text: 'Longevity,' },
  { type: 'word', text: 'we' },
  { type: 'word', text: 'pair' },
  { type: 'word', text: 'longevity' },
  { type: 'word', text: 'medicine' },
  { type: 'img', src: '/images/11.jpg', alt: 'longevity medicine' },
  { type: 'word', text: 'with' },
  { type: 'word', text: 'rigorous' },
  { type: 'word', text: 'medical' },
  { type: 'word', text: 'oversight' },
  { type: 'word', text: 'to' },
  { type: 'word', text: 'deliver' },
  { type: 'img', src: '/images/7.jpg', alt: 'physician-reviewed performance' },
  { type: 'word', text: 'protocols' },
  { type: 'word', text: 'that' },
  { type: 'word', text: 'perform,' },
  { type: 'word', text: 'recover,' },
  { type: 'word', text: 'and' },
  { type: 'img', src: '/images/1.jpg', alt: 'longevity lifestyle' },
  { type: 'word', text: 'extend' },
  { type: 'word', text: 'your' },
  { type: 'word', text: 'healthspan.' },
];

export function IntroPanel() {
  const sectionRef = useRef<HTMLElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(statementRef);

  // Word-by-word reveal range for the brand statement
  const REVEAL_START = 0.15;
  const REVEAL_END = 0.8;
  const span = REVEAL_END - REVEAL_START;

  // Duplicate press wordmarks for seamless marquee loop
  const loop = [...PRESS, ...PRESS];

  return (
    <section
      ref={sectionRef}
      className="relative z-10 bg-transparent"
    >
      <div className="w-full">
        <div className="relative overflow-hidden rounded-t-[1.75rem] md:rounded-t-[2.25rem] bg-black shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.4)]">
          {/* ===== 1) Teal accent bar (rounded top, full-bleed) ===== */}
          <div className="w-full bg-accent text-black text-center py-3 md:py-3.5 px-6">
            <p className="text-[11px] md:text-[13px] tracking-[0.18em] font-semibold">
              TRUSTED BY THE WORLD&apos;S LEADING PUBLICATIONS
            </p>
          </div>

          {/* ===== 2) Marquee strip. Press names with accent dot separators ===== */}
          <div className="relative overflow-hidden border-b border-white/10 py-6 md:py-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 md:w-32 bg-gradient-to-r from-black to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 md:w-32 bg-gradient-to-l from-black to-transparent"
            />

            <div className="flex anim-marquee whitespace-nowrap will-change-transform items-center text-white/85">
              {loop.map((p, i) => (
                <div
                  key={`${p.name}-${i}`}
                  className="flex flex-shrink-0 items-center"
                >
                  <span
                    className="px-10 md:px-16 select-none flex items-center"
                    title={p.name}
                  >
                    {p.el}
                  </span>
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full bg-accent"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ===== 3) Brand-statement paragraph (word-by-word reveal) ===== */}
          <div ref={statementRef} className="relative px-6 py-20 md:px-12 md:py-28">
            {/* Eyebrow pill */}
            <div className="mb-10 flex justify-center">
              <span className="pill glass text-[11px] tracking-widest text-white/70 px-5">
                ETERNAL LONGEVITY
              </span>
            </div>

            <p
              className="mx-auto max-w-5xl text-center font-semibold tracking-tight leading-[1.15] text-white"
              style={{
                fontSize: 'clamp(1.65rem, 4vw, 4rem)',
                letterSpacing: '-0.01em',
              }}
            >
              {TOKENS.map((tok, i) => {
                const t = i / (TOKENS.length - 1);
                const threshold = REVEAL_START + t * span;
                const local = (progress - threshold) / 0.05;
                const opacity = Math.min(1, Math.max(0.12, local));

                if (tok.type === 'word') {
                  return (
                    <span
                      key={i}
                      style={{
                        opacity,
                        transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)',
                      }}
                      className="inline"
                    >
                      {tok.text}{' '}
                    </span>
                  );
                }

                // inline image pill
                const imgOpacity = Math.min(1, Math.max(0, local));
                const scale = 0.7 + 0.3 * imgOpacity;
                return (
                  <span
                    key={i}
                    className="relative inline-flex align-middle mx-2 md:mx-3 overflow-hidden rounded-full bg-white/10"
                    style={{
                      width: 'clamp(3rem, 7vw, 7rem)',
                      height: 'clamp(2rem, 4.5vw, 4.5rem)',
                      opacity: imgOpacity,
                      transform: `scale(${scale})`,
                      transition:
                        'opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
                    }}
                  >
                    <Image
                      src={tok.src}
                      alt={tok.alt}
                      fill
                      sizes="(max-width: 768px) 8vw, 7rem"
                      className="object-cover"
                    />
                  </span>
                );
              })}
            </p>

            {/* CTA pill */}
            <div className="mt-14 flex justify-center">
              <a
                href="/about"
                className="pill bg-accent text-black px-8 py-3 text-base font-semibold hover:bg-accent-soft transition-colors"
              >
                Meet Eternal Longevity
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
