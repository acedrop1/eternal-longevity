import Image from 'next/image';
import { FadeIn } from '@/components/ui/FadeIn';

/**
 * The physician behind the practice, named and shown.
 *
 * This replaced three cards for people who did not exist — blank names over
 * invented credentials. One real prescriber carries more weight than an
 * invented bench, and every claim here is verifiable against his licence.
 */
export function ClinicalBoard() {
  return (
    <section className="relative bg-surface px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <p className="mb-10 text-[11px] tracking-widest text-foreground/50">
            CLINICAL LEADERSHIP
          </p>
        </FadeIn>

        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,380px)_1fr] md:gap-16">
          {/* Portrait card */}
          <FadeIn>
            <figure className="overflow-hidden rounded-3xl border border-line bg-background">
              <figcaption className="px-6 pt-6 text-sm font-semibold tracking-widest text-foreground">
                DR. BADER ELDER, DO
              </figcaption>
              {/* Natural aspect, not cropped: the fade to transparent is baked
                  into the lower third of the file, and object-cover would clip
                  exactly that and leave a hard edge. */}
              <Image
                src="/dr-elder.webp"
                alt="Dr. Bader Elder, DO"
                width={900}
                height={1350}
                sizes="(max-width: 768px) 100vw, 380px"
                className="h-auto w-full"
                priority={false}
              />
              {/* Sits inside the faded-out base of the portrait. */}
              <p className="-mt-14 px-6 pb-6 text-xs leading-relaxed text-foreground/55">
                Osteopathic physician licensed in New Jersey. Prescriber of
                record for every order placed through Eternal Longevity.
              </p>
            </figure>
          </FadeIn>

          {/* Statement */}
          <div>
            <FadeIn delay={120}>
              <h2
                className="mb-5 font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(1.9rem, 4vw, 3.25rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                One physician reads every intake.
              </h2>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="max-w-xl space-y-4 leading-relaxed text-foreground/65">
                <p>
                  Dr. Elder practises endovascular medicine in Totowa, New
                  Jersey, where he leads a vein and vascular program built on
                  ultrasound-guided, minimally invasive procedures.
                </p>
                <p>
                  He owns this practice outright. There is no prescriber
                  network, no rotating panel, and no algorithm that approves on
                  his behalf — he reviews each intake himself and either issues
                  a prescription or declines it with a clinical note. Nothing
                  reaches the pharmacy without his signature, and nothing is
                  charged unless he approves.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
