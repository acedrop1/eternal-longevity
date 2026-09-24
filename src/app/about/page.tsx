import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { Physician } from '@/components/sections/Physician';
import { BUSINESS_ADDRESS, BUSINESS_LEGAL_NAME, SERVICE_AREA } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why Eternal Longevity exists, who built it, and the principles behind every protocol we ship.',
};

const H1 = { fontSize: 'clamp(2.4rem, 3.4vw + 1rem, 4.5rem)', fontStretch: '75%', lineHeight: 1 } as const;
const H2 = { fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 } as const;
const H3 = { fontSize: '1.5rem', fontStretch: '75%', lineHeight: 1.1 } as const;

const NUMBERS = [
  { stat: '1', label: 'Prescriber, who signs every order' },
  { stat: '4', label: 'States we serve: NJ, NY, PA and MI' },
  { stat: '503A', label: 'Licensed compounding pharmacy' },
  { stat: '18+', label: 'Minimum age to order' },
];

const VALUES = [
  {
    title: 'Conservative by default',
    body: 'In a category that rewards louder claims, we lean the other way. Doses start low, and the physician decides whether to prescribe at all. We would rather under-promise.',
  },
  {
    title: 'Transparency over polish',
    body: "We publish what we know, and what we don't. If a peptide has thin human data, we say so. If we're unsure, we hold it back.",
  },
  {
    title: 'Formulation is the product',
    body: "Every preparation is compounded by a licensed 503A pharmacy against a prescription written for one person, and released against a certificate of analysis for purity and potency. That testing is the pharmacy's own; we share your lot's certificate on request.",
  },
  {
    title: 'Long horizon, slow medicine',
    body: 'We don’t do crash protocols. Refills ship on the same prescription until it expires, on a schedule you can change, pause or cancel, with the prescriber reachable throughout.',
  },
];

const RECORD = [
  { k: 'Business', v: `${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}` },
  { k: 'Prescriber of record', v: 'Dr. Bader Elder, DO · NJ license 25MB11925900' },
  { k: 'Pharmacy', v: 'A U.S.-licensed 503A compounding pharmacy, under state board oversight' },
  { k: 'Who we serve', v: `${SERVICE_AREA} residents, 18 and older` },
  { k: 'Prescription', v: 'Required. You are charged only if the physician approves.' },
];

const link =
  'font-mono text-[13px] underline underline-offset-[3px] decoration-black/50 transition-colors hover:decoration-black';

export default function AboutPage() {
  return (
    <>
      <Header categoryStrip />
      <main>
        {/* Hero. Top padding clears the fixed header + product strip (126 / 134px). */}
        <section className="bg-white px-5 pb-16 pt-[158px] text-black md:px-8 md:pb-24 md:pt-[182px]">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
              <div>
                <h1 className="font-display font-normal [text-wrap:balance]" style={H1}>
                  Peptides deserved a better front door.
                </h1>
                <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-black/70">
                  Not gray-market vials shipped from somewhere unmarked. Not a wellness brand with a checkout button. A
                  physician who reads every intake, and a licensed 503A pharmacy behind every order.
                </p>
                <Link
                  href="/start"
                  className="mt-8 inline-block rounded-full bg-black px-4 py-2.5 font-mono text-[13px] text-white transition-colors hover:bg-black/85"
                >
                  Start your assessment
                </Link>
              </div>

              <div className="relative aspect-[4/5] overflow-hidden rounded-[4px] bg-neutral-200 lg:aspect-[3/4]">
                <Image
                  src="/images/10.jpg"
                  alt="Peptide vial detail"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  className="object-cover"
                />
              </div>
            </div>

            <ul className="mt-14 grid grid-cols-2 gap-x-6 md:mt-20 md:grid-cols-4">
              {NUMBERS.map((n) => (
                <li key={n.label} className="border-t border-black/15 pb-6 pt-5">
                  <p className="font-display" style={{ ...H2, fontSize: 'clamp(2rem, 2vw + 1rem, 3rem)' }}>
                    {n.stat}
                  </p>
                  <p className="mt-2 text-[15px] leading-snug text-black/70">{n.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Thesis */}
        <section className="bg-black px-5 py-16 text-white md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-display font-normal [text-wrap:balance]" style={H2}>
                The middle was missing.
              </h2>
              <div className="mt-6 max-w-xl space-y-4 text-[16px] leading-relaxed text-white/70">
                <p>
                  Look at the peptide landscape and you find two extremes. On one side, clinics priced for people with a
                  private banker.
                </p>
                <p>
                  On the other, the underground: pseudonymous suppliers, no testing, no paper trail. The people who most
                  wanted quality were getting it the worst.
                </p>
                <p>
                  Eternal Longevity is built for that gap. A licensed pharmacy. A named prescriber. Prices published
                  before you start.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-neutral-800 lg:aspect-[5/6]">
              <Image src="/images/13.jpg" alt="Compound in solution" fill sizes="(max-width: 1024px) 90vw, 45vw" className="object-cover" />
              <p className="absolute inset-x-4 bottom-4 rounded-[2px] bg-black/70 px-4 py-3.5 text-[15px] leading-relaxed text-white ring-1 ring-white/10 backdrop-blur-xl md:inset-x-5 md:bottom-5">
                A licensed pharmacy and a physician who puts his name on every prescription. That&rsquo;s the whole point.
              </p>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="bg-[#F2F2F0] px-5 py-16 text-black md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-10 font-display font-normal [text-wrap:balance] md:mb-14" style={H2}>
              What we will and won&rsquo;t do.
            </h2>
            <div className="grid gap-x-12 md:grid-cols-2">
              {VALUES.map((v) => (
                <div key={v.title} className="border-t border-black/15 pb-10 pt-5">
                  <h3 className="font-display font-normal [text-wrap:balance]" style={H3}>
                    {v.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-black/70">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Physician />

        {/* Time horizon */}
        <section className="bg-black px-5 py-16 text-white md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <p
              className="max-w-5xl font-display [text-wrap:balance]"
              style={{ fontSize: 'clamp(1.6rem, 2vw + 1rem, 3rem)', fontStretch: '75%', lineHeight: 1.1 }}
            >
              We build for the next twenty years, not the next twenty weeks. That shift in time horizon changes every
              decision: how we dose, how we measure, how we say no.
            </p>
          </div>
        </section>

        {/* For the record */}
        <section className="bg-[#F2F2F0] px-5 py-16 text-black md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <h2 className="font-display font-normal [text-wrap:balance]" style={H2}>
                For the record.
              </h2>
              <div className="mt-6 flex flex-col items-start gap-3">
                <Link href="/compliance" className={link}>
                  How we operate
                </Link>
                <Link href="/legal/compounded-medication" className={link}>
                  About compounded medication
                </Link>
              </div>
            </div>
            <dl className="border-t border-black/15">
              {RECORD.map((r) => (
                <div key={r.k} className="grid gap-1 border-b border-black/15 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,5fr)] md:gap-6">
                  <dt className="font-mono text-[13px] text-black/55">{r.k}</dt>
                  <dd className="text-[16px] leading-relaxed">{r.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white px-5 py-16 text-black md:px-8 md:py-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-[4px] bg-black px-6 py-10 text-white md:flex-row md:items-end md:justify-between md:px-10 md:py-14">
            <div>
              <h2 className="max-w-2xl font-display font-normal [text-wrap:balance]" style={H2}>
                If our standards match yours, start your assessment.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/70">
                About three minutes. Answer a few questions, and a physician decides whether to prescribe. If he
                doesn&rsquo;t, you aren&rsquo;t charged. Prescription required. {SERVICE_AREA} residents, 18+.
              </p>
            </div>
            <Link
              href="/start"
              className="shrink-0 self-start rounded-full bg-white px-4 py-2.5 font-mono text-[13px] text-black transition-colors hover:bg-white/85 md:self-auto"
            >
              Start your assessment
            </Link>
          </div>
        </section>
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}
