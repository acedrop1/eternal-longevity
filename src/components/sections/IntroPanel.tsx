'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useScrollProgress } from '@/lib/useScrollProgress';

/**
 * IntroPanel. Rounded-top black card that rises over the sticky Hero as the
 * page scrolls (the Hero is sticky, this card is z-10 in normal flow). It
 * holds the brand statement, revealed word by word, with inline image pills.
 * The statement is set in the condensed display face; the three ideas it
 * rests on (medicine, testing, healthspan) reveal in gold.
 */

// --- 2) Brand-statement paragraph tokens ------------------------------
type Tok =
  | { type: 'word'; text: string; accent?: true }
  | { type: 'img'; src: string; alt: string };

const TOKENS: Tok[] = [
  { type: 'word', text: 'At' },
  { type: 'word', text: 'Eternal' },
  { type: 'word', text: 'Longevity,' },
  { type: 'word', text: 'we' },
  { type: 'word', text: 'pair' },
  { type: 'word', text: 'longevity', accent: true },
  { type: 'word', text: 'medicine', accent: true },
  { type: 'img', src: '/images/11.jpg', alt: 'longevity medicine' },
  { type: 'word', text: 'with' },
  { type: 'word', text: 'rigorous', accent: true },
  { type: 'word', text: 'purity', accent: true },
  { type: 'word', text: 'testing', accent: true },
  { type: 'word', text: 'to' },
  { type: 'word', text: 'deliver' },
  { type: 'img', src: '/images/7.jpg', alt: 'peptide compound detail' },
  { type: 'word', text: 'protocols' },
  { type: 'word', text: 'that' },
  { type: 'word', text: 'perform,' },
  { type: 'word', text: 'recover,' },
  { type: 'word', text: 'and' },
  { type: 'img', src: '/images/1.jpg', alt: 'compound in solution' },
  { type: 'word', text: 'extend' },
  { type: 'word', text: 'your' },
  { type: 'word', text: 'healthspan.', accent: true },
];

export function IntroPanel() {
  const sectionRef = useRef<HTMLElement>(null);
  const statementRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(statementRef);

  // Word-by-word reveal range for the brand statement
  const REVEAL_START = 0.15;
  const REVEAL_END = 0.8;
  const span = REVEAL_END - REVEAL_START;

  return (
    <section
      ref={sectionRef}
      className="relative z-10 bg-transparent"
    >
      <div className="w-full">
        <div className="relative overflow-hidden rounded-t-[1.75rem] md:rounded-t-[2.25rem] bg-black shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.4)]">
          {/* Brand statement, revealed word by word as the card rises */}
          <div ref={statementRef} className="relative px-5 py-9 md:px-12 md:py-14">
            <p
              className="mx-auto max-w-6xl text-center font-display font-normal text-white [text-wrap:balance]"
              style={{
                fontSize: 'clamp(1.7rem, 3.8vw + 0.4rem, 4.25rem)',
                fontStretch: '75%',
                lineHeight: 1.08,
                letterSpacing: '-0.005em',
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
                      className={tok.accent ? 'inline text-accent' : 'inline'}
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
                      width: 'clamp(2.6rem, 5vw, 5.25rem)',
                      height: 'clamp(1.7rem, 3.2vw, 3.3rem)',
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

            {/* CTA: gold pill in the buttons' typewriter face, arrow nudges on hover */}
            <div className="mt-6 flex justify-center md:mt-9">
              <Link
                href="/about"
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-mono text-[14px] text-black transition-colors hover:bg-white"
              >
                Meet Eternal Longevity
                <ArrowRight
                  aria-hidden
                  className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
                  strokeWidth={1.75}
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
