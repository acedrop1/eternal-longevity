import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Informed Consent & Product Acknowledgement | Eternal Longevity',
  description: 'What you acknowledge when ordering compounded peptide protocols, including risks and limitations.',
};

export default function TelehealthConsentPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Informed Consent & Product Acknowledgement"
      effective="May 2026"
      lead="Eternal Longevity is an online store for compounded peptide protocols. This document explains what you are acknowledging when you place an order, what these products are and are not, and the risks you accept. It is informational only and is not medical advice."
      sections={[
        {
          heading: 'What This Acknowledgement Covers',
          paragraphs: [
            'When you order a compounded peptide protocol from Eternal Longevity, your order is submitted to a licensed 503A pharmacy that compounds and fulfills it. This document explains what you are acknowledging when you place that order, including that nothing here is medical advice and that you are responsible for consulting your own healthcare provider before use.',
            'Eternal Longevity operates an online store and does not provide medical care, examinations, diagnosis, or treatment. Product availability may vary by state, and we may be unable to fulfill an order where a product is not available in your state.',
          ],
        },
        {
          heading: 'What This Product Is Not',
          paragraphs: [
            'There are important limitations you should understand:',
          ],
          bullets: [
            'Eternal Longevity does not provide medical examinations, diagnosis, or treatment.',
            'Some conditions cannot be properly evaluated without in-person testing.',
            'Lab work and imaging should be arranged with your own healthcare provider.',
            'Technical failures (lost connection, lost messages) can delay order processing or communication.',
            'Ordering from us is not a substitute for your primary care provider or ongoing medical care.',
          ],
          // ↑ keeping primary care relationship clear is important for safety + liability
        },
        {
          heading: 'Risks & Benefits',
          paragraphs: [
            'Benefits include convenient online access to compounded peptide protocols, fast turnaround on orders, written records of every interaction, and delivery to your door.',
            'Risks include: the limitations described above; the possibility that a peptide protocol is not appropriate for you because we do not evaluate you in person; the general risks of using compounded products; security risks inherent to electronic communication despite our safeguards; and the possibility that in-person medical care you need is delayed. You are responsible for consulting your own healthcare provider before use.',
          ],
        },
        {
          heading: 'No Medical Relationship',
          paragraphs: [
            'Placing an order with Eternal Longevity does not create a medical, clinical, or treatment relationship of any kind. Eternal Longevity is an online store and does not provide medical advice, diagnosis, or treatment. You are responsible for consulting your own healthcare provider before using any protocol.',
          ],
        },
        {
          heading: 'Emergencies',
          paragraphs: [
            'Our store is not for emergencies. If you are experiencing chest pain, difficulty breathing, sudden severe pain, a serious injury, signs of stroke, suicidal thoughts, or any condition you believe is life-threatening, call 911 or go to the nearest emergency room. Do not wait for a message reply.',
          ],
        },
        {
          heading: 'Your Responsibilities',
          paragraphs: [
            'For the service to work, you agree to:',
          ],
          bullets: [
            'Provide accurate, complete information when you place an order.',
            'Review your medications, supplements, allergies, and relevant medical history with your own healthcare provider before use.',
            'Follow the product instructions and the guidance of your own healthcare provider, including dosing, off-cycles, and follow-up labs.',
            'Stop the protocol and consult your own healthcare provider promptly if you experience an adverse reaction.',
            'See your primary care provider for routine care and emergencies.',
          ],
        },
        {
          heading: 'Confidentiality',
          paragraphs: [
            'Your information is protected under our Privacy Policy and applicable law. Despite our security measures, no electronic communication system is completely private. By placing an order, you accept the residual risk that electronic communication carries.',
          ],
        },
        {
          heading: 'Recording',
          paragraphs: [
            'We do not record calls. Written messages between you and our support team are stored as part of your account record and are accessible to you through your member portal.',
          ],
        },
        {
          heading: 'Withdrawing Consent',
          paragraphs: [
            'You may withdraw this consent at any time. To withdraw consent, message our support team through the portal or email care@eternallongevity.com. Withdrawal of consent will stop future orders but does not erase records already created.',
          ],
        },
        {
          heading: 'Your Acknowledgement',
          paragraphs: [
            'By checking the acknowledgement box when you order, you confirm that you are at least 18 years old, have read this document, understand the limitations and risks described above, accept those risks, and agree that you are responsible for consulting your own healthcare provider before use.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'Questions about this acknowledgement? Email legal@eternallongevity.com or care@eternallongevity.com for order questions.',
          ],
        },
      ]}
      related={[
        { label: 'Terms of Service', href: '/legal/terms' },
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Refund Policy', href: '/legal/refunds' },
      ]}
    />
  );
}
