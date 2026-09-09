import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  STATEMENT_DESCRIPTOR,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The agreement that governs your use of Eternal Longevity.',
};

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Terms of Service"
      effective="May 2026"
      lead="These Terms of Service govern your access to and use of Eternal Longevity LLC (“Eternal Longevity,” “we,” “us”) and our products, including the website, product catalog, and any compounded peptide protocols fulfilled by our licensed 503A pharmacy partners. By using any part of our service, you agree to these terms."
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
            'Eternal Longevity provides access to prescription peptide protocols. Every order is reviewed by a licensed prescriber, and approved orders are fulfilled by U.S.-licensed 503A compounding pharmacies pursuant to a patient-specific prescription. Eternal Longevity provides the platform, the product catalog, and customer support.',
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
            'Pricing for each protocol is shown on the relevant product page at the time of checkout, in U.S. dollars. Taxes and shipping are included; there are no membership fees, consultation fees, or other charges beyond the price shown.',
            'All payments are processed by Stripe, a PCI-DSS Level 1 service provider. We do not receive or store your full card number.',
          ],
        },
        {
          heading: 'When You Are Charged',
          paragraphs: [
            'Placing an order does not charge you. No payment method is collected at checkout. Your order is first reviewed by a licensed prescriber, and only if that prescriber approves it do we email you a secure link to pay. If your order is declined, or you simply never use the link, you are never charged anything.',
            'Because approval comes first, the charge you authorise on that payment page is taken immediately when you submit it — there is no separate hold or later capture.',
            `Charges from us appear on your statement as ${STATEMENT_DESCRIPTOR}. Neither the name of any medication nor the word “peptide” appears on your statement, your bank records, or any receipt we send.`,
          ],
        },
        {
          heading: 'Subscriptions & Cancellation',
          paragraphs: [
            'If you select a recurring cadence, your subscription renews on that cadence — monthly, quarterly, or annually — until you cancel. You authorise each renewal when you check the billing authorisation box on the payment page, and we email you before a renewal is billed.',
            'Every renewal is still subject to prescriber review. A cycle your prescriber does not approve is not compounded, not shipped, and not charged.',
            `You may cancel at any time, effective immediately, from the Subscriptions page of your member portal, or by emailing ${SUPPORT_EMAIL}. There is no cancellation fee, no minimum term, and no requirement to call anyone. Cancelling stops all future charges; it does not refund a cycle the pharmacy has already prepared. See our Refund Policy.`,
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
            'The Eternal Longevity name, logo, content, and all related marks are owned by Eternal Longevity LLC and are protected by U.S. trademark, copyright, and other intellectual-property laws. You may not use these marks without our prior written permission.',
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
            'These terms are governed by the laws of the State of New Jersey, without regard to its conflict-of-laws principles. Any dispute arising under these terms shall be resolved by binding arbitration administered by JAMS in accordance with its rules then in effect, seated in Passaic County, New Jersey, except that you may bring qualifying claims in small-claims court.',
            'Nothing in these terms limits any right you have under the New Jersey Consumer Fraud Act or any other right that cannot be waived by agreement.',
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
            `Questions about these terms? Email ${SUPPORT_EMAIL} or write to ${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}.`,
          ],
        },
      ]}
      related={[
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Informed Consent & Product Acknowledgement', href: '/legal/consent' },
        { label: 'Refund Policy', href: '/legal/refunds' },
        { label: 'Shipping & Delivery Policy', href: '/legal/shipping' },
      ]}
    />
  );
}
