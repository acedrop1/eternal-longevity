import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'State Availability',
  description: 'Where we can legally prescribe and ship, and why the list is short.',
};

export default function StateAvailabilityPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="State Availability"
      effective="September 2026"
      lead={`Two independent licences gate every order: a prescriber licensed in your state, and a pharmacy registered to dispense into it. Both must be true. Today both are true in exactly one state.`}
      sections={[
        {
          heading: `Where We Operate`,
          paragraphs: [
            `We serve ${SERVICE_AREA} only. Our prescriber is licensed there, and our partner pharmacy holds the registration required to ship prescriptions into it.`,
            `We do not operate internationally, and we do not ship to P.O. boxes, freight forwarders, or APO/FPO addresses.`,
          ],
        },
        {
          heading: `Why Only One State`,
          paragraphs: [
            `Telehealth prescribing is regulated state by state. A physician may only prescribe to a patient located in a state where that physician holds a licence, and an out-of-state pharmacy may only ship into a state where it holds a non-resident pharmacy registration.`,
            `Neither of those is a formality that can be worked around, and we would rather serve one state properly than claim a national footprint we cannot lawfully supply.`,
          ],
        },
        {
          heading: `Enforced at Checkout, Not by Trust`,
          paragraphs: [
            `The restriction is enforced in software. An order with a shipping address outside ${SERVICE_AREA} is rejected before it reaches a prescriber. We do not accept orders we cannot lawfully fill, and we will not ship to a forwarding address used to route around this.`,
          ],
        },
        {
          heading: `If You Move`,
          paragraphs: [
            `If you relocate out of ${SERVICE_AREA}, tell us. We will stop your subscription rather than continue shipping into a state we are not licensed for. If you move into ${SERVICE_AREA}, update your address and we can resume.`,
          ],
        },
        {
          heading: `This May Change`,
          paragraphs: [
            `We expect to add states as prescriber licensure and pharmacy registrations are secured. Any expansion will be reflected here and at checkout. Availability shown at the time of your order is what governs it.`,
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
        { label: 'Patient Eligibility', href: '/legal/eligibility' },
        { label: 'Shipping & Delivery Policy', href: '/legal/shipping' },
        { label: 'Compliance', href: '/compliance' },
      ]}
    />
  );
}
