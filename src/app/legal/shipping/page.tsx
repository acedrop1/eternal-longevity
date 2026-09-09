import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy | Eternal Longevity',
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
      eyebrow="LEGAL"
      title="Shipping & Delivery Policy"
      effective="September 2026"
      lead="Every order is compounded to order by a licensed 503A pharmacy after a prescriber approves it, so the clock starts at approval and payment — not at the moment you place the order. This page sets out exactly how long each step takes, how your order travels, and what happens if something goes wrong in transit."
      sections={[
        {
          heading: 'Where We Ship',
          paragraphs: [
            `We currently ship only to residential and business addresses in ${SERVICE_AREA}. Our prescriber is licensed in ${SERVICE_AREA} and our partner pharmacy is registered to dispense there, and we will not ship a prescription into a state where both of those are not true.`,
            'We do not ship to P.O. boxes, freight forwarders, or addresses outside the United States. We cannot ship to a different name than the one on the prescription.',
          ],
        },
        {
          heading: 'Order Timeline',
          paragraphs: [
            'A typical order moves through four stages. Each stage begins only when the one before it finishes:',
          ],
          bullets: [
            'Prescriber review — within 24 hours of you submitting your order, and usually the same business day. Nothing is charged during this stage.',
            'Payment — you receive a secure payment link once your prescriber approves. The link is valid for 7 days.',
            'Compounding at the pharmacy — 1 to 3 business days after payment clears. Your medication is prepared individually; it is not pulled off a shelf.',
            'Transit — 1 to 3 business days once the carrier picks it up.',
          ],
        },
        {
          heading: 'Total Delivery Estimate',
          paragraphs: [
            'From payment to your door, expect 2 to 6 business days for most orders. Orders paid after 2:00 p.m. ET, on a weekend, or on a federal holiday begin compounding the next business day.',
            'Refill orders on an active subscription follow the same timeline, and we begin the prescriber review ahead of your refill date so that shipments do not gap.',
          ],
        },
        {
          heading: 'Cold-Chain Handling',
          paragraphs: [
            'Peptides are temperature-sensitive. Orders ship in an insulated container with a cold pack, by an expedited service, and are not held over a weekend in a carrier facility. Shipping is included in the price of every order — there is no separate shipping charge at checkout.',
            'Refrigerate your vials on arrival. If a package arrives warm to the touch, or the cold pack is fully thawed and the vials are at room temperature, do not use the contents. Photograph the package as it arrived and contact us the same day.',
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
            `If your shipment arrives damaged, leaking, or thermally compromised, email ${SUPPORT_EMAIL} within 7 days with photographs of the package and its contents. We will replace the affected vials at no cost. Full refund terms are in our Refund Policy.`,
          ],
        },
        {
          heading: 'Returns',
          paragraphs: [
            'Do not mail medication back to us. Federal and state pharmacy law prohibits a compounded preparation from being re-dispensed once it has left the pharmacy, so a returned package cannot be restocked, credited, or refunded. Dispose of unused vials through a pharmaceutical take-back program.',
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
