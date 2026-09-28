import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { getPrescriber, PRESCRIBER_FALLBACK } from '@/lib/prescriber';
import type { PrescriberRecord } from '@/lib/prescriberTypes';
import { SERVICEABLE_STATES } from '@/lib/intakeSchema';
import { LegitScriptSeal } from '@/components/ui/LegitScriptSeal';
import {
  BUSINESS_ADDRESS,
  BUSINESS_LEGAL_NAME,
  SERVICE_AREA,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from '@/lib/site';
import { ArrowDot, Aura, GLASS } from '@/components/home/HomeSections';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Compliance',
  description:
    'How Eternal Longevity operates: licensed prescriber, MedShiftRx 503A compounding pharmacy, age and state restrictions, and certificates of analysis.',
};

/**
 * Public compliance page.
 *
 * Payment processors and their underwriters look for this: who the merchant
 * is, where it can legally sell, who prescribes, who compounds, and how
 * product quality is evidenced. Everything here must be verifiable — do not
 * add a claim to this page that cannot be backed with a document.
 */

/*
 * The prescriber's three lines come from his profile row rather than from
 * literals here. They print on prescriptions too, and a page quoting a
 * credential the profile no longer holds is the kind of drift a certifier
 * finds before you do.
 */
function factsFor(p: PrescriberRecord): { label: string; value: string }[] {
  return [
  { label: 'Legal entity', value: BUSINESS_LEGAL_NAME },
  { label: 'Business address', value: BUSINESS_ADDRESS },
  { label: 'Support', value: SUPPORT_EMAIL },
  ...(SUPPORT_PHONE ? [{ label: 'Phone', value: SUPPORT_PHONE }] : []),
  { label: 'Prescriber of record', value: p.name ? p.display : PRESCRIBER_FALLBACK.display },
  {
    label: 'Prescriber licensure',
    value: `Licensed in ${SERVICE_AREA}`,
  },
  { label: 'NPI', value: p.npi || '—' },
  {
    label: 'Dispensing pharmacy',
    value: 'MedShiftRx, a state-licensed 503A compounding pharmacy that dispenses and ships prescriptions',
  },
  { label: 'States served', value: SERVICEABLE_STATES.join(', ') },
  { label: 'Minimum age', value: '18+' },
  ];
}

const CONTROLS: { title: string; body: string }[] = [
  {
    title: 'Prescription-based workflow',
    body: 'Nothing ships without a prescription. A new treatment is screened against a health assessment and reviewed by our licensed prescriber before anything is sent to the pharmacy; he may decline or ask questions first. Refills ship on that same prescription until it expires or runs out of refills, and the prescriber can pause or stop a plan at any time.',
  },
  {
    title: 'State restriction',
    body: `Medicine is practiced where the patient is located, so we serve only states where a licensed prescriber can treat you and our pharmacy can dispense — currently ${SERVICEABLE_STATES.join(', ')}. Shipping addresses outside that footprint are rejected at checkout and again on the server.`,
  },
  {
    title: 'Age restriction',
    body: 'Members must be 18 or older. Anyone reporting an age under 18 during the assessment is stopped before an order can be placed.',
  },
  {
    title: 'Licensed fulfilment',
    body: 'We do not hold or ship inventory. Prescriptions are dispensed by MedShiftRx, a state-licensed 503A compounding pharmacy, and shipped directly to the patient. Temperature-sensitive medications ship cold-chain.',
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

export default async function CompliancePage() {
  const FACTS = factsFor(await getPrescriber());

  return (
    <>
      <Header categoryStrip />
      <main className="bg-white">
        <section className="px-5 pb-16 pt-44 md:px-10 md:pb-24 md:pt-52">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <h1 className="text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[80px]">
                How we operate.
              </h1>
              <p className="mt-6 max-w-[460px] text-[16px] leading-relaxed text-ink-soft">
                Who we are, who prescribes, who compounds, and the limits we
                hold ourselves to. Everything on this page can be evidenced with
                a document on request.
              </p>
              <div className="mt-8 flex w-fit flex-col items-start gap-4 rounded-shell bg-milk p-4 pr-6 sm:flex-row sm:items-center">
                <LegitScriptSeal className="shrink-0" />
                <p className="max-w-[260px] text-[14px] leading-relaxed text-ink-soft">
                  LegitScript certified. Select the seal to verify our certification on LegitScript.com.
                </p>
              </div>
            </div>

            {/* Business facts */}
            <dl className="rounded-shell bg-milk px-5 md:px-8">
              {FACTS.map((f) => (
                <div
                  key={f.label}
                  className="border-b border-ink/10 py-4 last:border-b-0 sm:grid sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6 md:py-5"
                >
                  <dt className="text-[13px] font-medium text-ink/55 sm:pt-0.5">{f.label}</dt>
                  <dd className="mt-1 break-words text-[16px] text-ink sm:mt-0">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Controls */}
        <section className="px-3 md:px-5">
          <div className="relative overflow-hidden rounded-shell bg-milk px-5 py-16 md:px-10 md:py-24">
            <Aura mix="sunrise" className="opacity-80" />
            <div className="relative">
              <h2 className="mb-10 text-[36px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:mb-14 md:text-[56px]">
                Controls we operate under
              </h2>
              <div className="grid gap-3 md:grid-cols-2 md:gap-5">
                {CONTROLS.map((c) => (
                  <div key={c.title} className={cn('rounded-shell p-6 md:p-8', GLASS)}>
                    <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-ink [text-wrap:balance] md:text-[26px]">
                      {c.title}
                    </h3>
                    <p className="mt-3 max-w-[560px] text-[15px] leading-relaxed text-ink-soft">
                      {c.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* COAs */}
        <section className="px-3 pb-3 pt-16 md:px-5 md:pb-5 md:pt-24">
          <div className="relative overflow-hidden rounded-shell bg-butter-soft px-5 py-12 md:px-12 md:py-20">
            <Aura mix="bloom" className="opacity-70" />
            <div className="relative">
              <p className="text-[13px] font-medium text-ink/55">Certificates of analysis</p>
              <h2 className="mt-4 max-w-[860px] text-[36px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]">
                Batch testing, with the paperwork on request.
              </h2>
              <p className="mt-5 max-w-[620px] text-[16px] leading-relaxed text-ink-soft">
                Each batch is tested by the pharmacy as required for its
                preparation type. Certificates of analysis are available on
                request for the lot you received — email us with your order
                number and we will send the COA for that batch.
              </p>
              <Link
                href={`mailto:${SUPPORT_EMAIL}?subject=Certificate%20of%20Analysis%20request`}
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-6 pr-2 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Request a COA
                <ArrowDot className="bg-butter ring-0" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
