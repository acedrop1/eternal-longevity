import type { Metadata } from 'next';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Cookie Notice',
  description: 'The cookies this site sets — all of them strictly necessary — and the tracking we deliberately do not do.',
};

export default function CookiesPage() {
  return (
    <LegalLayout
      eyebrow="LEGAL"
      title="Cookie Notice"
      effective="September 2026"
      lead={`This is a short page because we set very few cookies. We run no analytics, no advertising pixels, and no third-party trackers of any kind on this site. That is a deliberate choice, and it is the reason this notice has nothing to opt out of.`}
      sections={[
        {
          heading: `What We Set`,
          paragraphs: [
            `Only strictly necessary cookies:`,
          ],
          bullets: [
            `A session cookie that keeps you signed in to your member portal and identifies your requests to our server.`,
            `A cookie that maintains your cart between pages.`,
            `Standard security cookies used to prevent cross-site request forgery.`,
          ],
        },
        {
          heading: `What We Do Not Set`,
          paragraphs: [
            `We do not run Google Analytics, a Meta pixel, TikTok, or any other advertising or analytics tag. We do not build advertising profiles, we do not run retargeting, and we never share health information — or the fact that you visited a particular product page — with an advertising network.`,
            `This is worth stating plainly because the largest privacy enforcement actions in consumer telehealth have been about exactly that practice.`,
          ],
        },
        {
          heading: `Managing Cookies`,
          paragraphs: [
            `Because the cookies we set are strictly necessary, there is nothing here to opt out of — blocking them signs you out and breaks checkout. Your browser can block or clear cookies for any site, including this one, through its own settings.`,
          ],
        },
        {
          heading: `Do Not Track`,
          paragraphs: [
            `We do not track you across sites, so a Do Not Track signal has nothing to change about our behaviour.`,
          ],
        },
        {
          heading: `If This Changes`,
          paragraphs: [
            `If we ever add analytics, we will update this page and put a consent banner in front of it before anything loads. Health information will not be shared with advertising platforms in any case.`,
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
        { label: 'Privacy Policy', href: '/legal/privacy' },
        { label: 'Terms of Service', href: '/legal/terms' },
      ]}
    />
  );
}
