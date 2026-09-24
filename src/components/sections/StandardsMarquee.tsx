import type { ReactNode } from 'react';

/**
 * Quality-standards strip along the bottom of the hero video, just above the
 * ticker. Transparent, with the edges faded by a mask so it sits on the video.
 * Every item is a claim the site already makes elsewhere; no press or
 * endorsement claims (there is no press coverage to cite).
 */
interface StandardItem {
  name: string;
  el: ReactNode;
}

const STANDARDS: StandardItem[] = [
  {
    name: 'Batch Tested',
    el: (
      <span
        className="font-bold text-lg md:text-xl leading-none"
        style={{ letterSpacing: '0.08em' }}
      >
        BATCH TESTED
      </span>
    ),
  },
  {
    name: '99%+ Purity',
    el: (
      <span className="font-black italic text-xl md:text-2xl leading-none tracking-tight">
        99%+ <span className="text-accent">purity</span>
      </span>
    ),
  },
  {
    name: '503A Compounded',
    el: (
      <span
        className="inline-flex items-center rounded-sm bg-accent text-black px-2.5 py-1 font-black text-sm md:text-base leading-none"
        style={{ letterSpacing: '0.05em' }}
      >
        503A COMPOUNDED
      </span>
    ),
  },
  {
    name: 'Private by Default',
    el: (
      <span className="text-lg md:text-xl italic tracking-tight leading-none">
        <span className="font-black">Private</span>
        <span className="font-light"> by default</span>
      </span>
    ),
  },
  {
    name: 'Cold-Chain Shipped',
    el: (
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="text-xl md:text-2xl italic font-semibold">Cold-Chain</span>
        <span className="text-base md:text-lg font-bold tracking-tight">Shipped</span>
      </span>
    ),
  },
  {
    name: 'Batch Documented',
    el: (
      <span className="flex items-center gap-2 text-lg md:text-xl leading-none">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full bg-white/90"
        />
        <span className="font-semibold tracking-tight">Batch Documented</span>
      </span>
    ),
  },
  {
    name: 'Compounded in the USA',
    el: (
      <span
        className="font-bold text-lg md:text-xl leading-none"
        style={{ letterSpacing: '0.18em' }}
      >
        USA COMPOUNDED
      </span>
    ),
  },
  {
    name: '18+',
    el: (
      <span
        className="font-black text-2xl md:text-3xl leading-none"
        style={{ letterSpacing: '-0.06em' }}
      >
        <span>18</span>
        <span className="text-accent">+</span>
      </span>
    ),
  },
];

export function StandardsMarquee() {
  // Duplicated for a seamless -50% loop.
  const loop = [...STANDARDS, ...STANDARDS];

  return (
    <div className="flex items-center">
      <div className="relative min-w-0 flex-1 overflow-hidden py-3 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] md:py-4">
        <div className="flex anim-marquee items-center whitespace-nowrap will-change-transform text-white/85">
          {loop.map((p, i) => (
            <div key={`${p.name}-${i}`} className="flex flex-shrink-0 items-center">
              <span className="flex select-none items-center px-8 md:px-12" title={p.name}>
                {p.el}
              </span>
              <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-accent" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
