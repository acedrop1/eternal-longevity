import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Medical Disclaimer | Eternal Longevity',
  description: 'What our clinical relationship with you covers, what it does not, and why this is not a substitute for your own doctor.',
};

export default function MedicalDisclaimerPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Medical Disclaimer"
      effective="September 2026"
      lead={`Many companies in this category describe themselves as technology platforms that merely connect you to independent physicians. We do not, because it would not be true of us: our prescriber practises within this company. That makes it more important, not less, to be exact about what this relationship is and is not.`}
      sections={[
        {
          heading: `Who Provides Your Care`,
          paragraphs: [
            `${BUSINESS_LEGAL_NAME} is wholly owned by Bader Elder, MD, who is licensed to practise medicine in ${SERVICE_AREA} and who reviews and signs every prescription issued through this service. We do not describe ourselves as a technology platform, and we do not route you to a third-party prescriber network.`,
            `A prescriber–patient relationship is established between you and Dr. Elder when he reviews your intake. We are not a pharmacy; dispensing is done by an independently licensed 503A compounding pharmacy.`,
          ],
        },
        {
          heading: `A Narrow Relationship`,
          paragraphs: [
            `That relationship is limited to assessing whether the protocol you selected is appropriate for you, issuing or declining a prescription, and answering questions about that treatment. It is not primary care.`,
            `We do not diagnose or manage general medical conditions, order routine screening, or coordinate your overall care. Keep your own physician, and tell them what you are taking.`,
          ],
        },
        {
          heading: `Not a Substitute for In-Person Care`,
          paragraphs: [
            `A review conducted from written answers cannot replace a physical examination when one is clinically needed. Some conditions cannot be evaluated properly without in-person testing or imaging.`,
            `Your prescriber may decide your situation requires in-person evaluation and decline to prescribe until you have had one. That is a safety decision, not an obstacle.`,
          ],
        },
        {
          heading: `Informational Content`,
          paragraphs: [
            `Product descriptions, articles, and educational material on this site are general information, not medical advice, and are not tailored to you. Do not use them to diagnose or treat a condition.`,
          ],
        },
        {
          heading: `No Guaranteed Outcome`,
          paragraphs: [
            `We make no promise about results. Peptides affect different people differently, evidence for several uses is limited, and individual results vary. Anyone guaranteeing you an outcome from these preparations is misleading you.`,
          ],
        },
        {
          heading: `Emergencies`,
          paragraphs: [
            `This service is not for emergencies. If you are experiencing chest pain, difficulty breathing, signs of stroke, a serious injury, severe allergic symptoms, or suicidal thoughts, call 911 or go to the nearest emergency room. Messages sent through the portal are not monitored continuously.`,
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
        { label: 'Informed Consent', href: '/legal/consent' },
        { label: 'Adverse Event Reporting', href: '/legal/adverse-events' },
        { label: 'Compliance', href: '/compliance' },
      ]}
    />
  );
}
