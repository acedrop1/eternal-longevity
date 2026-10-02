import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ArrowDot, Aura, GLASS, GLASS_DARK, PhysicianCard } from '@/components/home/HomeSections';
import { pageMeta } from '@/lib/seo';
import { BUSINESS_ADDRESS, BUSINESS_LEGAL_NAME, SERVICE_AREA, SERVICE_AREA_SHORT } from '@/lib/site';
import { cn } from '@/lib/utils';
import { SERVICEABLE_STATES } from '@/lib/intakeSchema';

export const metadata: Metadata = pageMeta(
  '/about',
  'About',
  'Why Eternal Longevity exists, who built it, and the principles behind every treatment we prescribe.',
);

const NUMBERS = [
  { stat: '1', label: 'Prescriber, who makes every prescription decision' },
  { stat: String(SERVICEABLE_STATES.length), label: `States we serve: ${SERVICE_AREA_SHORT}` },
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
    body: "We publish what we know, and what we don't. If the evidence for a treatment is thin, we say so. If we're unsure, we hold it back.",
  },
  {
    title: 'A licensed pharmacy behind every order',
    body: "Every preparation is compounded by a licensed 503A pharmacy against a prescription written for one person. Each batch is tested by the pharmacy as required for its preparation type; we share your lot's certificate of analysis on request.",
  },
  {
    title: 'Long horizon, slow medicine',
    body: 'We don’t chase quick fixes. Refills ship on the same prescription until it expires, on a schedule you can change, pause or cancel, with the prescriber reachable throughout.',
  },
];

const RECORD = [
  { k: 'Business', v: `${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}` },
  { k: 'Prescriber of record', v: `Dr. Bader Elder, DO · licensed in ${SERVICE_AREA_SHORT}` },
  { k: 'Pharmacy', v: 'A state-licensed 503A compounding pharmacy (named on your prescription label)' },
  { k: 'Who we serve', v: `${SERVICE_AREA} residents, 18 and older` },
  { k: 'Prescription', v: 'Required. You are charged only if the physician approves.' },
];

const H2 = 'text-[36px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]';
const link = 'text-[14px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] transition-colors hover:decoration-ink';

export default function AboutPage() {
  return (
    <>
      <Header categoryStrip />
      <main className="bg-white">
        {/* Hero */}
        <section className="px-5 pb-12 pt-44 md:px-10 md:pb-16 md:pt-52">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-16">
            <div className="lg:pb-6">
              <h1 className="text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[80px]">
                Good care, without the waiting room.
              </h1>
              <p className="mt-6 max-w-[560px] text-[16px] leading-relaxed text-ink-soft md:text-[18px]">
                A physician-led telehealth practice for hair, skin, sexual health, hormones and longevity. Every
                prescription decision is made by Dr. Elder, and a licensed 503A pharmacy is behind every order.
              </p>
              <Link
                href="/start"
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-butter py-2 pl-6 pr-2 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Start your assessment
                <ArrowDot className="bg-ink text-white ring-0" />
              </Link>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-shell bg-milk lg:aspect-[5/6]">
              <Image
                src="/brand/hero-home.jpg"
                alt="Eternal Longevity vials on a kitchen counter, for illustration"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-[35%_center]"
              />
              <span className="absolute bottom-4 left-4 rounded-full bg-white/75 px-3 py-1 text-[11px] font-medium text-ink/70 backdrop-blur-md">
                Image for illustration
              </span>
            </div>
          </div>
        </section>

        {/* Numbers */}
        <section className="px-5 pb-16 md:px-10 md:pb-24">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {NUMBERS.map((n) => (
              <li key={n.label} className="flex min-h-[170px] flex-col justify-between gap-6 rounded-shell bg-milk p-6 md:min-h-[210px] md:p-8">
                <p className="text-[44px] font-semibold leading-none tracking-[-0.05em] text-ink md:text-[64px]">{n.stat}</p>
                <p className="text-[14px] leading-snug text-ink-soft md:text-[15px]">{n.label}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Thesis */}
        <section className="px-3 md:px-5">
          <div className="grid items-center gap-8 rounded-shell bg-milk p-3 md:p-4 lg:grid-cols-2 lg:gap-12">
            <div className="px-3 pb-2 pt-8 md:px-8 md:py-12">
              <h2 className={H2}>The middle was missing.</h2>
              <div className="mt-6 max-w-[560px] space-y-4 text-[16px] leading-relaxed text-ink-soft">
                <p>
                  Look at online wellness care and you often find two extremes. On one side, concierge clinics priced
                  for very few people.
                </p>
                <p>
                  On the other, quick-checkout brands where it&rsquo;s hard to tell who the doctor is or where the
                  medication comes from.
                </p>
                <p>
                  Eternal Longevity is built for that gap. A licensed pharmacy. A named prescriber. Prices published
                  before you start.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-shell bg-milk-deep lg:aspect-[5/6]">
              <Image src="/brand/life-telehealth.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              <p className={cn('absolute inset-x-4 bottom-4 rounded-inner px-5 py-4 text-[15px] leading-relaxed md:inset-x-5 md:bottom-5', GLASS_DARK)}>
                A licensed pharmacy and a physician who puts his name on every prescription. That&rsquo;s the whole point.
              </p>
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="relative overflow-hidden px-5 py-16 md:px-10 md:py-24">
          <Aura mix="dusk" className="opacity-70" />
          <div className="relative">
            <h2 className={cn(H2, 'mb-10 md:mb-14')}>What we will and won&rsquo;t do.</h2>
            <div className="grid gap-3 md:grid-cols-2 md:gap-5">
              {VALUES.map((v) => (
                <div key={v.title} className={cn('rounded-shell p-6 md:p-8', GLASS)}>
                  <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-ink [text-wrap:balance] md:text-[26px]">{v.title}</h3>
                  <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-ink-soft">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PhysicianCard />

        {/* Time horizon */}
        <section className="px-3 md:px-5">
          <div className="relative overflow-hidden rounded-shell bg-butter-soft px-6 py-14 md:px-12 md:py-24">
            <Aura mix="bloom" className="opacity-70" />
            <blockquote className="relative max-w-[1100px]">
              <span aria-hidden className="block text-[80px] font-semibold leading-[0.6] tracking-[-0.05em] text-ink/15 md:text-[120px]">
                &ldquo;
              </span>
              <p className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.04em] text-ink [text-wrap:balance] md:text-[48px]">
                We build for the next twenty years, not the next twenty weeks. That shift in time horizon changes every
                decision: how we dose, how we measure, how we say no.
              </p>
            </blockquote>
          </div>
        </section>

        {/* For the record */}
        <section className="px-3 py-16 md:px-5 md:py-24">
          <div className="grid gap-10 rounded-shell bg-milk px-5 py-10 md:px-10 md:py-16 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <h2 className={H2}>For the record.</h2>
              <div className="mt-6 flex flex-col items-start gap-3">
                <Link href="/compliance" className={link}>
                  How we operate
                </Link>
                <Link href="/legal/compounded-medication" className={link}>
                  About compounded medication
                </Link>
              </div>
            </div>
            <dl className="border-t border-ink/10">
              {RECORD.map((r) => (
                <div key={r.k} className="grid gap-1 border-b border-ink/10 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,5fr)] md:gap-6">
                  <dt className="text-[13px] font-medium text-ink/65 md:pt-0.5">{r.k}</dt>
                  <dd className="text-[16px] leading-relaxed text-ink">{r.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="px-3 pb-3 md:px-5 md:pb-5">
          <div className="relative overflow-hidden rounded-shell bg-milk px-5 py-10 md:px-12 md:py-16">
            <Aura mix="sunrise" />
            <div className={cn('relative flex flex-col gap-6 rounded-shell p-6 md:flex-row md:items-end md:justify-between md:p-10', GLASS)}>
              <div>
                <h2 className={cn(H2, 'max-w-[760px]')}>If our standards match yours, start your assessment.</h2>
                <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-ink-soft">
                  About three minutes. Answer a few questions, and a physician decides whether to prescribe. If he
                  doesn&rsquo;t, you aren&rsquo;t charged. Prescription required. {SERVICE_AREA} residents, 18+.
                </p>
              </div>
              <Link
                href="/start"
                className="group flex w-fit shrink-0 items-center gap-2 rounded-full bg-butter py-2 pl-6 pr-2 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Start your assessment
                <ArrowDot className="bg-ink text-white ring-0" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
