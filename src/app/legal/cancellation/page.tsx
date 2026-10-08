import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA_OR,
} from '@/lib/site';

export const metadata: Metadata = pageMeta(
  '/legal/cancellation',
  'Cancellation Policy',
  'How to cancel a subscription or an order, what it costs, and when it takes effect.',
);

export default function CancellationPage() {
  return (
    <LegalLayout
      title="Cancellation Policy"
      effective="October 2026"
      lead={`You can cancel yourself, in your account, in a few seconds. There is no retention call, no cancellation fee, and no minimum term. This page states exactly how, and what happens to an order already in flight.`}
      sections={[
        {
          heading: `How to Cancel a Subscription`,
          paragraphs: [
            `Open Portal › Subscriptions and cancel there. It takes effect immediately and stops all future charges. You can also pause or change your plan there. You can also email ${SUPPORT_EMAIL} from the address on your account and we will cancel it for you within one business day.`,
            `We do not require a phone call, a reason, or notice. There is no cancellation fee and no minimum commitment.`,
          ],
        },
        {
          heading: `When It Takes Effect`,
          paragraphs: [
            `Cancelling stops future renewals. It does not reverse a cycle that has already been billed and shipped, because a compounded preparation cannot be re-dispensed once it leaves the pharmacy.`,
            `If you cancel after a renewal has been billed but before the pharmacy has shipped it, you get a full refund of that renewal.`,
            `A 12-month plan is billed once a year and ships in two boxes about six months apart. You can cancel anytime before the next annual billing, and it will not renew. The second box of a year you have already paid for ships unless you cancel before it is sent; cancel before then and we refund the unshipped second box, prorated. The first box is not refundable once compounding begins.`,
          ],
        },
        {
          heading: `Cancelling an Order Before Approval`,
          paragraphs: [
            `An order awaiting prescriber review can be cancelled at any time from your order page, at no cost — nothing has been charged yet.`,
            `Your saved card is charged when the prescriber approves. If that charge fails and we email you a payment link instead, you can leave it unpaid: the link expires after seven days and nothing is charged.`,
          ],
        },
        {
          heading: `After Payment`,
          paragraphs: [
            `Once you have paid, contact us immediately at ${SUPPORT_EMAIL}. If the pharmacy has not begun compounding, we cancel and refund in full. Once compounding has started, the preparation has been made for you individually and cannot be refunded. Our Refund Policy has the detail.`,
          ],
        },
        {
          heading: `Closing Your Account`,
          paragraphs: [
            `To close your account entirely rather than just cancel a subscription, email ${SUPPORT_EMAIL}. We retain medical records for the period required by the law of the state you were treated in (${SERVICE_AREA_OR}) even after an account is closed — that retention is a legal obligation, not a choice.`,
          ],
        },
        {
          heading: `Contact`,
          paragraphs: [
            `Questions? Email ${SUPPORT_EMAIL}, or write to ${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}.`,
          ],
        },
      ]}
      related={[
        { label: 'Refund Policy', href: '/legal/refunds' },
        { label: 'Terms of Service', href: '/legal/terms' },
        { label: 'Shipping & Delivery Policy', href: '/legal/shipping' },
      ]}
    />
  );
}
