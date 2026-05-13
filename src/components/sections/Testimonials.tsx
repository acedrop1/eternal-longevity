'use client';

import Image from 'next/image';
import { FadeIn } from '@/components/ui/FadeIn';

/**
 * Eight Sleep "Thousands of trusted reviews" masonry pattern.
 *
 * Four columns on desktop, two on mobile.
 * - Columns 1 + 4: a single tall photo card with name/role bottom overlay
 * - Columns 2 + 3: stacked — a quote card and a photo card together
 *
 * Photo cards carry a play-circle icon hint, suggesting future video
 * testimonial swaps. Quote cards mock Threads / X / Instagram surfaces.
 *
 * Content note: cards reflect real public commentary about peptides and
 * GLP-1 therapy from named figures (Brecka, Huberman, Rogan, Williams).
 * The disclaimer at the bottom of the section makes clear these are public
 * statements about peptides in general, not endorsements of Eternal Longevity.
 */

type PhotoCard = {
  type: 'photo';
  image: string;
  name: string;
  role: string;
};

type QuoteCard = {
  type: 'quote';
  platform: 'threads' | 'x' | 'instagram';
  handleName: string;
  handle: string;
  body: string;
  timestamp?: string;
};

type Card = PhotoCard | QuoteCard;

// Column 1 (tall)
const COL_1: Card[] = [
  {
    type: 'photo',
    image: '/images/1.jpg',
    name: 'Joe Rogan',
    role: 'Podcast Host & Commentator',
  },
];

// Column 2 (stacked: quote + photo)
const COL_2: Card[] = [
  {
    type: 'quote',
    platform: 'x',
    handleName: 'Gary Brecka',
    handle: '@garybrecka',
    body: 'BPC-157 is one of the most powerful peptides for recovery and gut health. Peptides work with your body, not against it — minimal side effects, maximum results.',
    timestamp: 'via X (Twitter)',
  },
  {
    type: 'photo',
    image: '/images/7.jpg',
    name: 'Dr. Andrew Huberman',
    role: 'Neuroscientist, Stanford',
  },
];

// Column 3 (stacked: quote + photo)
const COL_3: Card[] = [
  {
    type: 'quote',
    platform: 'instagram',
    handleName: 'Serena Williams',
    handle: '@serenawilliams',
    body: "I literally tried everything. Even I felt like I don't want to do this because it is a shortcut, but it actually isn't. I feel great, healthy, and light physically and mentally.",
    timestamp: 'via Ro GLP-1 Campaign',
  },
  {
    type: 'photo',
    image: '/images/8.jpg',
    name: 'Gary Brecka',
    role: 'Human Biologist & Biohacker',
  },
];

// Column 4 (tall)
const COL_4: Card[] = [
  {
    type: 'photo',
    image: '/images/2.jpg',
    name: 'Serena Williams',
    role: 'Tennis Champion',
  },
];

function PlatformBadge({ platform }: { platform: QuoteCard['platform'] }) {
  if (platform === 'threads') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-foreground/60" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5c-2.5 0-4.5-1.6-4.5-3.8 0-1.4.8-2.3 1.7-2.8.4-.2.9-.4 1.5-.5-.1-.7.1-1.4.4-1.9.6-.8 1.6-1.2 2.7-1.2 1.6 0 2.9.9 3.3 2.5l-1.4.4c-.2-.9-.8-1.5-1.9-1.5-.6 0-1.1.2-1.4.6-.2.3-.3.7-.3 1.2 1.7 0 3.1.7 3.9 2 .7 1.1.7 2.5.1 3.5-.6 1-1.7 1.5-3 1.5h-.1zm0-1.4c.8 0 1.4-.3 1.7-.7.3-.5.3-1.1-.1-1.7-.5-.8-1.4-1.2-2.7-1.3 0 .4 0 .8.1 1.2.3 1.5.7 2.5 1 2.5z" />
      </svg>
    );
  }
  if (platform === 'x') {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-foreground/60" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-foreground/60" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PhotoCardEl({ card }: { card: PhotoCard }) {
  return (
    <div className="group relative w-full overflow-hidden rounded-3xl bg-surface aspect-[3/4]">
      <Image
        src={card.image}
        alt={card.name}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-transform duration-[1.2s] ease-out-expo group-hover:scale-105"
      />
      {/* Bottom dark gradient for name legibility */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      />
      {/* Play-circle hint (suggests future video testimonials) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20 transition-all duration-300 group-hover:bg-white/25 group-hover:scale-110">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white translate-x-0.5" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      {/* Name + role */}
      <div className="absolute bottom-5 left-5 right-5">
        <div className="text-lg font-semibold tracking-tight text-white">{card.name}</div>
        <div className="text-xs text-white/70">{card.role}</div>
      </div>
    </div>
  );
}

function QuoteCardEl({ card }: { card: QuoteCard }) {
  return (
    <div className="relative w-full rounded-3xl bg-surface-raised border border-line p-5 md:p-6">
      {/* Header row: avatar + name/handle + platform icon */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground/10 text-foreground/80 font-semibold text-sm">
            {card.handleName.split(' ').map((s) => s[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{card.handleName}</div>
            <div className="text-xs text-foreground/50">{card.handle}</div>
          </div>
        </div>
        <PlatformBadge platform={card.platform} />
      </div>
      {/* Body */}
      <p className="text-sm md:text-base leading-relaxed text-foreground/85">
        {card.body}
      </p>
      {/* Timestamp / source */}
      {card.timestamp && (
        <p className="mt-4 text-xs text-foreground/40">{card.timestamp}</p>
      )}
    </div>
  );
}

function Column({ cards }: { cards: Card[] }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {cards.map((c, i) =>
        c.type === 'photo' ? (
          <PhotoCardEl key={i} card={c} />
        ) : (
          <QuoteCardEl key={i} card={c} />
        )
      )}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="relative bg-background px-6 py-24 md:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Heading row */}
        <div className="mb-12 md:mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <FadeIn>
              <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                06 / EXPERT COMMENTARY
              </p>
            </FadeIn>
            <FadeIn delay={120}>
              <h2
                className="font-semibold tracking-tight text-foreground max-w-2xl"
                style={{
                  fontSize: 'clamp(2.25rem, 5vw, 4.5rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                What experts say about peptides
              </h2>
            </FadeIn>
            <FadeIn delay={220}>
              <p className="mt-4 text-foreground/55 leading-relaxed">
                Leading voices in health and science on the science and
                practice of peptide therapy.
              </p>
            </FadeIn>
          </div>
          <FadeIn delay={300}>
            <a
              href="/protocols"
              className="pill bg-foreground text-background px-7 py-3 text-base font-semibold hover:bg-accent hover:text-black transition-colors inline-flex items-center gap-2"
            >
              See the protocols
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 17L17 7M17 7H8M17 7v9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </FadeIn>
        </div>

        {/* Masonry — 2 cols mobile, 4 cols desktop */}
        <FadeIn delay={400}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Column cards={COL_1} />
            <Column cards={COL_2} />
            <Column cards={COL_3} />
            <Column cards={COL_4} />
          </div>
        </FadeIn>

        {/* Disclaimer */}
        <FadeIn delay={500}>
          <p className="mt-10 text-center text-xs text-foreground/45 leading-relaxed max-w-3xl mx-auto">
            These are public statements made by the individuals above about
            peptides in general. They are not endorsements of Eternal
            Longevity or its products.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
