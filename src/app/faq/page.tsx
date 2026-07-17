import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';
import { LoopVideo } from '@/components/ui/LoopVideo';
import { FAQAccordion } from '@/components/faq/FAQAccordion';

export const metadata: Metadata = {
  title: 'Questions, Answered | Eternal Longevity',
  description:
    'How Eternal Longevity works. Eligibility, protocols, pricing, and safety questions answered.',
};

const QUICK_LINKS = [
  {
    eyebrow: 'NEW HERE?',
    title: 'How it works',
    body:
      'Three-minute profile, a matched protocol, compounded shipment. Three to five days end to end.',
    href: '/protocols',
    cta: 'See the protocols',
  },
  {
    eyebrow: 'READY?',
    title: 'Start your assessment',
    body:
      'Most members complete intake in under three minutes. You hear back within 48 hours.',
    href: '/start',
    cta: 'Begin now',
  },
  {
    eyebrow: 'STILL CURIOUS?',
    title: 'Talk to our team',
    body:
      'Anything not answered below? Our team replies within one business day.',
    href: '/contact',
    cta: 'Send a message',
  },
];

export default function FAQPage() {
  return (
    <>
      <Header />
      <main className="relative bg-background">
        {/* ============ HERO ============ */}
        <section className="relative px-6 pt-28 pb-16 md:pt-40 md:pb-24 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/4 left-1/2 h-[40vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
          />
          <div className="relative mx-auto max-w-5xl text-center">
            <FadeIn>
              <p className="mb-6 text-[11px] tracking-widest text-accent">
                01 / FAQ
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
                Questions, answered.
              </h1>
            </FadeIn>
            <FadeIn delay={240}>
              <p className="mx-auto max-w-2xl text-lg text-foreground/65 leading-relaxed">
                The most common things members ask before, during, and after a
                protocol. If your question isn&apos;t here, send us a note. We
                answer everything that comes in.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ============ ACCORDION ============ */}
        <section className="relative px-6 pb-16 md:pb-24">
          <div className="mx-auto max-w-4xl">
            <FadeIn>
              <FAQAccordion />
            </FadeIn>
          </div>
        </section>

        {/* ============ EDITORIAL DIVIDER. Wide image with caption ============ */}
        <section className="relative px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-7xl">
            <FadeIn>
              <figure className="relative overflow-hidden rounded-3xl border border-line">
                <div className="relative aspect-[21/9] md:aspect-[24/9]">
                  <Image
                    src="/images/9.jpg"
                    alt="Lab moment"
                    fill
                    sizes="(max-width: 1280px) 100vw, 80rem"
                    className="object-cover"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/30 to-transparent"
                  />
                  <figcaption className="absolute inset-y-0 left-0 flex items-center px-8 md:px-16">
                    <div className="max-w-md">
                      <div className="mb-3 text-[10px] tracking-widest text-accent">
                        EVERY VIAL
                      </div>
                      <p className="text-foreground/90 text-lg md:text-2xl font-medium tracking-tight leading-snug">
                        Compounded, tested, cold-shipped. Three steps you
                        don&apos;t have to think about.
                      </p>
                    </div>
                  </figcaption>
                </div>
              </figure>
            </FadeIn>
          </div>
        </section>

        {/* ============ QUICK LINKS ============ */}
        <section className="relative px-6 py-24 md:py-32 bg-surface">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 max-w-3xl">
              <FadeIn>
                <p className="mb-3 text-[11px] tracking-widest text-foreground/50">
                  02 / NEXT STEPS
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
                  Three doors forward.
                </h2>
              </FadeIn>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {QUICK_LINKS.map((q, i) => (
                <FadeIn key={q.title} delay={i * 120}>
                  <Link
                    href={q.href}
                    className="group flex h-full flex-col rounded-3xl border border-line bg-background p-7 md:p-8 transition-all hover:border-accent/40"
                  >
                    <div className="mb-4 text-[10px] tracking-widest text-accent">
                      {q.eyebrow}
                    </div>
                    <h3 className="mb-3 text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      {q.title}
                    </h3>
                    <p className="mb-6 flex-1 text-sm md:text-base text-foreground/65 leading-relaxed">
                      {q.body}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-accent">
                      {q.cta}
                      <span
                        aria-hidden
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FOOT CTA. Ambient video bg ============ */}
        <section className="relative px-6 py-24 md:py-32 overflow-hidden">
          <LoopVideo
            src="/videos/4.mp4"
            className="absolute inset-0 w-full h-full"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-background/75"
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
                The shortest path is to start the assessment.
              </h2>
            </FadeIn>
            <FadeIn delay={150}>
              <p className="mb-10 text-foreground/65 leading-relaxed">
                Three minutes. Answer a few questions and we match you to a
                protocol, compounded and third-party tested, shipped to your door.
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
