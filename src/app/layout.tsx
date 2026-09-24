import type { Metadata, Viewport } from 'next';
import { DM_Mono, Instrument_Sans, Mulish } from 'next/font/google';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import { SmoothScroll } from '@/components/ui/SmoothScroll';
import './globals.css';
import { CatalogProvider } from '@/components/catalog/CatalogProvider';
import { getLiveProducts, toShopProduct } from '@/lib/catalog';

// Mulish loads via next/font as the dev fallback for Proxima Nova.
// Once the licensed Proxima Nova .woff2 files are dropped into /public/fonts/,
// the @font-face rules in globals.css take precedence (the CSS variable order
// in tailwind.config.ts puts --font-proxima first).
const mulish = Mulish({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-mulish',
  display: 'swap',
});

// Hero + announcement typography (David pattern). David sets headlines in a
// condensed serif; we never use serifs, so this is Instrument Sans pulled in
// on its width axis and set condensed. DM Mono carries the typewriter pills.
const display = Instrument_Sans({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-display',
  display: 'swap',
});

const mono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

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
    'peptides',
    'NAD+',
    'longevity',
    '503A pharmacy',
  ],
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
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
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Live catalogue (Admin → Products), handed to client components once.
  const products = (await getLiveProducts()).map(toShopProduct);

  return (
    <html lang="en" className={`${mulish.variable} ${display.variable} ${mono.variable}`}>
      {/* suppressHydrationWarning silences the harmless mismatch caused by
          browser extensions (ColorZilla, Grammarly, etc.) that inject
          attributes into <body> before React hydrates. */}
      <body suppressHydrationWarning>
        <SmoothScroll />
        <CatalogProvider products={products}>{children}</CatalogProvider>
      </body>
    </html>
  );
}
