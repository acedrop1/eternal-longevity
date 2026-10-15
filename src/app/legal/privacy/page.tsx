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
      lead="Your health information is sensitive. This policy explains what we collect, why, who we share it with, and your rights. Eternal Longevity LLC (“Eternal Longevity,” “we,” “us”) connects you with a licensed physician for online care."
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
            'Site usage: which of our public pages were visited and which tagged link brought the visit, counted anonymously on our own servers, and, when you complete an assessment, the link that brought you saved with it so we know which of our campaigns reach patients.',
          ],
        },
        {
          heading: 'How We Use Your Information',
          paragraphs: [
            'We use your information to provide your care and run the service: the prescriber’s review; sending your prescription to the pharmacy that fills and ships it; charging your saved card; messages about your care, orders and account; keeping the service secure; and meeting legal obligations.',
            'Only if you opt in separately, we send marketing texts and use de-identified information for internal research. We never use or share your medical information, such as your intake answers, prescriptions and records, for advertising. With your consent, we and our advertising and analytics partners use information about your visits to our marketing pages, which may include sensitive health information such as the treatment pages you view, to measure and personalize advertising. See our Cookie Notice.',
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
            'Advertising and analytics partners, such as Meta and Google, only if you consent on our marketing pages. They receive information about your visits to those pages (which may reveal interest in a treatment) and standard browser and device details, never your intake answers, prescriptions or records.',
            'Government bodies or law enforcement when the law requires it.',
          ],
        },
        {
          heading: 'HIPAA',
          paragraphs: [
            'Eternal Longevity is not a “covered entity” under the Health Insurance Portability and Accountability Act (HIPAA). HIPAA does not apply simply because health information is involved, and it may not apply to your use of our service.',
            'We still protect your health information as this policy describes and as the privacy and data-security laws of the states we serve require. We never sell your intake answers, prescriptions or medical records, and we never use them for advertising.',
          ],
        },
        {
          heading: 'Cookies',
          paragraphs: [
            'We set only strictly necessary cookies: to keep you signed in and protect against forgery. Your cart and the contact details from an unfinished assessment are kept in your browser’s local storage, and a signed-in member’s unfinished assessment is saved to their account. At checkout, our payment processor may set its own fraud-prevention cookies and Google Places suggests addresses. On our marketing pages only, and only if you consent, we and our advertising and analytics partners use cookies and similar technologies; they never load on your assessment, checkout or member portal. A Global Privacy Control signal counts as a no. See our Cookie Notice.',
          ],
        },
        {
          heading: 'Text Messages',
          paragraphs: [
            'If you opt in to text alerts, we use your mobile number only to send the account and care messages described in our Text Messaging Terms. No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties. Reply STOP to any message to opt out.',
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
            `Depending on where you live, including under New Jersey law, you may ask to access, correct, delete, or get a copy of your personal data, and to opt out of its sale or use for targeted advertising. Our advertising and analytics technologies load only with your consent, and some state laws may treat them as targeted advertising, sharing or a sale. You can opt out at any time with the Your Privacy Choices link in our footer, and we honour Global Privacy Control signals as an opt-out. To make a request, email ${SUPPORT_EMAIL}. We will verify your identity and reply within 45 days. We may be unable to delete records the law requires us to keep, and we will tell you if so.`,
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
