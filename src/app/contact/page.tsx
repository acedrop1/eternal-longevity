import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';
import { ContactForm } from '@/components/contact/ContactForm';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_HOURS,
  STATEMENT_DESCRIPTOR,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with our team. We answer everything within one business day.',
};


const CONTACT_ROWS = [
  {
    eyebrow: 'SUPPORT',
    title: SUPPORT_EMAIL,
    body: 'Orders, protocols, billing, press and partnerships. Replies within one business day.',
  },
  // Only rendered when a real number is configured — see SUPPORT_PHONE.
  ...(SUPPORT_PHONE
    ? [
        {
          eyebrow: 'PHONE',
          title: SUPPORT_PHONE,
          body: `Speak to our team ${SUPPORT_HOURS}. For billing questions, have your order number ready.`,
        },
      ]
    : []),
  {
    eyebrow: 'MAILING ADDRESS',
    title: BUSINESS_LEGAL_NAME,
    body: BUSINESS_ADDRESS,
  },
  {
    eyebrow: 'ON YOUR STATEMENT',
    title: STATEMENT_DESCRIPTOR,
    body: 'Charges from us appear under this name. No medication name ever appears on your statement.',
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="relative bg-background">
        {/* ============ HERO ============ */}
        <section className="relative px-6 pt-20 pb-16 md:pt-24 md:pb-16 overflow-hidden">
          <div
            aria-hidden
            className="hidden md:block pointer-events-none absolute -top-1/4 left-1/2 h-[40vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
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
        <section className="relative px-6 pb-16 md:pb-20">
          <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
            {/* === FORM === */}
            <FadeIn>
              <ContactForm />
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
                    Support team responses happen during business hours. We&apos;ll
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
