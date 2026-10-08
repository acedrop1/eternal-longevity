import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  STATEMENT_DESCRIPTOR,
  SERVICE_AREA,
  SERVICE_AREA_OR,
} from '@/lib/site';
import { getShippingSettings } from '@/lib/shipping-settings';

export const metadata: Metadata = pageMeta(
  '/legal/terms',
  'Terms of Service',
  'The agreement that governs your use of Eternal Longevity.',
);

// The shipping price is edited in Admin → Settings; pick up a change within minutes.
export const revalidate = 300;

export default async function TermsPage() {
  const { pricePerShipment: per, firstOrderFree } = await getShippingSettings();
  const shipLine =
    per === 0
      ? 'Shipping is free.'
      : `Shipping is $${per} per box, including each plan renewal${firstOrderFree ? '; the first box of your first paid order ships free' : ''}.`;
  return (
    <LegalLayout
      title="Terms of Service"
      effective="October 2026"
      lead="These Terms of Service govern your use of the telehealth practice operated by Eternal Longevity LLC (“Eternal Longevity,” “we,” “us”), including our website, member portal, and any medications prescribed through it and dispensed by our partner pharmacy. By using any part of our service, you agree to these terms."
      sections={[
        {
          heading: 'Eligibility & Account',
          paragraphs: [
            `You must be at least 18 years old and located in ${SERVICE_AREA_OR} to use our service. You are responsible for the accuracy of the information you provide and for the security of your account credentials.`,
            'We may refuse or terminate service if information is materially incorrect, if continuing to fulfill your orders would be unsafe, or if your conduct violates these terms.',
          ],
        },
        {
          heading: 'Our Practice & Fulfillment',
          paragraphs: [
            `Eternal Longevity is an asynchronous telehealth practice. Dr. Bader Elder, DO, a physician licensed in ${SERVICE_AREA}, reviews your intake and decides whether to prescribe. He may decline, or ask for more information first. Approved prescriptions are dispensed and shipped by a state-licensed 503A compounding pharmacy (named on your prescription label). Your use of the service is also governed by our Telehealth Informed Consent.`,
            'General information on our website, such as product descriptions and articles, is not medical advice for you. Care is limited to the treatments we offer and is not a substitute for a primary care provider; keep your own doctor informed of what you take.',
          ],
        },
        {
          heading: 'Compounded Medications',
          paragraphs: [
            'Compounded medications are prepared for an individual patient by a state-licensed 503A pharmacy. They are not FDA-approved; the FDA does not verify their safety, effectiveness or quality.',
            'Not every treatment is appropriate for everyone. Whether to prescribe is the prescriber’s decision, based on the information you provide.',
          ],
        },
        {
          heading: 'Pricing & Billing',
          paragraphs: [
            `Pricing for each product is shown on the relevant product page at the time of checkout, in U.S. dollars. ${shipLine} It is the same for 2-day and overnight cold-chain delivery and is shown at checkout before you order. No sales tax is charged on prescription medications. There are no membership fees, consultation fees, or other charges beyond the price and shipping shown.`,
            'All payments are processed by our payment processor, a PCI-DSS compliant service provider. We do not receive or store your full card number.',
          ],
        },
        {
          heading: 'When You Are Charged',
          paragraphs: [
            'At checkout you save a card with our payment processor. Saving it does not charge you. Your intake then goes to the prescriber for review.',
            'If the prescriber approves, we charge that saved card for the plan you chose, without you needing to be present. If the prescriber declines, you are not charged. If the saved card cannot be charged, we email you a secure link to pay, and nothing ships until payment goes through.',
            `Charges from us appear on your statement as ${STATEMENT_DESCRIPTOR}. No medication name appears on your card statement.`,
          ],
        },
        {
          heading: 'Subscriptions & Cancellation',
          paragraphs: [
            'Treatment is sold as a plan that renews monthly, every three months, every six months or, for some medications, every twelve months. By choosing a plan at checkout, you authorise us to charge your saved card at the start of each period until the plan ends. A 12-month plan is billed once a year, up front, and ships in two boxes about six months apart; shipping for both boxes is charged with the year.',
            'Renewals ship on the same prescription, without a new review by the prescriber, until the prescription expires or runs out of refills. At that point the plan pauses until the prescriber reviews it again. The prescriber can pause or stop a plan at any time, and a new product always needs a new review.',
            `You can pause, change, or cancel your plan at any time from Portal › Subscriptions, or by emailing ${SUPPORT_EMAIL}. There is no cancellation fee, no minimum term, and no requirement to call anyone. Cancelling stops all future charges; it does not refund a supply the pharmacy has already prepared. See our Refund Policy.`,
          ],
        },
        {
          heading: 'Cancellations & Refunds',
          paragraphs: [
            'Compounded medications that have already been prepared or shipped are not refundable, because under pharmacy law they cannot be re-dispensed once they leave the pharmacy.',
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
            'Attempt to interfere with the integrity or security of the service.',
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
        { label: 'Telehealth Informed Consent', href: '/legal/consent' },
        { label: 'Refund Policy', href: '/legal/refunds' },
        { label: 'Shipping & Delivery Policy', href: '/legal/shipping' },
      ]}
    />
  );
}
