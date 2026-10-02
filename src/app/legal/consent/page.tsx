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
  '/legal/consent',
  'Telehealth Informed Consent',
  'How our asynchronous telehealth review works, its limits and risks, and your rights, including the right to withdraw.',
);

export default function ConsentPolicyPage() {
  return (
    <LegalLayout
      title="Telehealth Informed Consent"
      effective="September 2026"
      lead="Eternal Longevity is a telehealth medical practice. This consent explains how our care works, what it can and cannot do, and your rights. You agree to it when you check the acknowledgement box in your intake."
      sections={[
        {
          heading: 'How Our Care Works',
          paragraphs: [
            `Our care is asynchronous: you complete a written medical intake online, and Dr. Bader Elder, DO, a physician licensed in ${SERVICE_AREA}, reviews it later rather than in a live visit. He decides whether a treatment is appropriate for you. He may prescribe, decline, or ask you for more information before deciding.`,
            'When he prescribes, a physician–patient relationship exists between you and Dr. Elder for that treatment. Prescriptions are dispensed by a state-licensed 503A compounding pharmacy. Refills on a plan ship on the same prescription until it expires or runs out of refills; the prescriber can pause or stop a plan at any time, and a new product needs a new review.',
            `We serve only patients located in ${SERVICE_AREA_OR}, and you must be 18 or older.`,
          ],
        },
        {
          heading: 'Limits of Telehealth',
          paragraphs: [
            'You should understand the following before you consent:',
          ],
          bullets: [
            'There is no physical examination. The prescriber relies on the information you provide, so it must be complete and true.',
            'Some conditions cannot be assessed without an in-person exam, testing, or imaging. The prescriber may decline and recommend in-person care.',
            'Our care is limited to the treatments we offer. It is not primary care, and it does not replace your own doctor. Tell your doctor what you take.',
            'Technical problems can delay a review or a message.',
          ],
        },
        {
          heading: 'Risks and Benefits',
          paragraphs: [
            'Benefits include convenient access to a physician and to prescription treatment without an office visit.',
            'Risks include: a decision based on incomplete or inaccurate information; side effects or interactions of the medication; the specific risks of compounded medications, which are not FDA-approved; delays in care you might need in person; and the security risks of electronic communication despite our safeguards. Results vary, and no outcome is guaranteed.',
          ],
        },
        {
          heading: 'Emergencies',
          paragraphs: [
            'This service is not for emergencies. If you have chest pain, difficulty breathing, signs of stroke, a severe allergic reaction, thoughts of harming yourself, or any condition you believe is life-threatening, call 911 or go to the nearest emergency room. Do not wait for a message reply.',
          ],
        },
        {
          heading: 'Your Responsibilities',
          paragraphs: [
            'You agree to:',
          ],
          bullets: [
            'Give accurate, complete information, including every medication and supplement you take.',
            'Tell us promptly about changes in your health, medications, or pregnancy status.',
            'Follow the directions on your prescription label.',
            'Stop the medication and contact us if you have a reaction, and seek emergency care when needed.',
            'Keep a primary care provider for routine care.',
          ],
        },
        {
          heading: 'Records and Privacy',
          paragraphs: [
            'Your intake, the prescriber’s notes, prescriptions, and messages form your medical record. We keep it as the law requires, and you can view your messages and orders in your member portal.',
            'Your health information is shared only as needed to provide your care (for example, with the pharmacy that fills your prescription) and as described in our Privacy Policy. No electronic system is completely secure, and you accept the residual risk of electronic communication.',
          ],
        },
        {
          heading: 'Your Right to Withdraw',
          paragraphs: [
            `You may withdraw this consent at any time by emailing ${SUPPORT_EMAIL} or messaging us in the portal. Withdrawing stops future care and cancels future shipments; it does not erase records already created, which we must keep by law.`,
          ],
        },
        {
          heading: 'Your Acknowledgement',
          paragraphs: [
            'By checking the acknowledgement box in your intake, you confirm that you are at least 18, have read and understood this consent, have had the chance to ask questions, and agree to receive care through telehealth.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            `Questions about this consent? Email ${SUPPORT_EMAIL}, or write to ${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}.`,
          ],
        },
      ]}
      related={[
        { label: 'Terms of Service', href: '/legal/terms' },
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Medical Disclaimer', href: '/legal/medical-disclaimer' },
        { label: 'Prescription Policy', href: '/legal/prescription-policy' },
      ]}
    />
  );
}
