import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Telehealth Informed Consent — Eternal Longevity',
  description: 'What it means to receive care through telehealth, including risks and limitations.',
};

export default function TelehealthConsentPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Telehealth Informed Consent"
      effective="May 2026"
      lead="Telehealth lets a physician treat you remotely, using technology to share information instead of meeting in person. This document explains what to expect, what telehealth can and cannot do, and the choice you are making by consenting to it."
      sections={[
        {
          heading: 'What Telehealth Is',
          paragraphs: [
            'In a telehealth visit, your physician reviews your written intake, your uploaded labs and ID, and any follow-up messages you exchange — and then makes clinical decisions, including whether to write a prescription. Telehealth may also include synchronous video or phone visits, when clinically warranted.',
            'Your physician is licensed in the state in which you reside at the time of the visit. If you move to a state where they are not licensed, your care may be transferred to a different physician on our network.',
          ],
        },
        {
          heading: 'What Telehealth Cannot Do',
          paragraphs: [
            'Telehealth has real limitations compared to an in-person visit:',
          ],
          bullets: [
            'Your physician cannot perform a physical exam, listen to your heart, or palpate tissue.',
            'Some conditions cannot be properly evaluated without in-person testing.',
            'Lab work and imaging require visits to a partner facility or your local provider.',
            'Technical failures (lost connection, lost messages) can delay care.',
            'A telehealth physician is not your primary care provider and does not replace primary care.',
          ],
          // ↑ keeping primary care relationship clear is important for safety + liability
        },
        {
          heading: 'Risks & Benefits',
          paragraphs: [
            'Benefits include increased access to specialty clinicians, faster turnaround on routine prescriptions, written records of every interaction, and the convenience of receiving care from home.',
            'Risks include: clinical limitations described above; the possibility that important information is missed because the physician cannot examine you in person; security risks inherent to electronic communication despite our safeguards; and the possibility that follow-up in-person care is needed urgently and is delayed by the telehealth process.',
          ],
        },
        {
          heading: 'No Doctor-Patient Relationship Until Acceptance',
          paragraphs: [
            'Submitting an intake does not automatically create a physician-patient relationship. A relationship is established only after a licensed physician on our network reviews your intake and accepts you for treatment. The physician may decline to treat at their sole clinical discretion.',
          ],
        },
        {
          heading: 'Emergencies',
          paragraphs: [
            'Telehealth is not for emergencies. If you are experiencing chest pain, difficulty breathing, sudden severe pain, a serious injury, signs of stroke, suicidal thoughts, or any condition you believe is life-threatening, call 911 or go to the nearest emergency room. Do not wait for a message reply.',
          ],
        },
        {
          heading: 'Your Responsibilities',
          paragraphs: [
            'For the service to work, you agree to:',
          ],
          bullets: [
            'Provide accurate, complete information during intake and throughout care.',
            'Disclose all medications, supplements, allergies, and relevant medical history.',
            'Follow your physician’s instructions, including dosing, off-cycles, and follow-up labs.',
            'Stop the protocol and contact us promptly if you experience an adverse reaction.',
            'See your primary care provider for routine care and emergencies.',
          ],
        },
        {
          heading: 'Confidentiality',
          paragraphs: [
            'Your information is protected by HIPAA and our Privacy Policy. Despite our security measures, no electronic communication system is completely private. By consenting to telehealth, you accept the residual risk that electronic communication carries.',
          ],
        },
        {
          heading: 'Recording',
          paragraphs: [
            'We do not record video visits. Written messages between you and your care team are stored as part of your medical record and are accessible to you through your member portal.',
          ],
        },
        {
          heading: 'Withdrawing Consent',
          paragraphs: [
            'You may withdraw your consent to telehealth at any time, without affecting your right to future care. To withdraw consent, message your care team through the portal or email care@eternallongevity.com. Withdrawal of consent will end active treatment but does not erase records already created.',
          ],
        },
        {
          heading: 'Your Acknowledgement',
          paragraphs: [
            'By checking the telehealth-consent box during intake, you confirm that you have read this document, understand the limitations and risks of telehealth, have had the opportunity to ask questions, and consent to receive care through telehealth on the terms above.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'Questions about this consent? Email legal@eternallongevity.com or care@eternallongevity.com for clinical questions.',
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
