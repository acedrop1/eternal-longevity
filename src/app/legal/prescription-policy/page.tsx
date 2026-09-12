import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

import { getPrescriber } from '@/lib/prescriber';

export const metadata: Metadata = {
  title: 'Prescription Policy',
  description: 'A prescription is issued only after a licensed prescriber reviews your intake. Ordering and paying do not produce one.',
};

export default async function PrescriptionPolicyPage() {
  // Quoted from the prescriber row, so the page and the profile cannot drift.
  const prescriber = await getPrescriber();

  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Prescription Policy"
      effective="September 2026"
      lead={`You cannot buy a prescription from us. You can ask a licensed prescriber to consider writing one, and that is what placing an order does. This page explains what actually produces a prescription and what does not.`}
      sections={[
        {
          heading: `Review Comes First`,
          paragraphs: [
            `A prescription is issued only after a licensed prescriber reviews your intake and concludes that the treatment is clinically appropriate for you. Completing an assessment, creating an account, and placing an order do not produce a prescription on their own.`,
            `We charge nothing until that review is finished and the answer is yes. If your order is declined, no payment link is ever issued and no money moves.`,
          ],
        },
        {
          heading: `Prescriber Discretion`,
          paragraphs: [
            `The prescriber retains sole medical discretion over whether to prescribe. They apply clinical and exclusionary criteria to the history you provide, and they may decline for reasons they are not obliged to negotiate with you.`,
            `Treatment is not appropriate for everyone. A prescriber may decline based on your medical history, current medications, contraindications, age, or any other clinical factor.`,
          ],
        },
        {
          heading: `Your Information Must Be True`,
          paragraphs: [
            `You must give information that is true, accurate, current and complete. Incomplete or false answers can produce an unsafe prescription — the review is only as good as what you put into it.`,
            `Falsifying intake information is grounds for us to decline the order, cancel your account, and refuse future service.`,
          ],
        },
        {
          heading: `Refills and Ongoing Treatment`,
          paragraphs: [
            `An approved first order does not guarantee approval of the next one. Every refill is reviewed again, and a prescriber may modify or stop treatment based on your response, new information, or lab results.`,
            `A prescription is valid only for the patient it was written for. Do not share, resell, or transfer medication dispensed to you.`,
          ],
        },
        {
          heading: `Who Prescribes`,
          paragraphs: [
            `Prescriptions are written by ${prescriber.display}, licensed to practise medicine and surgery in ${SERVICE_AREA}${prescriber.licenseNumber ? ` (license ${prescriber.licenseNumber}` : ''}${prescriber.npi ? `, NPI ${prescriber.npi})` : prescriber.licenseNumber ? ')' : ''}. Our full prescriber and pharmacy details are on our Compliance page.`,
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
        { label: 'Patient Eligibility', href: '/legal/eligibility' },
        { label: 'Compounded Medication Disclosure', href: '/legal/compounded-medication' },
        { label: 'Refund Policy', href: '/legal/refunds' },
      ]}
    />
  );
}
