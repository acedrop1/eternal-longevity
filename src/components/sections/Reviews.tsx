'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useCatalog } from '@/components/catalog/CatalogProvider';

/**
 * Reviews marquee, text only, each card tagged with the product it's about.
 *
 * LOCAL DEVELOPMENT ONLY. There are no real member reviews yet, so these are
 * layout samples and the section renders nothing in a production build. Swap
 * in real, permissioned reviews (and drop the gate) once they exist. Samples
 * stick to the experience, never to outcomes.
 */
const DEV = process.env.NODE_ENV === 'development';

const SAMPLES: { name: string; product: string; text: string }[] = [
  { name: 'Marcus T.', product: 'nad-plus', text: 'The intake took minutes and the doctor actually messaged me back with questions. Felt like real medicine.' },
  { name: 'Danielle R.', product: 'glutathione', text: 'Arrived cold, packed properly, instructions were clear. No guessing about where it came from.' },
  { name: 'Chris M.', product: 'pt-141', text: 'Discreet box, fast shipping, and the portal makes refills a two-click thing.' },
  { name: 'Priya S.', product: 'sermorelin', text: 'I liked that nothing was charged until the physician signed off. Very transparent.' },
  { name: 'Jordan K.', product: 'nad-plus', text: 'A real pharmacy label, Rx only. This is what I was looking for.' },
  { name: 'Alex P.', product: 'glutathione', text: 'Changed my refill date from the portal in a few seconds. Easy.' },
  { name: 'Sam W.', product: 'pt-141', text: 'Clear pricing up front and support answered same day.' },
  { name: 'Nina L.', product: 'sermorelin', text: 'The whole process felt professional, from the questionnaire to the box at my door.' },
];


// Each half of a track must outrun the widest screen, or the loop shows a gap:
// four cards repeated twice is ~2,900px per half.
const rows = [SAMPLES.slice(0, 4), SAMPLES.slice(4)].map((row) => [...row, ...row]);

export function Reviews() {
  const { showcase } = useCatalog();
  const BY_ID = Object.fromEntries(showcase.map((p) => [p.id, p]));
  const ref = useRef<HTMLDivElement>(null);
  if (!DEV) return null;

  // Ease to a crawl on hover rather than freezing. playbackRate keeps the
  // current position, so there's no jump the way changing duration would.
  const speed = (rate: number) =>
    ref.current?.getAnimations({ subtree: true }).forEach((a) => a.updatePlaybackRate(rate));

  return (
    <section className="overflow-hidden bg-black py-16 text-white md:py-24">
      <div className="mb-10 flex flex-col gap-2 px-5 md:mb-12 md:flex-row md:items-end md:justify-between md:px-8">
        <h2
          className="font-display font-normal"
          style={{ fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 }}
        >
          In their words.
        </h2>
        <p className="font-mono text-[12px] text-accent">Sample reviews · local preview only</p>
      </div>

      <div ref={ref} className="flex flex-col gap-4" onMouseEnter={() => speed(0.25)} onMouseLeave={() => speed(1)}>
        {rows.map((row, r) => (
          <div key={r} className="relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
            <div
              className="flex shrink-0 gap-4 pr-4 [animation:marquee_110s_linear_infinite] motion-reduce:[animation:none]"
              style={r === 1 ? { animationDirection: 'reverse' } : undefined}
            >
              {[...row, ...row].map((s, i) => {
                const p = BY_ID[s.product];
                const copy = i >= row.length / 2; // only the first four are unique
                return (
                  <figure
                    key={i}
                    aria-hidden={copy}
                    className="flex w-[300px] shrink-0 flex-col justify-between gap-6 rounded-[4px] bg-[#161616] p-5 ring-1 ring-white/10 md:w-[360px] md:p-6"
                  >
                    <blockquote className="text-[16px] leading-relaxed text-white/90">&ldquo;{s.text}&rdquo;</blockquote>
                    <figcaption className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-white/60">{s.name}</span>
                      {p && (
                        <Link
                          href={p.href ?? '/shop'}
                          tabIndex={copy ? -1 : undefined}
                          className="group/cta flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-[13px] text-black transition-colors hover:bg-white/85"
                        >
                          <span className="relative h-7 w-7 overflow-hidden rounded-full">
                            <Image src={p.image} alt="" fill sizes="28px" className="object-cover" />
                          </span>
                          Shop {p.name}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" strokeWidth={2} />
                        </Link>
                      )}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
