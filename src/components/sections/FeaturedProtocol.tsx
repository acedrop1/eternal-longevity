import Image from 'next/image';
import Link from 'next/link';
import { FadeIn } from '@/components/ui/FadeIn';
import { PROTOCOLS } from '@/lib/protocols';

/**
 * Featured Protocols — clean 4-up card grid.
 *
 * Replaces the old tabbed spotlight. Every protocol is visible at once:
 * a tall photographic card with the protocol name, tagline, peptide stack,
 * and a starting price — each card links straight to its PDP. No tabs, no
 * switcher, no oversized packaging hero. Reads like a premium product
 * gallery and works cleanly on mobile (1-up) through desktop (4-up).
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
                Four physician-supervised peptide stacks, each engineered for a
                specific goal. Your physician finalizes the protocol after a
                clinical review.
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

        {/* === CARD GRID === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {PROTOCOLS.map((p, i) => {
            const perMonth = Math.round(p.pricing.annual / 12);
            return (
              <FadeIn key={p.id} delay={360 + i * 100} y={20}>
                <Link
                  href={`/protocols/${p.id}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-all duration-500 ease-out-expo hover:-translate-y-1 hover:border-accent/40"
                >
                  {/* Photographic header */}
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover opacity-55 transition-all duration-[1.4s] ease-out-expo group-hover:scale-105 group-hover:opacity-70"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/85"
                    />

                    {/* Popular badge on Recover */}
                    {p.id === 'recover' && (
                      <span className="absolute top-4 left-4 inline-flex items-center rounded-full bg-accent text-black px-2.5 py-1 text-[10px] tracking-widest font-semibold">
                        MOST POPULAR
                      </span>
                    )}

                    {/* Name + tagline overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="mb-1.5 text-[10px] tracking-widest text-accent">
                        {p.category}
                      </p>
                      <h3
                        className="font-bold tracking-tight text-white"
                        style={{
                          fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)',
                          letterSpacing: '-0.02em',
                          lineHeight: 1,
                        }}
                      >
                        {p.name}
                      </h3>
                      <p className="mt-1 text-xs text-white/65">{p.tagline}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    {/* Peptide stack chips */}
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {p.stack.slice(0, 4).map((peptide) => (
                        <span
                          key={peptide}
                          className="rounded-full border border-line bg-background px-2 py-0.5 text-[10px] tracking-wider text-foreground/65"
                        >
                          {peptide}
                        </span>
                      ))}
                    </div>

                    <p className="mb-5 text-sm text-foreground/65 leading-relaxed line-clamp-3">
                      {p.shortDescription}
                    </p>

                    {/* Price + arrow — pinned to the bottom */}
                    <div className="mt-auto flex items-end justify-between">
                      <div>
                        <p className="text-[10px] tracking-widest text-foreground/45">
                          STARTING AT
                        </p>
                        <p className="text-lg font-semibold text-foreground tracking-tight">
                          ${perMonth}
                          <span className="text-sm text-foreground/55 font-normal">
                            /mo
                          </span>
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] tracking-widest text-accent transition-transform duration-300 ease-out-expo group-hover:translate-x-1">
                        EXPLORE
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
