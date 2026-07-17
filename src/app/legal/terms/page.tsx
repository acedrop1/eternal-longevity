import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service | Eternal Longevity',
  description: 'The agreement that governs your use of Eternal Longevity.',
};

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Terms of Service"
      effective="May 2026"
      lead="These Terms of Service govern your access to and use of Eternal Longevity, Inc. (“Eternal Longevity,” “we,” “us”) and our products, including the website, product catalog, and any compounded peptide protocols fulfilled by our licensed 503A pharmacy partners. By using any part of our service, you agree to these terms."
      sections={[
        {
          heading: 'Eligibility & Account',
          paragraphs: [
            'You must be at least 18 years old and a legal resident of a U.S. state in which we are authorized to sell our products to use our platform. You are responsible for the accuracy of the information you provide when you order and for the security of your account credentials.',
            'We may refuse or terminate service if information is materially incorrect, if continuing to fulfill your orders would be unsafe, or if your conduct violates these terms.',
          ],
        },
        {
          heading: 'Our Store & Fulfillment',
          paragraphs: [
            'Eternal Longevity operates an online store for compounded peptide protocols. Orders you place are fulfilled by U.S.-licensed 503A compounding pharmacies that operate independently of Eternal Longevity. Eternal Longevity provides the technology platform, the product catalog, and customer support for the store.',
            'Nothing on our platform is medical advice, diagnosis, or a substitute for consulting your own healthcare provider. Product information is general in nature and is based on the information you provide. You agree to provide accurate information and to consult your own healthcare provider before using any protocol.',
          ],
        },
        {
          heading: 'Compounded Medications',
          paragraphs: [
            'Compounded peptide protocols offered through our store are compounded by U.S.-licensed 503A pharmacies operating under state-board oversight. Compounded protocols are prepared for individual customers and are not FDA-approved as a finished product.',
            'You acknowledge that some peptides and compounds offered may not be appropriate for everyone, and that you are responsible for consulting your own healthcare provider before use.',
          ],
        },
        {
          heading: 'Pricing & Billing',
          paragraphs: [
            'Pricing for each protocol is shown on the relevant product page at the time of checkout. Subscriptions auto-renew on the cadence selected (monthly, quarterly, or annually) until cancelled. You may pause or cancel at any time between cycles through your member portal.',
            'All payments are processed by a third-party payment processor. We do not store full payment card information on our servers. Taxes and shipping are included unless otherwise stated at checkout.',
          ],
        },
        {
          heading: 'Cancellations & Refunds',
          paragraphs: [
            'You may cancel a subscription between cycles at any time. Compounded protocols that have already been prepared or shipped are not refundable, because under federal and state pharmacy law compounded protocols cannot be re-dispensed once they leave the pharmacy.',
            'If a shipment is damaged in transit or arrives in a non-usable condition, contact our support team within 7 days and we will replace it at no cost. See the Refund Policy for details.',
          ],
        },
        {
          heading: 'Acceptable Use',
          paragraphs: [
            'You agree not to:',
          ],
          bullets: [
            'Resell, share, or transfer any product received through our service.',
            'Use the service in any way that violates applicable law, including controlled-substance laws.',
            'Attempt to interfere with the integrity or security of the platform.',
            'Submit false or fraudulent information when placing an order.',
            'Impersonate another person or misrepresent your identity.',
          ],
        },
        {
          heading: 'Intellectual Property',
          paragraphs: [
            'The Eternal Longevity name, logo, content, and all related marks are owned by Eternal Longevity, Inc. and are protected by U.S. trademark, copyright, and other intellectual-property laws. You may not use these marks without our prior written permission.',
          ],
        },
        {
          heading: 'Disclaimers',
          paragraphs: [
            'The service is provided “as is” without warranties of any kind, whether express or implied. Eternal Longevity does not warrant that the service will be uninterrupted or error-free. Health-information content on our site is general in nature, is not medical advice, and is not a substitute for consulting your own healthcare provider.',
          ],
        },
        {
          heading: 'Limitation of Liability',
          paragraphs: [
            'To the maximum extent permitted by law, Eternal Longevity, its officers, employees, and contractors will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly. Our aggregate liability for direct damages is limited to the amount you paid us in the twelve months preceding the claim.',
          ],
        },
        {
          heading: 'Governing Law',
          paragraphs: [
            'These terms are governed by the laws of the State of Delaware, without regard to its conflict-of-laws principles. Any dispute arising under these terms shall be resolved by binding arbitration administered by JAMS in accordance with its rules then in effect, except that you may bring qualifying claims in small-claims court.',
          ],
        },
        {
          heading: 'Changes to These Terms',
          paragraphs: [
            'We may update these terms from time to time. If we make material changes, we will notify you by email and post a notice on our website at least 14 days before the changes take effect. Your continued use of the service after the effective date constitutes acceptance of the updated terms.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'Questions about these terms? Email legal@eternallongevity.com or write to Eternal Longevity, Inc., Suite 2200, Hoboken, NJ 07030.',
          ],
        },
      ]}
      related={[
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Informed Consent & Product Acknowledgement', href: '/legal/telehealth' },
        { label: 'Refund Policy', href: '/legal/refunds' },
      ]}
    />
  );
}
