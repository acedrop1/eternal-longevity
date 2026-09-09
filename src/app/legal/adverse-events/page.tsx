import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Adverse Event Reporting',
  description: 'How to report a side effect or reaction to us and to the FDA.',
};

export default function AdverseEventsPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Adverse Event Reporting"
      effective="September 2026"
      lead={`If something goes wrong, tell us. Reports are how problems with a lot, a preparation, or a protocol get found — yours protects the next person as much as it protects you.`}
      sections={[
        {
          heading: `If It Is an Emergency`,
          paragraphs: [
            `For a severe reaction or any life-threatening symptom — difficulty breathing, swelling of the face or throat, chest pain, fainting, or a severe allergic reaction — call 911 or go to the nearest emergency room first. Report it to us afterwards. Do not wait for a message reply.`,
          ],
        },
        {
          heading: `Reporting a Non-Emergency Reaction`,
          paragraphs: [
            `Stop dosing, then email ${SUPPORT_EMAIL} with:`,
          ],
          bullets: [
            `Your name and the email on your account.`,
            `Your order number and the preparation involved.`,
            `What you experienced, when it started, and how long it lasted.`,
            `Whether you have stopped or continued.`,
            `The lot number printed on the vial, if you still have it.`,
          ],
        },
        {
          heading: `What We Do With It`,
          paragraphs: [
            `We route your report to your prescriber and to the dispensing pharmacy for clinical follow-up, and we retain it in your record. You can also message your prescriber directly from the member portal, which is faster.`,
            `A reaction that appears to be a quality problem with the preparation triggers a review of the lot with the pharmacy.`,
          ],
        },
        {
          heading: `Reporting to the FDA`,
          paragraphs: [
            `You may also report an adverse event directly to the U.S. Food and Drug Administration, independently of us, through the MedWatch programme at fda.gov/safety/medwatch or by calling 1-800-FDA-1088.`,
            `You do not need our permission or involvement to file a MedWatch report, and we will never ask you not to.`,
          ],
        },
        {
          heading: `Refunds After a Reaction`,
          paragraphs: [
            `A compounded preparation cannot be re-dispensed once it has left the pharmacy, so we cannot refund vials already shipped. We can adjust or stop your protocol, and our Refund Policy sets out what we can do.`,
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
        { label: 'Medical Disclaimer', href: '/legal/medical-disclaimer' },
        { label: 'Refund Policy', href: '/legal/refunds' },
      ]}
    />
  );
}
