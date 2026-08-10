import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';
import { SERVICEABLE_STATES } from '@/lib/intakeSchema';

export const metadata: Metadata = {
  title: 'Compliance',
  description:
    'How Eternal Longevity operates: licensed prescriber, 503A compounding pharmacy, age and state restrictions, and certificates of analysis.',
};

/**
 * Public compliance page.
 *
 * Payment processors and their underwriters look for this: who the merchant
 * is, where it can legally sell, who prescribes, who compounds, and how
 * product quality is evidenced. Everything here must be verifiable — do not
 * add a claim to this page that cannot be backed with a document.
 */

const FACTS: { label: string; value: string }[] = [
  { label: 'Legal entity', value: 'Eternal Longevity' },
  { label: 'Business address', value: '825 Riverview Dr, Floor 2, Totowa, NJ 07512' },
  { label: 'Support', value: 'support@etlongevity.com' },
  { label: 'Prescriber of record', value: 'Bader Elder, MD' },
  { label: 'Prescriber licensure', value: 'New Jersey · License 25MB11925900' },
  { label: 'NPI', value: '1619538881' },
  { label: 'Compounding partner', value: 'Kaduceus Pharmacy, a licensed 503A compounder' },
  { label: 'States served', value: SERVICEABLE_STATES.join(', ') },
  { label: 'Minimum age', value: '18+' },
];

const CONTROLS: { title: string; body: string }[] = [
  {
    title: 'Prescription-based workflow',
    body: 'Nothing ships without review. Every order is screened against a health assessment and reviewed by our licensed prescriber before it is released to the pharmacy. Orders that fail the safety screen are declined, not filled.',
  },
  {
    title: 'State restriction',
    body: `Medicine is practiced where the patient is located, so we serve only states where our prescriber is licensed — currently ${SERVICEABLE_STATES.join(', ')}. Shipping addresses outside that footprint are rejected at checkout and again on the server.`,
  },
  {
    title: 'Age restriction',
    body: 'Members must be 18 or older. Anyone reporting an age under 18 during the assessment is stopped before an order can be placed.',
  },
  {
    title: 'Licensed fulfilment',
    body: 'We do not hold or ship inventory. Orders are dispensed by a U.S.-licensed 503A compounding pharmacy operating under state board oversight, and shipped cold-chain directly to the patient.',
  },
  {
    title: 'Direct seller',
    body: 'Eternal Longevity is the direct seller of everything listed. We are not a marketplace, we do not host third-party sellers, and we do not distribute user-generated content.',
  },
  {
    title: 'Claims and messaging',
    body: 'We do not promise cures, guaranteed results, or outcomes that are not supported by evidence. Product pages state possible side effects and contraindications alongside benefits, and individual results vary.',
  },
];

export default function CompliancePage() {
  return (
    <>
      <Header />
      <main className="bg-background">
        <section className="relative isolate overflow-hidden px-6 pt-32 pb-16 md:pt-40 md:pb-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/3 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-accent/[0.08] blur-[120px]"
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <FadeIn>
              <p className="mb-4 text-[11px] tracking-widest text-accent">COMPLIANCE</p>
            </FadeIn>
            <FadeIn delay={100}>
              <h1
                className="font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.02,
                }}
              >
                How we operate.
              </h1>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="mx-auto mt-5 max-w-2xl text-foreground/65 leading-relaxed">
                Who we are, who prescribes, who compounds, and the limits we
                hold ourselves to. Everything on this page can be evidenced with
                a document on request.
              </p>
            </FadeIn>
          </div>
        </section>

        {/* Business facts */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-3xl border border-line bg-surface">
              {FACTS.map((f, i) => (
                <div
                  key={f.label}
                  className={`flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
                    i > 0 ? 'border-t border-line' : ''
                  }`}
                >
                  <span className="text-[11px] tracking-widest text-foreground/50">
                    {f.label.toUpperCase()}
                  </span>
                  <span className="text-sm text-foreground/90 sm:text-right">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
              Controls we operate under
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {CONTROLS.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-line bg-surface p-5 md:p-6"
                >
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {c.title}
                  </h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COAs */}
        <section className="px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-4xl rounded-3xl border border-accent/25 bg-accent/[0.04] p-6 md:p-10">
            <p className="mb-2 text-[11px] tracking-widest text-accent">
              CERTIFICATES OF ANALYSIS
            </p>
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
              Every lot is tested, and you can see the paperwork.
            </h2>
            <p className="mb-6 max-w-2xl text-sm text-foreground/70 leading-relaxed">
              Our compounding partner tests each lot for identity, purity and
              sterility. Certificates of analysis are available on request for
              the lot you received — email us with your order number and we will
              send the COA for that batch.
            </p>
            <Link
              href="mailto:support@etlongevity.com?subject=Certificate%20of%20Analysis%20request"
              className="pill bg-accent text-black px-6 py-2.5 text-sm font-semibold hover:brightness-110 transition"
            >
              Request a COA
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
