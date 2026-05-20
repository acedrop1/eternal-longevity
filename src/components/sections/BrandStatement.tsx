'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useScrollProgress } from '@/lib/useScrollProgress';

/**
 * Saki "Inspired by Tradition / Perfected by Technology" pattern.
 * A long brand statement where the text starts dim and lights up word-by-word
 * as you scroll, with inline image pills appearing between specific words.
 *
 * The reveal is driven by useScrollProgress (vanilla scroll listener).
 */

// Tokens that make up the sentence. "img" tokens are inline image pills
// that pop in at their scroll progress threshold.
type Tok = { type: 'word'; text: string } | { type: 'img'; src: string; alt: string };
const TOKENS: Tok[] = [
  { type: 'word', text: 'At' },
  { type: 'word', text: 'Eternal' },
  { type: 'word', text: 'Longevity,' },
  { type: 'word', text: 'we' },
  { type: 'word', text: 'pair' },
  { type: 'word', text: 'longevity' },
  { type: 'word', text: 'medicine' },
  // pipette / liquid science visual
  { type: 'img', src: '/images/11.jpg', alt: 'longevity medicine' },
  { type: 'word', text: 'with' },
  { type: 'word', text: 'rigorous' },
  { type: 'word', text: 'medical' },
  { type: 'word', text: 'oversight' },
  { type: 'word', text: 'to' },
  { type: 'word', text: 'deliver' },
  // athletic recovery
  { type: 'img', src: '/images/7.jpg', alt: 'physician-reviewed performance' },
  { type: 'word', text: 'protocols' },
  { type: 'word', text: 'that' },
  { type: 'word', text: 'perform,' },
  { type: 'word', text: 'recover,' },
  { type: 'word', text: 'and' },
  // lifestyle / longevity
  { type: 'img', src: '/images/1.jpg', alt: 'longevity lifestyle' },
  { type: 'word', text: 'extend' },
  { type: 'word', text: 'your' },
  { type: 'word', text: 'healthspan.' },
];

export function BrandStatement() {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(ref);

  // Reveal happens between 15%–80% of the section's scroll progress.
  // Each token gets its own threshold inside that range.
  const REVEAL_START = 0.15;
  const REVEAL_END = 0.8;
  const span = REVEAL_END - REVEAL_START;

  return (
    <section
      ref={ref}
      className="relative bg-background px-6 pt-32 pb-40 md:pt-40 md:pb-48"
    >
      <div className="mx-auto max-w-6xl">
        {/* Eyebrow pill */}
        <div className="mb-12 flex justify-center">
          <span className="pill glass text-[11px] tracking-widest text-foreground/70 px-5">
            ETERNAL LONGEVITY
          </span>
        </div>

        {/* Big paragraph with progressive reveal */}
        <p
          className="mx-auto max-w-5xl text-center font-semibold tracking-tight leading-[1.15] text-foreground"
          style={{
            fontSize: 'clamp(1.75rem, 4.5vw, 4.5rem)',
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
                  style={{ opacity, transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)' }}
                  className="inline"
                >
                  {tok.text}{' '}
                </span>
              );
            }

            // inline image pill (Saki pattern. Small rounded image between words)
            const imgOpacity = Math.min(1, Math.max(0, local));
            const scale = 0.7 + 0.3 * imgOpacity;
            return (
              <span
                key={i}
                className="relative inline-flex align-middle mx-2 md:mx-3 overflow-hidden rounded-full bg-surface-raised"
                style={{
                  width: 'clamp(3rem, 7vw, 7rem)',
                  height: 'clamp(2rem, 4.5vw, 4.5rem)',
                  opacity: imgOpacity,
                  transform: `scale(${scale})`,
                  transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)',
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

        {/* CTA pill (Saki "Meet Saki" pattern) */}
        <div className="mt-16 flex justify-center">
          <a
            href="/about"
            className="pill bg-foreground text-background px-8 py-3 text-base font-semibold hover:bg-accent hover:text-background transition-colors"
          >
            Meet Eternal Longevity
          </a>
        </div>
      </div>
    </section>
  );
}
