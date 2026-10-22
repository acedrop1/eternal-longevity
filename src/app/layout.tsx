import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import {
  BUSINESS_ADDRESS,
  BUSINESS_LEGAL_NAME,
  META_DOMAIN_VERIFICATION,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from '@/lib/site';
import { SmoothScroll } from '@/components/ui/SmoothScroll';
import { AdPixel } from '@/components/analytics/AdPixel';
import { SiteTracker } from '@/components/analytics/SiteTracker';
import './globals.css';
import { CatalogProvider } from '@/components/catalog/CatalogProvider';
import { getLiveProducts, toShopProduct } from '@/lib/catalog';

// Geist carries the whole brand (UI and headlines). The Mulish, Instrument
// Sans and DM Mono loaders were dropped: tailwind's display/mono stacks point
// at Geist, so they were preloaded on every page and never rendered.
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

// '825 Riverview Dr, Floor 2, Totowa, NJ 07512' → schema.org PostalAddress.
const addr = BUSINESS_ADDRESS.split(', ');
const [region, postalCode] = addr.at(-1)!.split(' ');
const ORG_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'MedicalBusiness',
  name: SITE_NAME,
  legalName: BUSINESS_LEGAL_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  description: SITE_DESCRIPTION,
  email: SUPPORT_EMAIL,
  telephone: SUPPORT_PHONE,
  address: {
    '@type': 'PostalAddress',
    streetAddress: addr.slice(0, -2).join(', '),
    addressLocality: addr.at(-2),
    addressRegion: region,
    postalCode,
    addressCountry: 'US',
  },
};

const CRASH_REPORTER = `(function(){var n=0;function send(w,e){try{if(n++>=5)return;var m=e&&(e.message||e.reason&&e.reason.message||String(e.reason||e));var st=e&&(e.error&&e.error.stack||e.reason&&e.reason.stack)||'';var b=JSON.stringify({where:w,message:String(m||'').slice(0,500),stack:String(st).split('\\n').slice(0,6).join('\\n').slice(0,1500),path:location.pathname});if(!(navigator.sendBeacon&&navigator.sendBeacon('/api/client-error',new Blob([b],{type:'application/json'}))))fetch('/api/client-error',{method:'POST',body:b,keepalive:true,headers:{'content-type':'application/json'}})}catch(_){}}window.addEventListener('error',function(e){send('window',e)});window.addEventListener('unhandledrejection',function(e){send('promise',e)})})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  keywords: [
    'telehealth',
    'longevity',
    'hair',
    'skin',
    'sexual health',
    'hormones',
    '503A pharmacy',
  ],
  // SVG for browsers that take it, PNGs (app/icon.png, app/apple-icon.png) for the rest and iOS.
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: { url: '/apple-icon.png', sizes: '180x180' },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  ...(META_DOMAIN_VERIFICATION ? { other: { 'facebook-domain-verification': META_DOMAIN_VERIFICATION } } : {}),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  // env(safe-area-inset-*) is 0 without this, so the buy bar could sit on the iPhone home indicator.
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Live catalogue (Admin → Products), handed to client components once.
  // Slimmed: client consumers (cart, checkout lines, menus, rails, FAQ prices)
  // read only ids, names, images, pricing, storage and category. The long PDP
  // copy is server-rendered by the product page itself, so it's emptied here
  // instead of being serialised into every page's payload.
  const products = (await getLiveProducts()).map((p) => ({
    ...toShopProduct(p),
    shortDescription: '',
    longDescription: '',
    bestFor: '',
    benefits: [],
    whatsIncluded: [],
    gallery: [],
    sideEffects: [],
    contraindications: [],
  }));

  return (
    // --font-mulish stays in tailwind's sans stack; an undefined var() there
    // would invalidate the whole font-family, so it's pinned to system-ui.
    <html lang="en" className={geist.variable} style={{ '--font-mulish': 'system-ui' } as React.CSSProperties}>
      {/* suppressHydrationWarning silences the harmless mismatch caused by
          browser extensions (ColorZilla, Grammarly, etc.) that inject
          attributes into <body> before React hydrates. */}
      <body suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD).replace(/</g, '\\u003c') }} />
        {/* Crash reporter: errors that escape React (the router, chunk loading, promises) still reach
            the server log via /api/client-error. Inline so it runs before the app; message, first stack
            lines and path only; at most 5 a page. */}
        <script dangerouslySetInnerHTML={{ __html: CRASH_REPORTER }} />
        <SmoothScroll />
        <CatalogProvider products={products}>{children}</CatalogProvider>
        <AdPixel />
        <SiteTracker />
      </body>
    </html>
  );
}
