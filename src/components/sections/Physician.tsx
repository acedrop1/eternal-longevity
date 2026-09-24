import Image from 'next/image';

/**
 * Clinical leadership card (System Labs medical-board card, widened).
 * Mobile stacks portrait over text; desktop sets them side by side.
 * Claims are limited to what the licence record shows.
 */

// Fine film grain over the portrait, as an inline SVG so there's no asset.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function Physician() {
  return (
    <section className="bg-white px-5 py-16 text-black md:px-8 md:py-24">
      <div className="mx-auto max-w-7xl">
        <h2
          className="mb-8 font-display font-normal [text-wrap:balance] md:mb-12"
          style={{ fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 }}
        >
          One physician reads every intake.
        </h2>

        <article className="overflow-hidden rounded-[4px] bg-[#EEEEEC] ring-1 ring-black/5">
          <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {/* Portrait */}
            <div className="relative aspect-[4/5] bg-[#E4E4E2] md:aspect-auto md:min-h-[560px]">
              <Image
                src="/dr-elder.webp"
                alt="Dr. Bader Elder, DO"
                fill
                sizes="(max-width: 768px) 100vw, 42vw"
                className="object-cover object-[50%_15%] grayscale contrast-[1.08] mix-blend-multiply"
              />
              <div aria-hidden className="absolute inset-0 opacity-[0.22] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
            </div>

            {/* Text */}
            <div className="flex flex-col justify-between gap-10 p-6 md:p-10 lg:p-14">
              <div>
                <p className="font-mono text-[15px] uppercase tracking-[0.04em] md:text-[17px]">Dr. Bader Elder, DO</p>
                <p className="mt-1.5 font-mono text-[12px] uppercase tracking-[0.04em] text-black/55 md:text-[13px]">
                  Prescriber of record · NJ, NY, PA, MI
                </p>

                <p
                  className="mt-8 max-w-2xl font-display [text-wrap:pretty] md:mt-12"
                  style={{ fontSize: 'clamp(1.35rem, 1.1vw + 1rem, 2.1rem)', fontStretch: '75%', lineHeight: 1.15 }}
                >
                  An osteopathic physician licensed in New Jersey, New York, Pennsylvania and Michigan. He reads every intake himself: nothing reaches the pharmacy
                  without his signature, and nothing is charged unless he approves.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-black/15 pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Eternal Longevity" className="h-7 w-auto md:h-8" draggable={false} />
                <p className="font-mono text-[12px] uppercase tracking-[0.04em] text-black/60">
                  NJ license 25MB11925900
                </p>
              </div>
            </div>
          </div>

          {/* Footer bar */}
          <div className="flex items-center justify-between bg-black px-6 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-white md:px-10 md:text-[12px]">
            <span>Eternal Longevity · Clinical leadership</span>
            <span className="tabular-nums">01</span>
          </div>
        </article>
      </div>
    </section>
  );
}
