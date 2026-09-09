import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Pharmacy Fulfillment | Eternal Longevity',
  description: 'Which pharmacy fills your prescription, how it is regulated, and how to verify its licence yourself.',
};

export default function PharmacyFulfillmentPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Pharmacy Fulfillment"
      effective="September 2026"
      lead={`You should be able to check who made your medication without taking our word for it. This page names the pharmacy, explains the rules it operates under, and tells you how to verify its licence in about a minute.`}
      sections={[
        {
          heading: `Who Fills Your Prescription`,
          paragraphs: [
            `Prescriptions are dispensed by an independently owned, FDA-registered 503A compounding pharmacy under contract with us. The dispensing pharmacy’s name and address appear on your medication label and on the paperwork in your package.`,
            `We are not a pharmacy. We do not compound, hold, or handle medication at any point — it travels from the pharmacy to you.`,
          ],
        },
        {
          heading: `How to Verify the Pharmacy`,
          paragraphs: [
            `Take the pharmacy name and address from your vial label and look it up in the board of pharmacy licence database for the state shown. Every state maintains a free public lookup, and the National Association of Boards of Pharmacy directory links to all of them.`,
            `If anything on the label does not match what you find, stop and contact us before using the medication.`,
          ],
        },
        {
          heading: `What 503A Means`,
          paragraphs: [
            `A 503A pharmacy compounds against a patient-specific prescription. It is registered with the FDA, licensed by its own state board of pharmacy, and — where it ships across state lines — must additionally hold a non-resident pharmacy registration in the receiving state.`,
            `A 503A pharmacy is not a drug manufacturer and its preparations are not FDA-approved. See our Compounded Medication Disclosure.`,
          ],
        },
        {
          heading: `Testing`,
          paragraphs: [
            `Our partner pharmacy tests each batch for sterility, potency, purity, and endotoxins before release. A certificate of analysis for the lot your order was compounded from is available on request — email ${SUPPORT_EMAIL} with your order number.`,
          ],
        },
        {
          heading: `If the Pharmacy Changes`,
          paragraphs: [
            `We may add or change pharmacy partners as licensure and supply require. Any pharmacy we use will be FDA-registered, state-licensed, and registered to ship into ${SERVICE_AREA}. The pharmacy that filled your specific order is always the one named on your label.`,
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
        { label: 'Compounded Medication Disclosure', href: '/legal/compounded-medication' },
        { label: 'Shipping & Delivery Policy', href: '/legal/shipping' },
        { label: 'Compliance', href: '/compliance' },
      ]}
    />
  );
}
