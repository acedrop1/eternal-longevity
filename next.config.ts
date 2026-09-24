import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com https://maps.gstatic.com https://*.supabase.co https://static.legitscript.com; media-src 'self'; connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://maps.googleapis.com https://places.googleapis.com; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
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
