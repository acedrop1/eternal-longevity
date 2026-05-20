import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy | Eternal Longevity',
  description: 'How we collect, use, and protect your health and personal information.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Privacy Policy"
      effective="May 2026"
      lead="Your health information is sensitive. This policy explains what we collect, why we collect it, who we share it with, and the choices you have. Eternal Longevity, Inc. (“Eternal Longevity,” “we,” “us”) is committed to handling your data with the care it deserves."
      sections={[
        {
          heading: 'Information We Collect',
          paragraphs: [
            'We collect information you give us directly during intake and through your member portal, including:',
          ],
          bullets: [
            'Identity: name, date of birth, government-issued ID for prescription verification.',
            'Contact: email, mailing address, phone number.',
            'Health information: goals, medical history, medications, allergies, bloodwork, prior peptide use, and other clinical information you share with your physician.',
            'Account: password (stored hashed), authentication factors, login history.',
            'Payment: billing address and card brand/last four digits. Full card numbers are processed by our payment processor and are never stored on our servers.',
            'Technical: device, browser, IP address, pages visited, and similar metadata collected automatically.',
          ],
        },
        {
          heading: 'How We Use Your Information',
          paragraphs: [
            'We use your information to provide and improve our service. Specific uses include: routing your intake to a licensed physician; preparing and shipping prescriptions through our 503A pharmacy partners; communicating with you about your care; processing payments; maintaining the security and integrity of the platform; complying with legal obligations; and developing new features.',
            'We do not sell your personal information. We do not use your protected health information for behavioral advertising.',
          ],
        },
        {
          heading: 'HIPAA & Health Data',
          paragraphs: [
            'Treatment provided by physicians on our platform is subject to the Health Insurance Portability and Accountability Act (HIPAA). HIPAA-protected information is handled in accordance with our Notice of Privacy Practices and is shared only as permitted by HIPAA. Primarily for treatment, payment, and healthcare operations, or with your written authorization.',
            'Information you provide outside the clinical context (e.g., general marketing inquiries) is not HIPAA-protected health information, and is governed by this Privacy Policy.',
          ],
        },
        {
          heading: 'Who We Share Information With',
          paragraphs: [
            'We share information only as necessary to operate our service and only with parties who are contractually bound to protect it. Categories of recipients include:',
          ],
          bullets: [
            'Licensed physicians and clinical staff who provide your care.',
            'Licensed 503A compounding pharmacies that prepare your prescription.',
            'Shipping carriers (FedEx, UPS) for delivery.',
            'Cloud infrastructure providers under business-associate agreements.',
            'Payment processors for billing.',
            'Identity-verification vendors when required.',
            'Government bodies or law enforcement when required by law.',
          ],
        },
        {
          heading: 'Cookies & Analytics',
          paragraphs: [
            'We use a small set of first-party cookies to keep you logged in, remember your preferences, and measure aggregate usage so we can improve the site. We do not use cross-site advertising trackers on pages that handle health information.',
            'You can disable cookies in your browser, but parts of the service (such as the member portal) will not work without them.',
          ],
        },
        {
          heading: 'Data Security',
          paragraphs: [
            'We use industry-standard administrative, physical, and technical safeguards to protect your information. Information in transit is encrypted using TLS. Information at rest is encrypted using AES-256. Access to health data is logged and limited to staff with a legitimate clinical or operational need.',
            'No security system is perfect. If we discover a breach affecting your personal information, we will notify you and the appropriate regulators in accordance with applicable law.',
          ],
        },
        {
          heading: 'Data Retention',
          paragraphs: [
            'Medical records are retained as required by state law. Typically a minimum of seven years from the date of last service, longer for minors. Other personal information is retained for as long as your account is active and for a reasonable period after closure to comply with our legal and accounting obligations.',
          ],
        },
        {
          heading: 'Your Rights',
          paragraphs: [
            'Depending on where you live, you may have the right to access, correct, port, or delete your personal information; to opt out of certain disclosures; and to lodge a complaint with a supervisory authority. To exercise these rights, email privacy@eternallongevity.com. We will verify your identity before fulfilling the request.',
            'Medical-record requests are handled in accordance with HIPAA and applicable state law.',
          ],
        },
        {
          heading: 'Children',
          paragraphs: [
            'Our service is intended for adults 18 and older. We do not knowingly collect personal information from children. If you believe a child has provided us with information, please email privacy@eternallongevity.com and we will delete it.',
          ],
        },
        {
          heading: 'International Visitors',
          paragraphs: [
            'Eternal Longevity is operated from the United States and our services are available only to U.S. residents. If you access the site from outside the U.S., your information will be transferred to and stored in the United States.',
          ],
        },
        {
          heading: 'Changes to This Policy',
          paragraphs: [
            'We may update this policy from time to time. If we make material changes that affect how we use your information, we will notify you by email and post a notice on our site at least 14 days before the changes take effect.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'Questions or concerns? Email privacy@eternallongevity.com or write to Privacy Officer, Eternal Longevity, Inc., Suite 2200, Hoboken, NJ 07030.',
          ],
        },
      ]}
      related={[
        { label: 'Terms of Service', href: '/legal/terms' },
        { label: 'Telehealth Informed Consent', href: '/legal/telehealth' },
        { label: 'Refund Policy', href: '/legal/refunds' },
      ]}
    />
  );
}
