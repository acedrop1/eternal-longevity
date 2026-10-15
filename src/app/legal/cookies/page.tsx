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
  'The cookies and browser storage this site uses, the third-party services that set their own at checkout, and the optional advertising and analytics technologies we ask about first.',
);

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Notice"
      effective="October 2026"
      lead={`We keep very little in your browser. Most of what we store is there to make the site work, and two services we rely on at checkout (Frame Payments and Google) set or use their own. On our marketing pages we also ask whether we and our advertising and analytics partners may use tracking technologies. None of them load unless you consent.`}
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
            `The tags on the link that brought you here, if any (for example, that you came from our email), kept for up to 30 days as el_attr, and a note that this browser visit has been counted. We use these only to count, on our own servers and without identifying you, which links and pages bring visitors and patients. They are never shared with advertising platforms.`,
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
            `Frame Payments processes payments. On the pages where you enter a card, its script may set cookies and collects device and browser signals used to detect and prevent fraud. Frame Payments' own privacy policy governs that data.`,
            `Google Places suggests addresses as you type your shipping address. Google receives what you type in that field, not your health information.`,
          ],
        },
        {
          heading: `Advertising and Analytics (Optional)`,
          paragraphs: [
            `On our marketing pages (home, shop, treatment and product pages, About, FAQ, Compliance and Contact) we ask for your consent before we or our advertising and analytics partners, such as Meta and Google, use cookies, pixels and similar tracking technologies. With your consent, they collect information about you and your visit, including the pages you view, links you click, your browser and device, and your IP address. This may include sensitive health information, such as the fact that you viewed a page about a particular treatment. We and our partners use it to measure and improve our advertising, personalize ads you see on other sites and apps, and improve our services. If you do not consent, these technologies do not load.`,
            `Even with your consent, there are limits:`,
          ],
          bullets: [
            `They never load on your assessment, checkout, payment, sign-in or member portal pages. If one was loaded earlier in your visit, opening one of those pages reloads the page so no partner code runs there.`,
            `We never send partners your intake answers, prescriptions, medical records, or your name, email or phone number.`,
            `Each partner's own privacy policy governs what it does with the information it collects.`,
          ],
        },
        {
          heading: `Your Choice`,
          paragraphs: [
            `You can change your mind at any time with the "Your Privacy Choices" link in the footer of every page. If you withdraw consent, these technologies stop loading straight away. Your choice is saved in your browser's local storage (as el_ad_consent).`,
            `The strictly necessary cookies and storage above cannot be switched off without breaking sign-in and checkout. Your browser can still block or clear them for any site, including this one.`,
          ],
        },
        {
          heading: `Global Privacy Control and Do Not Track`,
          paragraphs: [
            `If your browser sends a Global Privacy Control signal, we treat it as a decline: our advertising and analytics technologies never load and we do not ask. We do not track you across other sites ourselves.`,
          ],
        },
        {
          heading: `If This Changes`,
          paragraphs: [
            `If we add or change advertising or analytics partners, we will update this page. They will only ever load with your consent, and never on your assessment, checkout or member portal.`,
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
