import Image from 'next/image';
import { FadeIn } from '@/components/ui/FadeIn';

/**
 * The physician behind the practice, named and shown.
 *
 * This replaced three cards for people who did not exist — blank names over
 * invented credentials. One real prescriber carries more weight than an
 * invented bench, and every claim here is verifiable against his licence.
 *
 * No card, no border, no caption bar. A bordered black box around a portrait
 * shot on a light background reads as two rectangles fighting each other; the
 * photograph is the object, so it is given its own plate in its own tone and
 * dissolved into the section at the base. The name sits under it, quiet and
 * small, the way a plate is captioned rather than labelled.
 */
export function ClinicalBoard() {
  return (
    <section className="relative bg-background px-6 py-20 md:py-28">
      <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[300px_1fr] md:gap-20">
        <FadeIn>
          <figure className="m-0">
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                background:
                  'linear-gradient(180deg, #d8d4cd 0%, #c9c5bd 55%, #b9b5ad 100%)',
                /* Dissolves the plate into the section instead of ending on a
                   hard edge against the dark ground. */
                WebkitMaskImage:
                  'linear-gradient(180deg, #000 0%, #000 78%, transparent 100%)',
                maskImage:
                  'linear-gradient(180deg, #000 0%, #000 78%, transparent 100%)',
              }}
            >
              <Image
                src="/dr-elder.webp"
                alt="Dr. Bader Elder, DO"
                width={900}
                height={1350}
                sizes="(max-width: 768px) 80vw, 300px"
                className="h-auto w-full"
                priority={false}
              />
            </div>
            <figcaption className="mt-5">
              <p className="text-[15px] font-medium tracking-tight text-foreground">
                Dr. Bader Elder, DO
              </p>
              <p className="mt-1 text-[13px] text-foreground/45">
                Prescriber of record &middot; New Jersey
              </p>
            </figcaption>
          </figure>
        </FadeIn>

        <div>
          <FadeIn delay={120}>
            <p className="mb-6 text-[11px] tracking-widest text-foreground/40">
              CLINICAL LEADERSHIP
            </p>
            <h2
              className="font-semibold tracking-tight text-foreground"
              style={{
                fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)',
                letterSpacing: '-0.022em',
                lineHeight: 1.1,
                textWrap: 'balance',
              }}
            >
              One physician reads every intake.
            </h2>
          </FadeIn>
          <FadeIn delay={200}>
            <div className="mt-6 max-w-[38ch] space-y-4 text-[15px] leading-relaxed text-foreground/60">
              <p>
                A New Jersey&ndash;licensed osteopathic physician, and the
                prescriber of record for this practice.
              </p>
              <p>
                He reads every intake himself. Nothing reaches the pharmacy
                without his signature, and nothing is charged unless he
                approves.
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
