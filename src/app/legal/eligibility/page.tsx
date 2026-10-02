import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
  SERVICE_AREA_OR,
} from '@/lib/site';

export const metadata: Metadata = pageMeta(
  '/legal/eligibility',
  'Patient Eligibility',
  'Completing an intake is not approval, and paying is not approval. What qualifying actually depends on.',
);

export default function EligibilityPage() {
  return (
    <LegalLayout
      title="Patient Eligibility"
      effective="September 2026"
      lead={`Two things are commonly misunderstood about ordering treatment online: that finishing the questionnaire means you are approved, and that paying means you are approved. Neither is true here, and this page says exactly what is.`}
      sections={[
        {
          heading: `Completing an Intake Is Not Approval`,
          paragraphs: [
            `Finishing the medical assessment does not mean you will be approved or receive a prescription. The assessment is a screening tool — it collects what a prescriber needs in order to make a clinical decision, and that decision comes afterwards.`,
          ],
        },
        {
          heading: `Paying Is Not Approval`,
          paragraphs: [
            `You save a card at checkout, but it is not charged until a prescriber approves your order. There is no scenario in which you have paid and are then declined.`,
            `If a prescriber declines your order, you are never charged.`,
          ],
        },
        {
          heading: `Who Decides`,
          paragraphs: [
            `Whether you qualify is decided by a licensed prescriber based on your medical history, current medications, contraindications, applicable clinical criteria, and the law of the state you are in. Not everyone qualifies, and we do not overrule a clinical decision.`,
          ],
        },
        {
          heading: `Baseline Requirements`,
          paragraphs: [
            `Before any clinical review, you must meet all of the following:`,
          ],
          bullets: [
            `Be 18 years of age or older.`,
            `Be physically located in ${SERVICE_AREA_OR}, with a shipping address in that same state. Orders shipping anywhere else are rejected at checkout.`,
            `Not be pregnant, planning pregnancy, or breastfeeding.`,
            `Have no active cancer, and no cancer treatment in the last 5 years.`,
            `Provide a complete and honest medical history, including every medication and supplement you take.`,
          ],
        },
        {
          heading: `Continued Treatment Is Not Guaranteed`,
          paragraphs: [
            `Refills on a plan ship on the same prescription until it expires or runs out of refills, without a new review each time. The prescriber may pause, change, or stop treatment at any time based on your response, new health information, or clinical judgement, and renewing an expired prescription needs a new review.`,
          ],
        },
        {
          heading: `Availability Can Change`,
          paragraphs: [
            `Availability also depends on pharmacy licensure and product supply, both of which can change. What was available at your last order may not be available at the next.`,
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
        { label: 'State Availability', href: '/legal/state-availability' },
        { label: 'Informed Consent', href: '/legal/consent' },
      ]}
    />
  );
}
