import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { getPrescriber } from '@/lib/prescriber';
import type { PrescriberRecord } from '@/lib/prescriberTypes';
import { SERVICEABLE_STATES } from '@/lib/intakeSchema';
import { LegitScriptSeal } from '@/components/ui/LegitScriptSeal';

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

/*
 * The prescriber's three lines come from his profile row rather than from
 * literals here. They print on prescriptions too, and a page quoting a
 * credential the profile no longer holds is the kind of drift a certifier
 * finds before you do.
 */
function factsFor(p: PrescriberRecord): { label: string; value: string }[] {
  return [
  { label: 'Legal entity', value: 'Eternal Longevity' },
  { label: 'Business address', value: '825 Riverview Dr, Floor 2, Totowa, NJ 07512' },
  { label: 'Support', value: 'support@etlongevity.com' },
  { label: 'Prescriber of record', value: p.display },
  {
    label: 'Prescriber licensure',
    value: p.licenseNumber
      ? `${p.licenseState === 'NJ' ? 'New Jersey' : p.licenseState} · License ${p.licenseNumber}`
      : '—',
  },
  { label: 'NPI', value: p.npi || '—' },
  { label: 'States served', value: SERVICEABLE_STATES.join(', ') },
  { label: 'Minimum age', value: '18+' },
  ];
}

const CONTROLS: { title: string; body: string }[] = [
  {
    title: 'Prescription-based workflow',
    body: 'Nothing ships without review. Every order is screened against a health assessment and reviewed by our licensed prescriber before it is released to the pharmacy. Orders that fail the safety screen are declined, not filled.',
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

export default async function CompliancePage() {
  const FACTS = factsFor(await getPrescriber());

  return (
    <>
      <Header categoryStrip />
      <main>
        {/* Top padding clears the fixed header + product strip (126 / 134px). */}
        <section className="bg-white px-5 pb-16 pt-[158px] text-black md:px-8 md:pb-24 md:pt-[182px]">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <div>
              <h1
                className="font-display font-normal [text-wrap:balance]"
                style={{ fontSize: 'clamp(2.4rem, 3.4vw + 1rem, 4.5rem)', fontStretch: '75%', lineHeight: 1 }}
              >
                How we operate.
              </h1>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-black/70">
                Who we are, who prescribes, who compounds, and the limits we
                hold ourselves to. Everything on this page can be evidenced with
                a document on request.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                <LegitScriptSeal className="shrink-0" />
                <p className="max-w-xs text-[14px] leading-relaxed text-black/70">
                  LegitScript certified. Select the seal to verify our certification on LegitScript.com.
                </p>
              </div>
            </div>

            {/* Business facts */}
            <dl className="border-t border-black/15">
              {FACTS.map((f) => (
                <div
                  key={f.label}
                  className="border-b border-black/15 py-4 sm:grid sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6"
                >
                  <dt className="font-mono text-[13px] text-black/55 sm:pt-0.5">{f.label}</dt>
                  <dd className="mt-1 break-words text-[16px] text-black sm:mt-0">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Controls */}
        <section className="bg-[#F2F2F0] px-5 py-16 text-black md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <h2
              className="mb-10 font-display font-normal [text-wrap:balance] md:mb-14"
              style={{ fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 }}
            >
              Controls we operate under
            </h2>
            <div className="grid gap-x-12 md:grid-cols-2">
              {CONTROLS.map((c) => (
                <div key={c.title} className="border-t border-black/15 pb-10 pt-5">
                  <h3
                    className="font-display font-normal [text-wrap:balance]"
                    style={{ fontSize: '1.5rem', fontStretch: '75%', lineHeight: 1.1 }}
                  >
                    {c.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-black/70">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COAs */}
        <section className="bg-white px-5 py-16 text-black md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl rounded-[4px] bg-black p-6 text-white md:p-12">
            <p className="font-mono text-[13px] text-white/60">Certificates of analysis</p>
            <h2
              className="mt-4 max-w-3xl font-display font-normal [text-wrap:balance]"
              style={{ fontSize: 'clamp(2rem, 2vw + 1rem, 3rem)', fontStretch: '75%', lineHeight: 1.05 }}
            >
              Every lot is tested, and you can see the paperwork.
            </h2>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-white/70">
              Our compounding partner tests each lot for identity, purity and
              sterility. Certificates of analysis are available on request for
              the lot you received — email us with your order number and we will
              send the COA for that batch.
            </p>
            <Link
              href="mailto:support@etlongevity.com?subject=Certificate%20of%20Analysis%20request"
              className="mt-8 inline-block rounded-full bg-white px-5 py-3 font-mono text-[14px] text-black transition-colors hover:bg-white/85"
            >
              Request a COA
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
