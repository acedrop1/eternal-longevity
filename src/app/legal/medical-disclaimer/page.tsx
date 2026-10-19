import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { BUSINESS_LEGAL_NAME, BUSINESS_ADDRESS, SUPPORT_EMAIL } from '@/lib/site';
import { IDENTITY, RX_DISCLOSURE } from '../identity';

export const metadata: Metadata = pageMeta(
  '/legal/medical-disclaimer',
  'Medical Disclaimer',
  'What our clinical relationship with you covers, what it does not, and why this is not a substitute for your own doctor.',
);

export default function MedicalDisclaimerPage() {
  return (
    <LegalLayout
      title="Medical Disclaimer"
      effective="October 19, 2026"
      lead={`This page explains who provides your care, what our clinical relationship with you covers, what it does not, and why it is not a substitute for your own doctor.`}
      sections={[
        {
          heading: `Who Provides Your Care`,
          paragraphs: [
            IDENTITY,
            `A physician–patient relationship is established between you and Dr. Elder when he reviews your assessment. The dispensing pharmacy is named on your prescription label.`,
            RX_DISCLOSURE,
          ],
        },
        {
          heading: `A Narrow Relationship`,
          paragraphs: [
            `That relationship covers evaluating whether a treatment we offer is appropriate for you, prescribing or declining it, and your follow-up questions about that treatment. It is not primary care.`,
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
          heading: `General Website Content`,
          paragraphs: [
            `Product descriptions, articles, and other general material on this website are not tailored to you and are not a substitute for the prescriber’s review. Medical decisions about you are made only through that review.`,
          ],
        },
        {
          heading: `No Guaranteed Outcome`,
          paragraphs: [
            `We make no promise about results. Medications affect different people differently, evidence for some uses is limited, and individual results vary. Anyone guaranteeing you an outcome from these preparations is misleading you.`,
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
