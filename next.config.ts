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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
