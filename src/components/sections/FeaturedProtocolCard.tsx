import Image from 'next/image';
import Link from 'next/link';
import type { Protocol } from '@/lib/protocols';

/**
 * Single protocol card. A tall photographic card with the name + category
 * overlaid, peptide stack chips, a short description, and a starting price.
 * Whole card links to the PDP. Shared by the desktop grid and the mobile
 * centered carousel so the two layouts stay in sync.
 */
export function FeaturedProtocolCard({ p }: { p: Protocol }) {
  return (
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
          sizes="(max-width: 640px) 80vw, (max-width: 1024px) 50vw, 25vw"
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

        {/* Footer. Pinned to the bottom. Pricing is members-only, so the
            card drives to the protocol page / assessment instead. */}
        <div className="mt-auto flex items-center justify-between">
          <span className="text-[10px] tracking-widest text-foreground/45">
            PRICING AFTER ASSESSMENT
          </span>
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
  );
}
