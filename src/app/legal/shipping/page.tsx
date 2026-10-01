import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';
import { SHIPPING_PRICE } from '@/lib/shipping';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy',
  description:
    'How long orders take, how they ship, where we deliver, and what to do if a package is late, lost, or damaged.',
};

/**
 * Card processors want a fulfilment policy with real timeframes on the site
 * before they will underwrite a physical-goods merchant, and "I never received
 * it" is one of the two dispute reasons that actually go to arbitration. Every
 * window below is a commitment, so keep them honest rather than flattering.
 */
export default function ShippingPage() {
  return (
    <LegalLayout
      title="Shipping & Delivery Policy"
      effective="October 2026"
      lead="Every order is prepared by a licensed 503A pharmacy after a prescriber approves it, so the clock starts at approval — not at the moment you place the order. This page sets out how long each step typically takes, how your order travels, and what happens if something goes wrong in transit."
      sections={[
        {
          heading: 'Where We Ship',
          paragraphs: [
            `We currently ship only to residential and business addresses in ${SERVICE_AREA}. Our prescriber is licensed in each of those states and our partner pharmacy is registered to dispense into each of them, and we will not ship a prescription into a state where both of those are not true.`,
            'We do not ship to P.O. boxes, freight forwarders, or addresses outside the United States. We cannot ship to a different name than the one on the prescription.',
          ],
        },
        {
          heading: 'Order Timeline',
          paragraphs: [
            'A typical order moves through three stages. Each stage begins only when the one before it finishes:',
          ],
          bullets: [
            'Prescriber review — a physician usually reviews your intake within 1 business day. He may ask you questions first, which adds time. Your card is saved at checkout but nothing is charged during this stage.',
            'Approval and payment — when the prescriber approves, the card you saved is charged for the plan you chose and the prescription goes to the pharmacy. If that card cannot be charged, we email you a secure link to pay; nothing ships until payment goes through.',
            'Preparation and shipping — after approval, the pharmacy typically prepares and ships within a few business days, then the carrier delivers.',
          ],
        },
        {
          heading: 'Shipping Cost',
          paragraphs: [
            `Shipping is charged per shipment and set by the medication, not chosen at checkout: $${SHIPPING_PRICE.OVERNIGHT} for overnight cold-chain (temperature-sensitive medications) and $${SHIPPING_PRICE['2_DAY']} for 2-day service (everything else). The amount is shown on the product page and at checkout before you place your order.`,
            'Every shipment is charged shipping, including each refill on a plan. Each renewal charge is the plan price plus shipping for that shipment, and the checkout authorization states the combined amount.',
            'Refills on an active plan ship on their scheduled date on the same prescription, without a new review, and follow the same preparation and shipping timeline.',
          ],
        },
        {
          heading: 'Beyond-Use Date & Testing',
          paragraphs: [
            'Compounded preparations carry a beyond-use date rather than a manufacturer expiry. The pharmacy dates each supply, and the date is printed on the label; it varies by preparation. Do not use a medication past its beyond-use date.',
            `Each batch is tested by the pharmacy as required for its preparation type. A certificate of analysis for the lot your order came from is available on request — email ${SUPPORT_EMAIL} with your order number.`,
          ],
        },
        {
          heading: 'Cold-Chain Handling',
          paragraphs: [
            'Temperature-sensitive medications ship overnight cold-chain, in an insulated container with a cold pack. Other medications ship by 2-day service.',
            'Store your medication as its label says. If a cold-chain package arrives warm to the touch, or the cold pack is fully thawed and the medication is at room temperature, do not use the contents. Photograph the package as it arrived and contact us the same day.',
          ],
        },
        {
          heading: 'Tracking',
          paragraphs: [
            'You receive a tracking number by email as soon as the pharmacy hands your package to the carrier, and the same tracking is shown on your order in the member portal. Tracking can take several hours to begin updating after it is issued.',
            'Packages are shipped in plain, unbranded outer packaging. Nothing on the outside identifies the contents or the pharmacy.',
          ],
        },
        {
          heading: 'Signature & Delivery Address',
          paragraphs: [
            'Some shipments require an adult signature at delivery. If nobody is available, the carrier will attempt redelivery or hold the package at a local facility — collect it promptly, because a package left in a facility past the carrier’s hold window is returned to the pharmacy and cannot be re-dispensed.',
            'You are responsible for the accuracy of the address you enter. We cannot redirect a package once the pharmacy has shipped it, and a shipment sent to an address entered incorrectly is not eligible for a refund or a free replacement.',
          ],
        },
        {
          heading: 'Late, Lost, or Damaged Shipments',
          paragraphs: [
            `If tracking has not updated for three business days, or your package is confirmed lost by the carrier, contact us at ${SUPPORT_EMAIL} with your order number. We will open a carrier trace and, once loss is confirmed, resend your order at no cost to you.`,
            `If your shipment arrives damaged, leaking, or thermally compromised, email ${SUPPORT_EMAIL} within 7 days with photographs of the package and its contents. We will replace the affected medication at no cost. Full refund terms are in our Refund Policy.`,
          ],
        },
        {
          heading: 'Returns',
          paragraphs: [
            'Do not mail medication back to us. Federal and state pharmacy law prohibits a compounded preparation from being re-dispensed once it has left the pharmacy, so a returned package cannot be restocked, credited, or refunded. Dispose of unused medication through a pharmaceutical take-back program.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            `Questions about a shipment? Email ${SUPPORT_EMAIL} with your order number, or write to ${BUSINESS_LEGAL_NAME}, ${BUSINESS_ADDRESS}.`,
          ],
        },
      ]}
      related={[
        { label: 'Refund Policy', href: '/legal/refunds' },
        { label: 'Terms of Service', href: '/legal/terms' },
        { label: 'Privacy Policy', href: '/legal/privacy' },
      ]}
    />
  );
}
