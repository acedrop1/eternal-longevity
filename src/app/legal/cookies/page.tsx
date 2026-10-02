import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { LegalLayout } from '@/components/legal/LegalLayout';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SERVICE_AREA,
} from '@/lib/site';

export const metadata: Metadata = pageMeta(
  '/legal/cookies',
  'Cookie Notice',
  'The cookies and browser storage this site uses, the third-party services that set their own at checkout, and the tracking we deliberately do not do.',
);

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Notice"
      effective="October 2026"
      lead={`This is a short page because we keep very little in your browser. We run no analytics and no advertising pixels on this site. The few things we do store are there to make the site work, and two services we rely on at checkout (Stripe and Google) set or use their own, described below.`}
      sections={[
        {
          heading: `What We Set`,
          paragraphs: [
            `Only strictly necessary cookies:`,
          ],
          bullets: [
            `A session cookie that keeps you signed in to your member portal and identifies your requests to our server.`,
            `Standard security cookies used to prevent cross-site request forgery.`,
          ],
        },
        {
          heading: `What We Keep in Your Browser`,
          paragraphs: [
            `Some things are saved in your browser's local storage rather than in a cookie. They stay on your device and are not sent to us with each request:`,
          ],
          bullets: [
            `Your cart (stored under the name el_cart_v1), so it is still there when you come back. Once you are signed in, your cart is saved to your account instead.`,
            `Your progress on an assessment you haven't finished, for up to 30 days. This covers your contact details and a few basics, such as your state, date of birth and the area of care you chose. It never includes your health answers.`,
            `The shipping details you type at checkout, kept only for that browser tab until you place your order.`,
          ],
        },
        {
          heading: `Saved to Your Account`,
          paragraphs: [
            `If you are signed in while you complete an assessment, your answers are saved to your account as you go, so you can pick up where you left off on any device. The draft is deleted when you submit it, and drafts older than 30 days are not offered again.`,
          ],
        },
        {
          heading: `Third-Party Services at Checkout`,
          paragraphs: [
            `Two services we use at checkout load their own code and may set or read their own cookies:`,
          ],
          bullets: [
            `Stripe processes payments. On the pages where you enter a card, Stripe's script sets cookies used to detect and prevent fraud. Stripe's own privacy policy governs that data.`,
            `Google Places suggests addresses as you type your shipping address. Google receives what you type in that field, not your health information.`,
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
            `Because what we store is needed for the site to work, there is no consent banner — blocking it signs you out and breaks checkout. Your browser can block or clear cookies and site storage for any site, including this one, through its own settings.`,
          ],
        },
        {
          heading: `Do Not Track`,
          paragraphs: [
            `We do not track you across sites for analytics or advertising, so a Do Not Track signal has nothing to change about our behaviour.`,
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
