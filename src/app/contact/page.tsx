import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';

export const metadata: Metadata = {
  title: 'Contact | Eternal Longevity',
  description: 'Get in touch with our care team. We answer everything within one business day.',
};

const TOPICS = [
  { value: 'clinical', label: 'Clinical question (existing member)' },
  { value: 'product', label: 'Question about a protocol' },
  { value: 'eligibility', label: 'Eligibility / state availability' },
  { value: 'billing', label: 'Billing or order issue' },
  { value: 'press', label: 'Press / partnerships' },
  { value: 'other', label: 'Something else' },
];

const CONTACT_ROWS = [
  {
    eyebrow: 'GENERAL',
    title: 'hello@eternallongevity.com',
    body: 'Replies within one business day.',
  },
  {
    eyebrow: 'CLINICAL CARE',
    title: 'care@eternallongevity.com',
    body: 'Member medical questions. Same-day callback available for urgent matters.',
  },
  {
    eyebrow: 'PRESS',
    title: 'press@eternallongevity.com',
    body: 'Media requests, partnerships, interviews.',
  },
  {
    eyebrow: 'MAILING ADDRESS',
    title: 'Eternal Longevity, Inc.',
    body: 'Suite 2200, Hoboken, NJ 07030',
  },
];

export default function ContactPage() {
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
                01 / CONTACT
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
                Talk to us.
              </h1>
            </FadeIn>
            <FadeIn delay={240}>
              <p className="mx-auto max-w-2xl text-lg text-foreground/65 leading-relaxed">
                Most answers are already in our{' '}
                <Link href="/faq" className="text-accent hover:text-accent-soft">
                  FAQ
                </Link>
                . For anything we missed, drop us a line below and a real human
                will reply within one business day.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ============ FORM + INFO ============ */}
        <section className="relative px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
            {/* === FORM === */}
            <FadeIn>
              <form className="rounded-3xl border border-line bg-surface p-7 md:p-10 space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-[11px] tracking-wider text-foreground/60"
                    >
                      FULL NAME
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="Jane Doe"
                      autoComplete="name"
                      className="w-full rounded-2xl border border-line bg-background px-4 py-3.5 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-1.5 block text-[11px] tracking-wider text-foreground/60"
                    >
                      EMAIL
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full rounded-2xl border border-line bg-background px-4 py-3.5 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="topic"
                    className="mb-1.5 block text-[11px] tracking-wider text-foreground/60"
                  >
                    TOPIC
                  </label>
                  <select
                    id="topic"
                    className="w-full appearance-none rounded-2xl border border-line bg-background px-4 py-3.5 text-base text-foreground transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Pick what fits best…
                    </option>
                    {TOPICS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-1.5 block text-[11px] tracking-wider text-foreground/60"
                  >
                    MESSAGE
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    placeholder="Tell us what's on your mind…"
                    className="w-full resize-none rounded-2xl border border-line bg-background px-4 py-3.5 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <p className="text-[11px] text-foreground/45 leading-relaxed">
                    Please don&apos;t share urgent medical concerns here. Call 911
                    or go to the nearest ER first.
                  </p>
                  <button
                    type="submit"
                    className="rounded-full bg-accent text-black font-semibold px-7 py-3 text-base hover:bg-accent-soft transition-colors whitespace-nowrap"
                  >
                    Send message →
                  </button>
                </div>
              </form>
            </FadeIn>

            {/* === INFO === */}
            <div className="space-y-3">
              {CONTACT_ROWS.map((row, i) => (
                <FadeIn key={row.eyebrow} delay={i * 80}>
                  <div className="rounded-3xl border border-line bg-surface p-6">
                    <div className="mb-2 text-[10px] tracking-widest text-accent">
                      {row.eyebrow}
                    </div>
                    <div className="mb-1 text-base font-semibold tracking-tight text-foreground">
                      {row.title}
                    </div>
                    <p className="text-sm text-foreground/65 leading-relaxed">
                      {row.body}
                    </p>
                  </div>
                </FadeIn>
              ))}

              <FadeIn delay={400}>
                <div className="rounded-3xl border border-accent/40 bg-accent/5 p-6">
                  <div className="mb-2 text-[10px] tracking-widest text-accent">
                    HOURS
                  </div>
                  <div className="mb-1 text-base font-semibold tracking-tight text-foreground">
                    Mon – Fri · 9a – 6p ET
                  </div>
                  <p className="text-sm text-foreground/65 leading-relaxed">
                    Care team responses happen during business hours. We&apos;ll
                    triage urgent items first.
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
