import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

export const runtime = 'edge';
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Site-wide default OG image. Renders at /opengraph-image so any page that
 * doesn't override gets a branded preview. Edge-rendered so it caches at CDN.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 88px',
          background:
            'radial-gradient(800px 600px at 50% 0%, rgba(213,168,80,0.18), rgba(0,44,40,0) 60%), #002C28',
          fontFamily: 'sans-serif',
          color: '#F4F0E8',
        }}
      >
        {/* Top row — eyebrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 22,
            letterSpacing: 6,
            color: '#d5a850',
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'flex' }}>ETERNAL · LONGEVITY</span>
        </div>

        {/* Middle — big headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 96,
              lineHeight: 0.98,
              fontWeight: 700,
              letterSpacing: -2,
              maxWidth: 980,
              display: 'flex',
            }}
          >
            {SITE_TAGLINE}
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#F4F0E8',
              opacity: 0.7,
              maxWidth: 900,
              display: 'flex',
            }}
          >
            Physician-reviewed · 503A pharmacy · Cold-chain shipped
          </div>
        </div>

        {/* Bottom row — domain + chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: 0.7,
              letterSpacing: 4,
            }}
          >
            ETERNALLONGEVITY.COM
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 22px',
              border: '2px solid #d5a850',
              borderRadius: 999,
              color: '#d5a850',
              fontWeight: 600,
              letterSpacing: 4,
            }}
          >
            START ASSESSMENT →
          </div>
        </div>
      </div>
    ),
    size
  );
}
