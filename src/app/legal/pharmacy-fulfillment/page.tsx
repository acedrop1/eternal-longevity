import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';
import { IDENTITY, RX_DISCLOSURE } from '../identity';

export const metadata: Metadata = pageMeta(
  '/legal/pharmacy-fulfillment',
  'Pharmacy Fulfillment',
  'Which pharmacy fills your prescription, how it is regulated, and how to verify its licence yourself.',
);

export default function PharmacyFulfillmentPage() {
  return (
    <LegalLayout
      title="Pharmacy Fulfillment"
      effective="October 19, 2026"
      lead={`You should be able to check who made your medication without taking our word for it. This page explains who fills your prescription, where to find the pharmacy’s name (on your medication label), the rules it operates under, and how to verify its licence in about a minute.`}
      sections={[
        {
          heading: `Who Fills Your Prescription`,
          paragraphs: [
            IDENTITY,
            `The dispensing pharmacy ships your prescription directly to you. Its name and address appear on your medication label and on the paperwork in your package. We do not compound, hold, or handle medication at any point.`,
            RX_DISCLOSURE,
          ],
        },
        {
          heading: `How to Verify the Pharmacy`,
          paragraphs: [
            `Take the pharmacy name and address from your medication label and look it up in the board of pharmacy licence database for the state shown. Every state maintains a free public lookup, and the National Association of Boards of Pharmacy directory links to all of them.`,
            `If anything on the label does not match what you find, stop and contact us before using the medication.`,
          ],
        },
        {
          heading: `What 503A Means`,
          paragraphs: [
            `A 503A pharmacy compounds against a patient-specific prescription. It is licensed by its own state board of pharmacy and, where it ships across state lines, must also hold a licence or registration in each state it ships to.`,
            `A 503A pharmacy is not a drug manufacturer. Compounded medications are not FDA-approved; the FDA does not verify their safety, effectiveness or quality. See our Compounded Medication Disclosure.`,
          ],
        },
        {
          heading: `Testing`,
          paragraphs: [
            `Each batch is tested by the pharmacy as required for its preparation type. A certificate of analysis for the lot your order was compounded from is available on request — email ${SUPPORT_EMAIL} with your order number.`,
          ],
        },
        {
          heading: `If the Pharmacy Changes`,
          paragraphs: [
            `We may add or change pharmacy partners as licensure and supply require. Any pharmacy we use will be an independently licensed 503A compounding pharmacy, licensed or registered to ship into each state we serve (${SERVICE_AREA}). The pharmacy that filled your specific order is always the one named on your label.`,
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
