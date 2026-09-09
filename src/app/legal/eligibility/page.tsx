import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Patient Eligibility | Eternal Longevity',
  description: 'Completing an intake is not approval, and paying is not approval. What qualifying actually depends on.',
};

export default function EligibilityPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
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
            `On our platform this question does not arise, because you are not asked to pay until after a prescriber has already approved your order. There is no scenario in which you have paid and are then declined.`,
            `If a prescriber declines your order, you never receive a payment link and you are never charged.`,
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
            `Be physically located in ${SERVICE_AREA}, with a ${SERVICE_AREA} shipping address. Orders shipping anywhere else are rejected at checkout.`,
            `Not be pregnant, planning pregnancy, or breastfeeding.`,
            `Have no active or prior malignancy, unless specifically cleared by your own physician.`,
            `Provide a complete and honest medical history, including every medication and supplement you take.`,
          ],
        },
        {
          heading: `Continued Treatment Is Not Guaranteed`,
          paragraphs: [
            `Initial approval does not guarantee refills. A prescriber may change or discontinue treatment at any time based on your response, new health information, or clinical judgement.`,
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
