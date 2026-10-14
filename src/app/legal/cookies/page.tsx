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
  'The cookies and browser storage this site uses, the third-party services that set their own at checkout, and the one optional advertising cookie we ask about first.',
);

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Notice"
      effective="October 2026"
      lead={`We keep very little in your browser. Most of what we store is there to make the site work, and two services we rely on at checkout (Frame Payments and Google) set or use their own. On our marketing pages we also ask whether we may use one advertising cookie, Meta's, to measure our ads. Nothing about it loads unless you say yes.`}
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
            `Frame Payments processes payments. On the pages where you enter a card, its script may set cookies and collects device and browser signals used to detect and prevent fraud. Frame Payments' own privacy policy governs that data.`,
            `Google Places suggests addresses as you type your shipping address. Google receives what you type in that field, not your health information.`,
          ],
        },
        {
          heading: `Advertising Cookie (Optional)`,
          paragraphs: [
            `On our marketing pages (home, shop, treatment and product pages, About, FAQ, Compliance and Contact) we ask whether we may use the Meta Pixel, an advertising cookie from Meta Platforms. If you choose Accept, it lets us count visits from our ads and tell Meta when someone taps through to start an assessment, so we can measure and improve our advertising. If you choose Decline, or never choose, it does not load.`,
            `Even with your consent, it is limited:`,
          ],
          bullets: [
            `It never loads on your assessment, checkout, payment, sign-in or member portal pages. If it was loaded earlier in your visit, opening one of those pages reloads the page so no Meta code runs there.`,
            `We never send Meta your health answers, your conditions, your prescriptions, what you ordered, or your name, email or phone number.`,
            `Meta does receive the address of the marketing page you are on (which can include a product page) and standard browser details, as with any website pixel. Meta's own privacy policy governs what it does with them.`,
            `We do not run Google Analytics, TikTok, or any other analytics or advertising tag.`,
          ],
        },
        {
          heading: `Your Choice`,
          paragraphs: [
            `You can change your mind at any time with the "Cookie Choices" link in the footer of every page. If you withdraw consent, the pixel stops loading straight away. Your choice is saved in your browser's local storage (as el_ad_consent).`,
            `The strictly necessary cookies and storage above cannot be switched off without breaking sign-in and checkout. Your browser can still block or clear them for any site, including this one.`,
          ],
        },
        {
          heading: `Global Privacy Control and Do Not Track`,
          paragraphs: [
            `If your browser sends a Global Privacy Control signal, we treat it as Decline: the advertising cookie never loads and we do not ask. We do not track you across other sites ourselves.`,
          ],
        },
        {
          heading: `If This Changes`,
          paragraphs: [
            `If we add any other analytics or advertising tool, we will update this page first and ask for your consent before it loads. Health information will not be shared with advertising platforms in any case.`,
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
