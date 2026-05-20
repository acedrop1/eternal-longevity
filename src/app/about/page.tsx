import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';
import { LoopVideo } from '@/components/ui/LoopVideo';

export const metadata: Metadata = {
  title: 'About | Eternal Longevity',
  description:
    'Why Eternal Longevity exists, who built it, and the principles behind every protocol we ship.',
};

const NUMBERS = [
  { stat: '12', label: 'Peptides in our formulary' },
  { stat: '4', label: 'Signature protocols' },
  { stat: '8', label: 'Licensed physician states' },
  { stat: '99%+', label: 'Lot purity, third-party tested' },
];

const VALUES = [
  {
    n: '01',
    title: 'Conservative by default',
    body:
      "In a category that rewards louder claims, we lean the other way. Every dose starts low. Every protocol is gated on labs. We'd rather under-promise and over-deliver than the inverse.",
  },
  {
    n: '02',
    title: 'Transparency over polish',
    body:
      "We publish what we know. And what we don't. If a peptide has thin human data, we say so. If we're unsure, we route it back to your physician. Clean science beats clean marketing.",
  },
  {
    n: '03',
    title: 'The physician is in the loop',
    body:
      'No algorithm signs a prescription here. A licensed physician reviews your intake, your labs, and your protocol. And follows up across the cycle. The relationship is the product.',
  },
  {
    n: '04',
    title: 'Long horizon, slow medicine',
    body:
      "We don't do crash protocols. We design for a five-year arc. Biological markers that compound, habits that hold, and stacks you can sustain. Longevity is a posture, not a sprint.",
  },
];

const TIMELINE = [
  {
    year: '2024',
    title: 'The thesis',
    body:
      'A clinician and an operator met over a shared frustration: the peptide market was either gray-market chaos or anti-aging hype. There was no clinical, calm middle.',
  },
  {
    year: '2025',
    title: 'The pharmacy partnership',
    body:
      'We signed our first 503A compounding partner. Every protocol now begins with a vial that has a paper trail. From amino acid to your doorstep.',
  },
  {
    year: '2026',
    title: 'Eternal Longevity launches',
    body:
      'Four protocols. Eight states. A small clinical team. A simple promise: peptide medicine done the way it should have been the whole time.',
  },
];

// Names blanked pending Kirten's real team info.
const TEAM = [
  {
    name: '',
    role: 'Medical Director',
    bio:
      'Internal medicine, twelve years in integrative hormone work. Oversees protocol design and physician training across the network.',
  },
  {
    name: '',
    role: 'Founder',
    bio:
      'Former operator at a longevity clinic; built Eternal Longevity to widen access without compromising the clinical bar.',
  },
  {
    name: '',
    role: 'Compounding Lead',
    bio:
      'Twenty years in 503A compounding. Owns lot-level quality control, third-party purity testing, and cold-chain logistics.',
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="relative bg-background">
        {/* ============ HERO ============ */}
        <section className="relative px-6 pt-28 pb-20 md:pt-40 md:pb-28 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/3 right-0 h-[60vh] w-[60vh] translate-x-1/3 rounded-full bg-accent/[0.08] blur-[120px]"
          />
          <div className="relative mx-auto max-w-6xl grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:items-end">
            <div>
              <FadeIn>
                <p className="mb-6 text-[11px] tracking-widest text-accent">
                  01 / ABOUT
                </p>
              </FadeIn>
              <FadeIn delay={120}>
                <h1
                  className="mb-8 max-w-4xl font-semibold tracking-tight text-foreground"
                  style={{
                    fontSize: 'clamp(2.75rem, 6.5vw, 5.5rem)',
                    letterSpacing: '-0.025em',
                    lineHeight: 0.98,
                  }}
                >
                  Built by clinicians, for the next decades of your life.
                </h1>
              </FadeIn>
              <FadeIn delay={240}>
                <p className="max-w-2xl text-lg text-foreground/65 leading-relaxed">
                  Eternal Longevity exists because peptide medicine deserved a
                  better front door. Not gray-market vials shipped from somewhere
                  unmarked. Not a wellness brand with a checkout button. A real
                  clinic, a real physician on the other end of your intake, and
                  protocols built to hold for years. Not weeks.
                </p>
              </FadeIn>
            </div>

            {/* Hero side image. Editorial portrait */}
            <FadeIn delay={300}>
              <figure className="relative overflow-hidden rounded-3xl border border-line bg-surface">
                <div className="relative aspect-[3/4]">
                  <Image
                    src="/images/10.jpg"
                    alt="Clinical lifestyle"
                    fill
                    sizes="(max-width: 1024px) 90vw, 480px"
                    className="object-cover"
                    priority
                  />
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/70 to-transparent"
                  />
                  <span className="absolute bottom-4 left-4 text-[10px] tracking-widest text-foreground/80">
                    EST. 2024
                  </span>
                </div>
              </figure>
            </FadeIn>
          </div>
        </section>

        {/* ============ NUMBERS ============ */}
        <section className="relative px-6 py-16 md:py-24 bg-surface">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
              {NUMBERS.map((n, i) => (
                <FadeIn key={n.label} delay={i * 80}>
                  <div>
                    <div
                      className="mb-2 font-semibold tracking-tight text-accent"
                      style={{
                        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                        letterSpacing: '-0.025em',
                        lineHeight: 1,
                      }}
                    >
                      {n.stat}
                    </div>
                    <div className="text-xs md:text-sm tracking-wider text-foreground/55">
                      {n.label}
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============ THESIS ============ */}
        <section className="relative px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
            <FadeIn>
              <div>
                <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                  02 / OUR THESIS
                </p>
                <h2
                  className="font-semibold tracking-tight text-foreground"
                  style={{
                    fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05,
                  }}
                >
                  The middle was missing.
                </h2>
              </div>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="space-y-5 text-foreground/75 leading-relaxed text-base md:text-lg">
                <p>
                  When we started looking at the peptide landscape in 2024, we
                  found two extremes. On one side, hospital-grade clinics in
                  three U.S. cities, charging twenty thousand a year for what
                  amounted to four shipments and a quarterly call.
                </p>
                <p>
                  On the other, the underground. Pseudonymous suppliers, no
                  testing, no physician, no paper trail. The people who
                  actually needed peptide medicine the most were getting it the
                  worst.
                </p>
                <p>
                  Eternal Longevity is the answer to that gap. Clinic-grade
                  pharmacy. Physician-signed protocols. A price point that
                  doesn&apos;t require a private banker. And the patience to
                  measure outcomes over years, not Instagram-week before-and-afters.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ============ VALUES ============ */}
        <section className="relative px-6 py-24 md:py-32 bg-surface">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-3xl">
              <FadeIn>
                <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                  03 / PRINCIPLES
                </p>
              </FadeIn>
              <FadeIn delay={120}>
                <h2
                  className="mb-5 font-semibold tracking-tight text-foreground"
                  style={{
                    fontSize: 'clamp(2rem, 4.5vw, 3.75rem)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.02,
                  }}
                >
                  What we will and won&apos;t do.
                </h2>
              </FadeIn>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {VALUES.map((v, i) => (
                <FadeIn key={v.n} delay={i * 100}>
                  <div className="h-full rounded-3xl border border-line bg-background p-7 md:p-8">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-[10px] tracking-widest text-accent">
                        {v.n}
                      </span>
                      <span className="h-px flex-1 ml-4 bg-line" />
                    </div>
                    <h3 className="mb-3 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      {v.title}
                    </h3>
                    <p className="text-foreground/65 leading-relaxed">{v.body}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============ TIMELINE ============ */}
        <section className="relative px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-3xl">
              <FadeIn>
                <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                  04 / TIMELINE
                </p>
              </FadeIn>
              <FadeIn delay={120}>
                <h2
                  className="font-semibold tracking-tight text-foreground"
                  style={{
                    fontSize: 'clamp(2rem, 4.5vw, 3.75rem)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.02,
                  }}
                >
                  How we got here.
                </h2>
              </FadeIn>
            </div>

            <div className="relative">
              <div
                aria-hidden
                className="absolute left-2 md:left-3 top-3 bottom-3 w-px bg-line"
              />
              <ol className="space-y-10 md:space-y-14">
                {TIMELINE.map((t, i) => (
                  <FadeIn key={t.year} delay={i * 120} as="li">
                    <div className="relative pl-10 md:pl-14">
                      <span className="absolute left-0 top-1.5 grid h-5 w-5 md:h-6 md:w-6 place-items-center rounded-full bg-accent text-background">
                        <span className="h-1.5 w-1.5 rounded-full bg-background" />
                      </span>
                      <div className="mb-2 text-[11px] tracking-widest text-accent">
                        {t.year}
                      </div>
                      <h3 className="mb-2 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                        {t.title}
                      </h3>
                      <p className="max-w-2xl text-foreground/65 leading-relaxed">
                        {t.body}
                      </p>
                    </div>
                  </FadeIn>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ============ EDITORIAL DIVIDER. Full-bleed image ============ */}
        <section className="relative">
          <FadeIn>
            <div className="relative h-[40vh] md:h-[60vh] w-full overflow-hidden">
              <Image
                src="/images/2.jpg"
                alt="Longevity in practice"
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/40"
              />
              <div className="absolute inset-0 flex items-end px-6 pb-10 md:pb-16">
                <div className="mx-auto w-full max-w-6xl">
                  <p className="max-w-xl text-foreground/85 text-base md:text-lg leading-relaxed">
                    A clinical-grade pharmacy, paired with a physician who
                    actually reads your intake. That&apos;s the whole point.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </section>

        {/* ============ TEAM ============ */}
        <section className="relative px-6 py-24 md:py-32 bg-surface">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-3xl">
              <FadeIn>
                <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                  05 / TEAM
                </p>
              </FadeIn>
              <FadeIn delay={120}>
                <h2
                  className="mb-5 font-semibold tracking-tight text-foreground"
                  style={{
                    fontSize: 'clamp(2rem, 4.5vw, 3.75rem)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.02,
                  }}
                >
                  The people behind the protocols.
                </h2>
              </FadeIn>
              <FadeIn delay={200}>
                <p className="text-foreground/65 leading-relaxed">
                  A small, deliberate team. A medical director who designs the
                  protocols. A founder who keeps the operation honest. A
                  compounding lead who treats every lot like it matters —
                  because it does.
                </p>
              </FadeIn>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {TEAM.map((member, i) => (
                <FadeIn key={member.role} delay={i * 120}>
                  <div className="group h-full overflow-hidden rounded-3xl border border-line bg-background">
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-accent/5 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* Empty until real photos land. Show a subtle EL monogram
                            placeholder so the slot still feels intentional. */}
                        <span className="text-7xl font-semibold tracking-tight text-accent/30">
                          EL
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
                    </div>
                    <div className="p-6">
                      <div className="mb-3 text-[11px] tracking-widest text-accent">
                        {member.role.toUpperCase()}
                      </div>
                      <p className="text-sm text-foreground/65 leading-relaxed">
                        {member.bio}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============ QUOTE. Video bg ============ */}
        <section className="relative px-6 py-24 md:py-32 overflow-hidden">
          <LoopVideo
            src="/videos/3.mp4"
            className="absolute inset-0 w-full h-full"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-background/80"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/4 left-1/2 h-[40vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <FadeIn>
              <span className="inline-block text-7xl md:text-9xl leading-none text-accent/40 font-serif">
                &ldquo;
              </span>
            </FadeIn>
            <FadeIn delay={100}>
              <p
                className="mt-2 mb-10 font-medium tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                  letterSpacing: '-0.015em',
                  lineHeight: 1.25,
                }}
              >
                We treat people for the next twenty years, not the next twenty
                weeks. That single shift in time horizon changes every
                decision: how we dose, how we measure, how we say no.
              </p>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="text-[11px] tracking-widest text-foreground/55">
                MEDICAL DIRECTOR
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ============ FOOT CTA ============ */}
        <section className="relative px-6 py-24 md:py-32 bg-surface overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-1/4 left-1/2 h-[40vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[120px]"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <FadeIn>
              <h2
                className="mb-6 font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 3.75rem)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                If our standards match yours, start your assessment.
              </h2>
            </FadeIn>
            <FadeIn delay={150}>
              <p className="mb-10 text-foreground/65 leading-relaxed">
                Three minutes. A licensed physician reviews it. You hear back
                within forty-eight hours with a recommendation. Or a polite
                no. Either answer is the right one if it&apos;s the true one.
              </p>
            </FadeIn>
            <FadeIn delay={250}>
              <Link
                href="/start"
                className="pill bg-accent text-black font-semibold px-8 py-4 text-base hover:bg-accent-soft transition-colors inline-flex items-center gap-2"
              >
                Start your assessment
                <span aria-hidden>→</span>
              </Link>
            </FadeIn>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
