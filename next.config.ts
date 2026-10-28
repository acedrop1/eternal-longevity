import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Dev only: lets a phone on the same Wi-Fi load the local preview (http://<Mac IP>:3000).
  allowedDevOrigins: ['192.168.1.238'],
  reactStrictMode: true,
  async redirects() {
    // The protocol bundles were retired — only pharmacy-stocked SKUs remain.
    return [
      { source: '/protocols', destination: '/shop', permanent: true },
      { source: '/protocols/:id', destination: '/shop', permanent: true },
      // The science page was retired.
      { source: '/science', destination: '/', permanent: true },
    ];
  },
  // A portal holding health records should not be framable, should not let a
  // browser sniff content types, and should not leak full URLs to third
  // parties on outbound clicks.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            // Two years, subdomains included. Without it the first request of
            // a session can still be plaintext and downgradeable.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Card fields: Frame.js (js.framepayments.com) also loads its own
          // metrics and fraud scripts from *.framepayments.com, Evervault for card
          // encryption (script js.evervault.com, iframe ui-components.evervault.com,
          // fetch keys.evervault.com) and a fraud pixel from hexagon-analytics.com, and starts a blob: Web Worker.
          // Seen loading in a browser Oct 22, 2026; missing any of them, init fails.
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.framepayments.com https://js.evervault.com https://maps.googleapis.com https://connect.facebook.net https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com https://maps.gstatic.com https://*.supabase.co https://static.legitscript.com https://www.facebook.com https://hexagon-analytics.com; media-src 'self' blob: https://*.supabase.co; worker-src 'self' blob:; connect-src 'self' https://api.framepayments.com https://*.framepayments.com https://*.evervault.com https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://places.googleapis.com https://www.facebook.com https://connect.facebook.net https://accounts.google.com/gsi/; frame-src https://js.framepayments.com https://*.framepayments.com https://*.evervault.com https://accounts.google.com/gsi/; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
  images: {
    // Local dev only. When the project runs from a non-Mac drive (exFAT),
    // macOS writes a hidden ._ file beside every cached image and the
    // optimizer can serve that instead of the photo. Production on Vercel is
    // unaffected and keeps full optimization.
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Product photos uploaded in Admin → Products (Supabase Storage).
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

export default nextConfig;
