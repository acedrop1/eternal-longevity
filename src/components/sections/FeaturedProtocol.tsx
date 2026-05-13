'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FadeIn } from '@/components/ui/FadeIn';
import { PROTOCOLS } from '@/lib/protocols';
import { cn } from '@/lib/utils';

/**
 * Featured Protocols — tabbed product spotlight.
 *
 * Left column: editorial packaging card (gradient swatch + image overlay
 * + brand monogram + name) — the section's signature visual moment.
 * Right column: rich info — tagline, peptide chips, "best for" callout,
 * starting price, primary CTA into the PDP.
 *
 * Tab pills above the spread switch the active protocol. The "Most popular"
 * chip flags Recover as the safe default for first-time members.
 */
export function FeaturedProtocol() {
  const [activeId, setActiveId] = useState<string>(PROTOCOLS[0]?.id ?? 'recover');
  const active = PROTOCOLS.find((p) => p.id === activeId) ?? PROTOCOLS[0];

  if (!active) return null;
  const perMonth = Math.round(active.pricing.annual / 12);

  return (
    <section className="relative overflow-hidden bg-background px-6 py-20 md:py-28">
      {/* Soft halo behind the spread */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.06] blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* === HEADER === */}
        <FadeIn>
          <div className="mb-4 flex justify-center">
            <span className="pill glass text-[11px] tracking-widest text-foreground/70 px-5">
              FEATURED PROTOCOLS
            </span>
          </div>
        </FadeIn>
        <FadeIn delay={120}>
          <h2
            className="text-center font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(2.25rem, 5vw, 4.5rem)',
              letterSpacing: '-0.02em',
              lineHeight: 1.02,
            }}
          >
            Built for outcomes.
            <span className="block text-foreground/40">Engineered for safety.</span>
          </h2>
        </FadeIn>
        <FadeIn delay={200}>
          <p className="mx-auto mt-5 mb-10 md:mb-14 max-w-2xl text-center text-foreground/65 leading-relaxed">
            Four physician-supervised peptide stacks, each engineered for a
            specific goal. Pick your starting point — your physician finalizes
            the protocol after a clinical review.
          </p>
        </FadeIn>

        {/* === TAB PILLS === */}
        <FadeIn delay={280}>
          <div className="mb-12 md:mb-16 flex flex-wrap justify-center gap-2">
            {PROTOCOLS.map((p) => {
              const isActive = p.id === activeId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={cn(
                    'group relative rounded-full border px-5 py-2.5 text-sm tracking-wider font-medium transition-all',
                    isActive
                      ? 'border-accent bg-accent text-background'
                      : 'border-line bg-surface text-foreground/75 hover:text-foreground hover:border-foreground/30'
                  )}
                >
                  {p.name}
                  {p.id === 'recover' && !isActive && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center rounded-full bg-accent/95 text-black px-1.5 py-0.5 text-[8px] tracking-widest font-semibold">
                      POPULAR
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </FadeIn>

        {/* === ACTIVE PROTOCOL — 2-column spread === */}
        <div className="grid gap-8 md:gap-12 lg:gap-16 md:grid-cols-[1fr_1.15fr] md:items-stretch">
          {/* LEFT — packaging card. Re-keying on active.id forces a clean
              cross-fade as the user switches tabs. */}
          <div key={`card-${active.id}`} className="anim-fade-up">
            <div className="relative mx-auto max-w-md md:max-w-none">
              {/* Gold halo behind the card */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -m-8 rounded-[3rem] bg-accent/[0.10] blur-[60px]"
              />
              <div
                className="relative aspect-[3/4] overflow-hidden rounded-[2.25rem] md:rounded-[2.75rem] border border-line"
                style={{
                  background: `linear-gradient(180deg, ${active.swatch} 0%, var(--bg, #000000) 100%)`,
                  boxShadow:
                    '0 60px 120px -20px rgba(213,168,80,0.30), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <Image
                  src={active.image}
                  alt={active.name}
                  fill
                  sizes="(max-width: 768px) 90vw, 560px"
                  className="object-cover opacity-40"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85"
                />
                <div className="relative flex h-full flex-col items-center justify-between p-6 md:p-8 text-center">
                  <span className="text-[10px] tracking-widest text-white/70">
                    ETERNAL LONGEVITY
                  </span>
                  <div style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
                    <div className="mb-3 text-[10px] tracking-widest text-accent">
                      {active.tagline.toUpperCase()}
                    </div>
                    <div
                      className="font-bold tracking-tight text-white"
                      style={{
                        fontSize: 'clamp(2.5rem, 5vw, 4.25rem)',
                        letterSpacing: '-0.02em',
                        lineHeight: 0.95,
                      }}
                    >
                      {active.name}
                    </div>
                  </div>
                  <div className="text-[10px] tracking-widest text-white/55">
                    {active.stack.slice(0, 3).join(' · ')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — info column */}
          <div
            key={`info-${active.id}`}
            className="anim-fade-up flex flex-col justify-center"
            style={{ animationDelay: '120ms' }}
          >
            <p className="mb-3 text-[11px] tracking-widest text-accent">
              {active.category} · {active.cycleLength.toUpperCase()}
            </p>
            <h3
              className="mb-4 font-semibold tracking-tight text-foreground"
              style={{
                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}
            >
              {active.name} Stack
            </h3>
            <p className="mb-6 text-foreground/75 leading-relaxed">
              {active.longDescription}
            </p>

            {/* Peptide chips */}
            <div className="mb-6">
              <p className="mb-2.5 text-[10px] tracking-widest text-foreground/55">
                PEPTIDES IN THIS STACK
              </p>
              <div className="flex flex-wrap gap-2">
                {active.stack.map((peptide) => (
                  <span
                    key={peptide}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs tracking-wider text-foreground/85"
                  >
                    {peptide}
                  </span>
                ))}
              </div>
            </div>

            {/* Best for */}
            <div className="mb-8 rounded-2xl border border-line bg-surface p-4 md:p-5">
              <p className="mb-1.5 text-[10px] tracking-widest text-accent">
                BEST FOR
              </p>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {active.bestFor}
              </p>
            </div>

            {/* Price + CTA */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] tracking-widest text-foreground/45">
                  STARTING AT
                </p>
                <p className="text-3xl font-semibold text-foreground tracking-tight">
                  ${perMonth}
                  <span className="text-base text-foreground/55 font-normal">
                    /mo
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-foreground/55">
                  Billed annually · cancel between cycles
                </p>
              </div>
              <Link
                href={`/protocols/${active.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent text-black font-semibold px-7 py-3.5 text-base hover:bg-accent-soft transition-colors"
              >
                Explore {active.name}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* === FOOTER STRIP — small links to other protocols === */}
        <FadeIn delay={500}>
          <div className="mt-16 md:mt-20 flex flex-wrap items-center justify-center gap-3 border-t border-line pt-10">
            <span className="text-[11px] tracking-widest text-foreground/45">
              SEE ALL PROTOCOLS
            </span>
            {PROTOCOLS.map((p) => (
              <Link
                key={p.id}
                href={`/protocols/${p.id}`}
                className="text-[11px] tracking-widest text-foreground/70 hover:text-accent transition-colors"
              >
                {p.name.toUpperCase()}
              </Link>
            )).reduce<React.ReactNode[]>((acc, item, i) => {
              if (i > 0) {
                acc.push(
                  <span
                    key={`sep-${i}`}
                    aria-hidden
                    className="text-foreground/25 text-[11px]"
                  >
                    ·
                  </span>
                );
              }
              acc.push(item);
              return acc;
            }, [])}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
