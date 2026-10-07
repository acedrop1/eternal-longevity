import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
} from '@/lib/site';

export const metadata: Metadata = pageMeta(
  '/legal/privacy',
  'Privacy Policy',
  'How we collect, use, and protect your health and personal information.',
);

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      effective="October 2026"
      lead="Your health information is sensitive. This policy explains what we collect, why, who we share it with, and your rights. Eternal Longevity LLC (“Eternal Longevity,” “we,” “us”) is a telehealth medical practice, and it also serves as our Notice of Privacy Practices."
      sections={[
        {
          heading: 'Information We Collect',
          paragraphs: [
            'We collect information you give us during your intake, at checkout, and in your member portal, including:',
          ],
          bullets: [
            'Identity: name, date of birth, and sex assigned at birth.',
            'Contact: email, shipping address, and phone number.',
            'Health information: height, weight, medical history, medications, allergies, and anything else you share with the prescriber.',
            'Account: password (stored hashed), sign-in and security factors, and login history.',
            'Payment: billing address and card brand and last four digits. Full card numbers are handled by our payment processor and are never stored on our servers.',
            'Technical: IP address and browser and device details, recorded in server and security logs.',
          ],
        },
        {
          heading: 'How We Use Your Information',
          paragraphs: [
            'We use your information to provide your care and run the service: the prescriber’s review; sending your prescription to the pharmacy that fills and ships it; charging your saved card; messages about your care, orders and account; keeping the service secure; and meeting legal obligations.',
            'Only if you opt in separately, we send marketing texts and use de-identified information for internal research. We do not sell your personal information, and we do not use your health information for advertising.',
          ],
        },
        {
          heading: 'Who We Share Information With',
          paragraphs: [
            'We share information only as needed to provide the service, and only with parties bound to protect it:',
          ],
          bullets: [
            'The state-licensed pharmacy that fills and ships your prescription (named on your prescription label).',
            'Shipping carriers, for delivery.',
            'Frame Payments, our payment processor, to save your card and process payments.',
            'Google, whose Places service suggests addresses as you type your shipping address at checkout. It receives what you type in that field, not your health information.',
            'Hosting, database, email and text-message providers that run the service for us.',
            'Government bodies or law enforcement when the law requires it.',
          ],
        },
        {
          heading: 'Notice of Privacy Practices',
          paragraphs: [
            'We use and disclose your protected health information for treatment (for example, sending your prescription to the pharmacy), payment (for example, charging your card), and health-care operations (for example, quality review and support), and as required or permitted by law. Any other use, including marketing, needs your written permission, which you can revoke at any time.',
            'You have the right to:',
          ],
          bullets: [
            'See and get a copy of your health record.',
            'Ask us to correct your record.',
            'Ask us to limit what we use or share, or to contact you in a particular way.',
            'Get a list of certain disclosures we have made.',
            'Get a paper copy of this notice.',
            'File a complaint with us, or with the U.S. Department of Health and Human Services Office for Civil Rights. We will not retaliate against you for filing a complaint.',
          ],
        },
        {
          heading: 'Cookies',
          paragraphs: [
            'We set only strictly necessary cookies: to keep you signed in and protect against forgery. Your cart and the contact details from an unfinished assessment are kept in your browser’s local storage, and a signed-in member’s unfinished assessment is saved to their account. At checkout, our payment processor may set its own fraud-prevention cookies and Google Places suggests addresses. We run no analytics or advertising pixels. See our Cookie Notice.',
          ],
        },
        {
          heading: 'Data Security',
          paragraphs: [
            'We use administrative, physical, and technical safeguards to protect your information. Information in transit is encrypted using TLS, and information at rest is encrypted. Access to health information is limited to staff with a clinical or operational need.',
            'No security system is perfect. If a breach affects your information, we will notify you and the appropriate regulators as the law requires.',
          ],
        },
        {
          heading: 'Data Retention',
          paragraphs: [
            'Medical and order records are kept for as long as the law requires, typically at least seven years from your last order. Other personal information is kept while your account is active and for a reasonable period afterwards to meet legal and accounting obligations.',
          ],
        },
        {
          heading: 'Your Rights, Including New Jersey Residents',
          paragraphs: [
            `Depending on where you live, including under New Jersey law, you may ask to access, correct, delete, or get a copy of your personal data, and to opt out of its sale or use for targeted advertising (we do neither). To make a request, email ${SUPPORT_EMAIL}. We will verify your identity and reply within 45 days. We may be unable to delete records the law requires us to keep, and we will tell you if so.`,
            `If we decline your request, you can appeal by emailing ${SUPPORT_EMAIL} with “Appeal” in the subject line. We will answer the appeal in writing, and if you are not satisfied you may contact your state attorney general.`,
          ],
        },
        {
          heading: 'Children',
          paragraphs: [
            `Our service is for adults 18 and older. We do not knowingly collect personal information from children. If you believe a child has given us information, email ${SUPPORT_EMAIL} and we will delete it.`,
          ],
        },
        {
          heading: 'Changes to This Policy',
          paragraphs: [
            'We may update this policy from time to time. If we make material changes to how we use your information, we will email you and post a notice here at least 14 days before they take effect.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            `Questions, requests, or complaints? Email ${SUPPORT_EMAIL} or write to Privacy Officer, ${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}.`,
          ],
        },
      ]}
      related={[
        { label: 'Terms of Service', href: '/legal/terms' },
        { label: 'Telehealth Informed Consent', href: '/legal/consent' },
        { label: 'Cookie Notice', href: '/legal/cookies' },
        { label: 'Refund Policy', href: '/legal/refunds' },
        { label: 'Shipping & Delivery Policy', href: '/legal/shipping' },
      ]}
    />
  );
}
