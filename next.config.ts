import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    // The protocol bundles were retired — only pharmacy-stocked SKUs remain.
    return [
      { source: '/protocols', destination: '/shop', permanent: true },
      { source: '/protocols/:id', destination: '/shop', permanent: true },
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
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
