import Link from 'next/link';
import { FadeIn } from '@/components/ui/FadeIn';
import { PROTOCOLS } from '@/lib/protocols';
import { FeaturedProtocolCard } from './FeaturedProtocolCard';
import { ProtocolCarousel } from './ProtocolCarousel';

/**
 * Featured Protocols.
 *
 *  - Mobile: a centered coverflow-style carousel (ProtocolCarousel). Active
 *    card centered, neighbors peeking + dimmed on both sides, swipe + dots.
 *  - sm+: a clean 4-up card grid, every protocol visible at once.
 *
 * Both layouts render the same FeaturedProtocolCard so they stay in sync.
 */
export function FeaturedProtocol() {
  return (
    <section className="relative overflow-hidden bg-background px-6 py-20 md:py-28">
      {/* Soft halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-[40vh] w-[70vw] -translate-x-1/2 rounded-full bg-accent/[0.05] blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl">
        {/* === HEADER === */}
        <div className="mb-12 md:mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <FadeIn>
              <p className="mb-3 text-[11px] tracking-widest text-accent">
                01 / FEATURED PROTOCOLS
              </p>
            </FadeIn>
            <FadeIn delay={120}>
              <h2
                className="font-semibold tracking-tight text-foreground max-w-2xl"
                style={{
                  fontSize: 'clamp(2.25rem, 5vw, 4.25rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.02,
                }}
              >
                Built for outcomes.
                <span className="block text-foreground/40">
                  Engineered for safety.
                </span>
              </h2>
            </FadeIn>
            <FadeIn delay={220}>
              <p className="mt-4 max-w-xl text-foreground/60 leading-relaxed">
                Four premium longevity protocols, each engineered
                for a specific goal. Each protocol is formulated to a structured
                cycle and third-party tested before it ships.
              </p>
            </FadeIn>
          </div>
          <FadeIn delay={300}>
            <Link
              href="/protocols"
              className="pill bg-foreground text-background px-7 py-3 text-base font-semibold hover:bg-accent hover:text-black transition-colors inline-flex items-center gap-2 flex-shrink-0"
            >
              See all protocols
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden
              >
                <path
                  d="M7 17L17 7M17 7H8M17 7v9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </FadeIn>
        </div>

        {/* === MOBILE: centered carousel === */}
        <FadeIn delay={360}>
          <ProtocolCarousel />
        </FadeIn>

        {/* === sm+ : card grid === */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {PROTOCOLS.map((p, i) => (
            <FadeIn key={p.id} delay={360 + i * 100} y={20}>
              <FeaturedProtocolCard p={p} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
