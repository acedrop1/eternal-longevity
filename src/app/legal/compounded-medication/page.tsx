import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Compounded Medication Disclosure',
  description: 'What compounded means, why these preparations are not FDA-approved, and what off-label prescribing is.',
};

export default function CompoundedMedicationPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Compounded Medication Disclosure"
      effective="September 2026"
      lead={`Everything we dispense is compounded: prepared by a licensed pharmacist for one named patient, against a prescription written for that patient. Compounded preparations are regulated differently from the drugs you buy at a retail pharmacy, and the differences are real. This page states them plainly rather than burying them.`}
      sections={[
        {
          heading: `What Compounding Is`,
          paragraphs: [
            `Compounding is the preparation of a medication by a licensed pharmacist to meet the needs of an individual patient, pursuant to a valid prescription written for that patient by a licensed prescriber. Nothing is made in advance and nothing is pulled off a shelf.`,
            `Our preparations are made under section 503A of the Federal Food, Drug and Cosmetic Act by an FDA-registered 503A pharmacy that is licensed and inspected by its state board of pharmacy.`,
          ],
        },
        {
          heading: `Not FDA-Approved`,
          paragraphs: [
            `Compounded medications are not FDA-approved. The FDA does not review compounded preparations for safety, efficacy, or quality before they are dispensed. This is true of every compounding pharmacy in the United States, not only ours.`,
            `These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease.`,
          ],
        },
        {
          heading: `Quality and Testing`,
          paragraphs: [
            `Compounded preparations do not go through the same manufacturing controls, stability testing, or quality assurance as a commercially manufactured FDA-approved drug. Product characteristics and individual outcomes can vary between lots and between people.`,
            `Our partner pharmacy tests for sterility, potency, purity and endotoxins before releasing a batch, and a certificate of analysis for the lot your order came from is available on request.`,
          ],
        },
        {
          heading: `Off-Label Use`,
          paragraphs: [
            `Several of the peptides we offer are prescribed off-label — for a use, dose, or population the FDA has not specifically approved. Off-label prescribing is legal and routine in United States medical practice when it is supported by a prescriber’s clinical judgement.`,
            `It also means the evidence base for a given use may be thinner than for an approved indication. Ask your prescriber what is known and what is not before you start.`,
          ],
        },
        {
          heading: `Beyond-Use Date`,
          paragraphs: [
            `A compounded preparation carries a beyond-use date rather than a manufacturer expiry. Ours is typically 90 days from the date of compounding and is printed on the vial. Do not use a vial past that date.`,
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
