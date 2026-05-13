import type { Metadata, Viewport } from 'next';
import { Mulish } from 'next/font/google';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  keywords: [
    'peptides',
    'telehealth',
    'BPC-157',
    'TB-500',
    'CJC-1295',
    'Ipamorelin',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mulish.variable}>
      {/* suppressHydrationWarning silences the harmless mismatch caused by
          browser extensions (ColorZilla, Grammarly, etc.) that inject
          attributes into <body> before React hydrates. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
