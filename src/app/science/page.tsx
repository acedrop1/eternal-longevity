import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';
import { LoopVideo } from '@/components/ui/LoopVideo';

export const metadata: Metadata = {
  title: 'The Science — Eternal Longevity',
  description:
    'How peptides work — the mechanisms, evidence, and standards behind every Eternal Longevity protocol.',
};

const MECHANISMS = [
  {
    n: '01',
    title: 'Growth-hormone axis',
    body:
      'Secretagogues like CJC-1295 and Ipamorelin act on the pituitary to produce pulsatile, physiological GH release — matching how a healthy 25-year-old body naturally cycles, without flooding the system.',
  },
  {
    n: '02',
    title: 'Tissue repair',
    body:
      'BPC-157 and TB-500 upregulate growth factors at the site of injury, accelerate angiogenesis, and modulate inflammation — shortening recovery windows for ligaments, tendons, and gut lining.',
  },
  {
    n: '03',
    title: 'Cellular cleanup',
    body:
      'Targeted senolytics and mitochondrial peptides clear damaged cells and rebuild ATP production — the deep work of slowing biological aging at the source rather than just managing its symptoms.',
  },
  {
    n: '04',
    title: 'Metabolic balance',
    body:
      'Tesofensine, Tirzepatide, and supporting peptides re-sensitize insulin pathways and re-regulate appetite signaling — producing fat loss that holds because the underlying biology shifted, not just the scale.',
  },
];

const STANDARDS = [
  {
    label: '99%+ Purity',
    body:
      'Independent HPLC and mass-spec testing on every lot. We publish certificates of analysis on request.',
  },
  {
    label: '503A Compounding',
    body:
      'All prescriptions are filled by U.S.-licensed 503A pharmacies operating under state-board oversight.',
  },
  {
    label: 'Physician Oversight',
    body:
      'Every protocol is signed by a licensed physician. We do not ship anything without a real clinical review.',
  },
  {
    label: 'Cold-Chain Shipping',
    body:
      'Peptides are temperature-sensitive. We ship insulated with phase-change packs — never bulk-mailed.',
  },
];

const EVIDENCE = [
  {
    peptide: 'CJC-1295 / Ipamorelin',
    headline: 'GH pulse amplification, no cortisol shift',
    summary:
      'In healthy adults, combined dosing produced sustained increases in IGF-1 and GH AUC across an eight-week window without elevating prolactin or cortisol — the cleanest pulsatile profile in this class.',
    note: 'Multiple Phase 1/2 trials, peer-reviewed.',
  },
  {
    peptide: 'BPC-157',
    headline: 'Tendon & ligament healing in animal models',
    summary:
      'Strong preclinical record for accelerating soft-tissue repair, gut barrier restoration, and reducing NSAID-related GI injury. Human data remains limited — we treat it accordingly in our protocols.',
    note: 'Preclinical robust; human evidence emerging.',
  },
  {
    peptide: 'Tesamorelin',
    headline: 'Visceral fat reduction, sustained',
    summary:
      'FDA-approved for HIV-associated lipodystrophy, with strong off-label evidence for visceral adipose reduction in middle-aged adults — paired with measurable improvements in lipid profile.',
    note: 'FDA-approved indication; off-label use is common.',
  },
  {
    peptide: 'Semaglutide / Tirzepatide',
    headline: 'GLP-1 metabolic reset',
    summary:
      'Large randomized trials demonstrate 15–22% mean body-weight reduction with sustained insulin sensitivity gains. Our protocols pair these with muscle-preserving peptides to protect lean mass.',
    note: 'Phase 3 RCTs, FDA-approved.',
  },
];

const PRINCIPLES = [
  {
    title: 'Start low, titrate slow',
    body:
      'Every dose curve starts conservatively. We escalate based on labs and reported response — not on a fixed timeline. Cautious dosing is the difference between a clean protocol and a cluttered one.',
  },
  {
    title: 'Stack with intent',
    body:
      'We combine peptides only when their mechanisms genuinely complement each other. No kitchen-sink stacks. Each addition has to earn its place.',
  },
  {
    title: 'Measure what matters',
    body:
      'Bloodwork before, mid-cycle, and after. We track IGF-1, fasting insulin, lipid panels, hs-CRP, and HbA1c — and we adjust the protocol when the numbers tell us to.',
  },
  {
    title: 'Off-cycle by design',
    body:
      'Most protocols include scheduled off-cycles. Continuous dosing erodes receptor sensitivity. Rest periods preserve the effect.',
  },
];

export default function SciencePage() {
  return (
    <>
      <Header />
      <main className="relative bg-background">
        {/* ============ HERO ============ */}
        <section className="relative px-6 pt-28 pb-20 md:pt-40 md:pb-28 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/4 left-1/2 h-[50vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
          />
          <div className="relative mx-auto max-w-5xl text-center">
            <FadeIn>
              <p className="mb-6 text-[11px] tracking-widest text-accent">
                01 / THE SCIENCE
              </p>
            </FadeIn>
            <FadeIn delay={120}>
              <h1
                className="mb-6 font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2.75rem, 6.5vw, 5.5rem)',
                  letterSpacing: '-0.025em',
                  lineHeight: 0.98,
                }}
              >
                The science of self-engineering.
              </h1>
            </FadeIn>
            <FadeIn delay={240}>
              <p className="mx-auto max-w-2xl text-lg text-foreground/65 leading-relaxed">
                Peptides are short chains of amino acids that act as biological
                signals — telling specific cells, organs, and pathways what to
                do. Done well, they don&apos;t override your body. They restore
                the signaling that age, stress, and modern living have quietly
                eroded.
              </p>
            </FadeIn>
            <FadeIn delay={360}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/start"
                  className="pill bg-accent text-black font-semibold px-7 py-3 hover:bg-accent-soft transition-colors"
                >
                  Start your assessment →
                </Link>
                <Link
                  href="/protocols"
                  className="pill glass text-foreground/85 hover:text-foreground px-7 py-3"
                >
                  See our protocols
                </Link>
              </div>
            </FadeIn>

            {/* Ambient hero video — subtle ribbon under the CTA */}
            <FadeIn delay={500}>
              <div className="relative mt-16 md:mt-20">
                <LoopVideo
                  src="/videos/3.mp4"
                  className="aspect-[21/9] md:aspect-[24/9] w-full rounded-3xl border border-line"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-t from-background via-transparent to-transparent"
                />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ============ MECHANISMS ============ */}
        <section className="relative px-6 py-24 md:py-32 bg-surface">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-3xl">
              <FadeIn>
                <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                  02 / MECHANISMS
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
                  Four pathways. One coherent strategy.
                </h2>
              </FadeIn>
              <FadeIn delay={200}>
                <p className="text-foreground/65 leading-relaxed">
                  Our protocols target the systems that age most visibly — and
                  most fixably. We pick mechanisms with strong human data, dose
                  them conservatively, and verify the response with labs.
                </p>
              </FadeIn>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {MECHANISMS.map((m, i) => (
                <FadeIn key={m.n} delay={i * 100}>
                  <div className="group h-full rounded-3xl border border-line bg-background p-7 md:p-8 transition-colors hover:border-accent/40">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-[10px] tracking-widest text-accent">
                        {m.n}
                      </span>
                      <span className="h-px flex-1 ml-4 bg-line group-hover:bg-accent/30 transition-colors" />
                    </div>
                    <h3 className="mb-3 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      {m.title}
                    </h3>
                    <p className="text-foreground/65 leading-relaxed">
                      {m.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============ EVIDENCE ============ */}
        <section className="relative px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 grid gap-8 md:grid-cols-2 md:items-end">
              <FadeIn>
                <div>
                  <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                    03 / EVIDENCE
                  </p>
                  <h2
                    className="font-semibold tracking-tight text-foreground"
                    style={{
                      fontSize: 'clamp(2rem, 4.5vw, 3.75rem)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.02,
                    }}
                  >
                    What the trials actually say.
                  </h2>
                </div>
              </FadeIn>
              <FadeIn delay={150}>
                <p className="text-foreground/65 leading-relaxed">
                  A summary, not a sales pitch. Every peptide we offer is
                  selected because the human evidence — Phase 2 and Phase 3
                  trials where they exist, robust preclinical work where they
                  don&apos;t — supports a real clinical case.
                </p>
              </FadeIn>
            </div>

            <div className="grid gap-4">
              {EVIDENCE.map((e, i) => (
                <FadeIn key={e.peptide} delay={i * 80}>
                  <div className="grid grid-cols-1 gap-6 rounded-2xl border border-line bg-surface px-6 py-7 md:grid-cols-[1fr_2fr] md:px-8">
                    <div>
                      <div className="mb-2 text-[10px] tracking-widest text-accent">
                        PEPTIDE
                      </div>
                      <div className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                        {e.peptide}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-base md:text-lg font-medium text-foreground">
                        {e.headline}
                      </div>
                      <p className="mb-3 text-sm text-foreground/65 leading-relaxed">
                        {e.summary}
                      </p>
                      <div className="text-[11px] tracking-wider text-foreground/45">
                        {e.note}
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={400}>
              <p className="mt-10 max-w-2xl text-xs text-foreground/45 leading-relaxed">
                Summaries above are condensed for clarity. Full citations and
                methodology notes available on request during your clinical
                review — and your physician will discuss the specific evidence
                base for your protocol before signing.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ============ LAB STRIP — editorial image triplet ============ */}
        <section className="relative px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-3 md:grid-cols-3 md:gap-5">
              {[
                { src: '/images/11.jpg', caption: 'PIPETTE · LOT TESTING' },
                { src: '/images/13.jpg', caption: 'SOLUTION · MICROSCOPY' },
                { src: '/images/14.jpg', caption: 'COMPOUND · SUSPENSION' },
              ].map((img, i) => (
                <FadeIn key={img.src} delay={i * 100}>
                  <figure className="group relative overflow-hidden rounded-3xl border border-line bg-surface">
                    <div className="relative aspect-[4/5] md:aspect-[3/4]">
                      <Image
                        src={img.src}
                        alt={img.caption}
                        fill
                        sizes="(max-width: 768px) 90vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/80 via-background/20 to-transparent"
                      />
                      <figcaption className="absolute bottom-4 left-4 text-[10px] tracking-widest text-foreground/75">
                        {img.caption}
                      </figcaption>
                    </div>
                  </figure>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============ STANDARDS ============ */}
        <section className="relative px-6 py-24 md:py-32 bg-surface overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-0 h-[40vh] w-[40vh] -translate-y-1/2 translate-x-1/3 rounded-full bg-accent/[0.06] blur-[100px]"
          />
          <div className="relative mx-auto max-w-6xl">
            <div className="mb-16 max-w-3xl">
              <FadeIn>
                <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                  04 / STANDARDS
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
                  The pharmacy is the product.
                </h2>
              </FadeIn>
              <FadeIn delay={200}>
                <p className="text-foreground/65 leading-relaxed">
                  The peptide market is full of gray-market sources. We refuse
                  to play that game. Every vial we ship is compounded in a
                  U.S.-licensed pharmacy, third-party tested, and shipped under
                  cold chain.
                </p>
              </FadeIn>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {STANDARDS.map((s, i) => (
                <FadeIn key={s.label} delay={i * 90}>
                  <div className="h-full rounded-2xl border border-line bg-background p-6">
                    <div className="mb-3 inline-flex items-center gap-2 text-accent">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <h3 className="mb-2 text-base font-semibold tracking-tight text-foreground">
                      {s.label}
                    </h3>
                    <p className="text-sm text-foreground/65 leading-relaxed">
                      {s.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============ PRINCIPLES ============ */}
        <section className="relative px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 max-w-3xl">
              <FadeIn>
                <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                  05 / PRINCIPLES
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
                  How we dose.
                </h2>
              </FadeIn>
              <FadeIn delay={200}>
                <p className="text-foreground/65 leading-relaxed">
                  A protocol is more than a vial. It&apos;s a sequence — when
                  you take it, how the dose evolves, when to pause, what to
                  check. These four rules underwrite every plan we sign.
                </p>
              </FadeIn>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {PRINCIPLES.map((p, i) => (
                <FadeIn key={p.title} delay={i * 100}>
                  <div className="h-full rounded-3xl border border-line bg-surface p-7 md:p-8">
                    <h3 className="mb-3 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      {p.title}
                    </h3>
                    <p className="text-foreground/65 leading-relaxed">
                      {p.body}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FOOT CTA — ambient video bg ============ */}
        <section className="relative px-6 py-24 md:py-32 bg-surface overflow-hidden">
          {/* Background video, dimmed */}
          <LoopVideo
            src="/videos/4.mp4"
            className="absolute inset-0 w-full h-full"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-background/70"
          />
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
                Built carefully. Reviewed clinically. Signed personally.
              </h2>
            </FadeIn>
            <FadeIn delay={150}>
              <p className="mb-10 text-foreground/65 leading-relaxed">
                If a protocol is right for you, your physician will tell you.
                If it isn&apos;t, they&apos;ll tell you that too. Either way,
                you start with a real assessment — not a checkout.
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
