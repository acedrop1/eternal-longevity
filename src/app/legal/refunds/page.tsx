import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  STATEMENT_DESCRIPTOR,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Refund Policy | Eternal Longevity',
  description: 'When refunds are issued, when they are not, and how to request one.',
};

export default function RefundsPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Refund Policy"
      effective="May 2026"
      lead="We want you to feel good about every order. This policy explains when refunds are issued, when they are not, and how to request one. We try to be fair and transparent. And we say no when the rules require us to."
      sections={[
        {
          heading: 'Before the Pharmacy Ships',
          paragraphs: [
            'Your card is not charged until a licensed prescriber approves your order. If you cancel before approval, or if your order is declined or we are unable to fulfill it, nothing is charged. After approval, you can still cancel for a full refund at any point before the pharmacy begins compounding.',
            'Once the pharmacy has begun compounding, you are not eligible for a full refund. The compounded protocol has been prepared for you specifically.',
          ],
        },
        {
          heading: 'Compounded Medications',
          paragraphs: [
            'Under federal and state pharmacy law, compounded protocols cannot be re-dispensed once they leave the pharmacy. This means we are unable to refund an order that has already shipped, even if the package is unopened.',
            'This is a regulatory restriction, not a discretionary policy. It applies to every compounding pharmacy in the United States, including ours.',
          ],
        },
        {
          heading: 'Damaged or Lost Shipments',
          paragraphs: [
            `If your shipment arrives damaged, leaking, melted, or otherwise unusable, contact our support team within 7 days at ${SUPPORT_EMAIL} with photos. We will replace the affected vials at no cost.`,
            'If a shipment is lost in transit and the carrier confirms loss, we will resend the order at no cost.',
          ],
        },
        {
          heading: 'Adverse Reactions',
          paragraphs: [
            'If you experience a significant adverse reaction, stop dosing and consult your own healthcare provider. We do not refund the remaining vials in an active cycle, but we may offer an adjusted protocol or an alternative for the following cycle at our discretion.',
            'If you experience a reaction that meets the criteria of a medical emergency, call 911 or go to the nearest emergency room first.',
          ],
        },
        {
          heading: 'Subscriptions',
          paragraphs: [
            'You may pause or cancel a subscription at any time between cycles. Any cycle that has already been billed and shipped is not refundable. If you cancel after a renewal is billed but before the pharmacy ships, you are eligible for a full refund of the renewal charge.',
            'Pricing changes communicated by email at least 30 days in advance apply to renewals processed after the change date.',
          ],
        },
        {
          heading: 'Returns',
          paragraphs: [
            'Do not mail unused compounded protocols back to us. Per pharmacy regulations, we cannot accept it, and it will not be refunded. Dispose of unused vials per the product instructions or through your local pharmaceutical-take-back program.',
          ],
        },
        {
          heading: 'Disputes',
          paragraphs: [
            `Charges from us appear on your statement as ${STATEMENT_DESCRIPTOR}. If you do not recognise a charge, that is us — check your order history in the member portal before anything else.`,
          `If you believe a charge is in error, contact us at ${SUPPORT_EMAIL} before initiating a chargeback. We aim to resolve billing disputes within five business days, and we would rather refund you directly than argue with your bank. Initiating a chargeback without first contacting us only delays resolution.`,
          ],
        },
        {
          heading: 'How to Request a Refund',
          paragraphs: [
            `Eligible refund requests can be made by emailing ${SUPPORT_EMAIL} with your order number and a brief description of the issue. Refunds are processed to the original payment method within 5–10 business days of approval.`,
          ],
        },
        {
          heading: 'Changes',
          paragraphs: [
            'We may update this policy from time to time. Any changes will apply to orders placed after the effective date and will be posted here at least 14 days before they take effect.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            `Questions? Email ${SUPPORT_EMAIL} or write to ${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}.`,
          ],
        },
      ]}
      related={[
        { label: 'Terms of Service', href: '/legal/terms' },
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Informed Consent & Product Acknowledgement', href: '/legal/consent' },
        { label: 'Shipping & Delivery Policy', href: '/legal/shipping' },
      ]}
    />
  );
}
