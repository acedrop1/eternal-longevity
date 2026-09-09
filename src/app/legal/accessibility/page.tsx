import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Accessibility Statement | Eternal Longevity',
  description: 'Our commitment to WCAG 2.1 Level AA, known gaps, and how to tell us about a barrier.',
};

export default function AccessibilityPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Accessibility Statement"
      effective="September 2026"
      lead={`Health services should not be harder to use because of a disability. We build against WCAG 2.1 Level AA. We do not claim to have got everything right, so this page also tells you how to report what we have missed.`}
      sections={[
        {
          heading: `Our Standard`,
          paragraphs: [
            `We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA. In practice that means keyboard access to every interactive control, visible focus states, text alternatives for meaningful images, semantic headings and landmarks, and colour contrast that meets the AA ratio.`,
            `Accessibility is checked as part of building a page, not audited once a year and forgotten.`,
          ],
        },
        {
          heading: `Known Limitations`,
          paragraphs: [
            `Some third-party components we embed — most notably the payment form, which is provided by our payment processor — are outside our direct control. If one of them creates a barrier for you, tell us and we will find another way to complete the task with you.`,
          ],
        },
        {
          heading: `Getting Help Another Way`,
          paragraphs: [
            `If any part of this site is unusable for you, we will complete it with you directly. Email ${SUPPORT_EMAIL} and we will take your order, answer clinical questions, and arrange payment without you needing to use the interface that is blocking you.`,
          ],
        },
        {
          heading: `Reporting a Barrier`,
          paragraphs: [
            `Email ${SUPPORT_EMAIL} with the page, what you were trying to do, and the assistive technology and browser you were using. We treat accessibility reports as bugs, not suggestions, and we will tell you what we have done about it.`,
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
        { label: 'Contact', href: '/contact' },
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Terms of Service', href: '/legal/terms' },
      ]}
    />
  );
}
