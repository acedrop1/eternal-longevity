import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = pageMeta(
  '/legal/compounded-medication',
  'Compounded Medication Disclosure',
  'What compounded means, why these preparations are not FDA-approved, and what off-label prescribing is.',
);

export default function CompoundedMedicationPage() {
  return (
    <LegalLayout
      title="Compounded Medication Disclosure"
      effective="September 2026"
      lead={`Every medication we offer is compounded: prepared by a licensed pharmacist for one named patient, against a prescription written for that patient. Compounded preparations are regulated differently from the drugs you buy at a retail pharmacy, and the differences are real. This page states them plainly rather than burying them.`}
      sections={[
        {
          heading: `What Compounding Is`,
          paragraphs: [
            `Compounding is the preparation of a medication by a licensed pharmacist to meet the needs of an individual patient, pursuant to a valid prescription written for that patient by a licensed prescriber. Nothing is made in advance and nothing is pulled off a shelf.`,
            `Our preparations are made under section 503A of the Federal Food, Drug and Cosmetic Act by a state-licensed 503A compounding pharmacy (named on your prescription label), which is licensed and inspected by its state board of pharmacy.`,
          ],
        },
        {
          heading: `Not FDA-Approved`,
          paragraphs: [
            `Rx only. Compounded medications are not FDA-approved; the FDA does not verify their safety, effectiveness or quality. This is true of every compounding pharmacy in the United States, not only ours.`,
            `Some compounded preparations contain ingredients that are also found in FDA-approved drugs. That does not make the compounded preparation itself FDA-approved.`,
          ],
        },
        {
          heading: `Quality and Testing`,
          paragraphs: [
            `Compounded preparations do not go through the same manufacturing controls, stability testing, or quality assurance as a commercially manufactured FDA-approved drug. Product characteristics and individual outcomes can vary between lots and between people.`,
            `Each batch is tested by the pharmacy as required for its preparation type, and a certificate of analysis for the lot your order came from is available on request.`,
          ],
        },
        {
          heading: `Off-Label Use`,
          paragraphs: [
            `Several of the medications we offer are prescribed off-label — for a use, dose, or population the FDA has not specifically approved. Off-label prescribing is legal and routine in United States medical practice when it is supported by a prescriber’s clinical judgement.`,
            `It also means the evidence base for a given use may be thinner than for an approved indication. Ask your prescriber what is known and what is not before you start.`,
          ],
        },
        {
          heading: `Beyond-Use Date`,
          paragraphs: [
            `A compounded preparation carries a beyond-use date rather than a manufacturer expiry. The pharmacy dates each supply and prints the date on the label; it varies by preparation. Do not use a medication past that date.`,
          ],
        },
        {
          heading: `Talk to Your Prescriber`,
          paragraphs: [
            `If you are unsure whether a compounded preparation is right for you, raise it with the prescriber reviewing your intake before you start. You can message them from your member portal at any time.`,
          ],
        },
        {
          heading: `Contact`,
          paragraphs: [
            `Questions? Email ${SUPPORT_EMAIL}, or write to ${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}.`,
          ],
        },
      ]}
      related={[
        { label: 'Prescription Policy', href: '/legal/prescription-policy' },
        { label: 'Adverse Event Reporting', href: '/legal/adverse-events' },
        { label: 'Pharmacy Fulfillment', href: '/legal/pharmacy-fulfillment' },
      ]}
    />
  );
}
