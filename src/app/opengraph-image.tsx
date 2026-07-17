import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

/**
 * Open Graph / social-share image.
 *
 * Rendered dynamically as a clean brand card — black field, gold wordmark,
 * tagline — so shared Eternal Longevity URLs preview on-brand with no
 * lifestyle photography. Next.js wires this into <meta property="og:image">
 * and <meta name="twitter:image"> automatically.
 */
export const alt = `${SITE_NAME} | ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 50% 30%, #171204 0%, #000000 62%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: '#d5a850',
            lineHeight: 1,
          }}
        >
          ETERNAL
        </div>
        <div
          style={{
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: '#f4f0e8',
            lineHeight: 1.05,
          }}
        >
          LONGEVITY
        </div>
        <div
          style={{
            marginTop: 40,
            width: 120,
            height: 2,
            background: '#d5a850',
          }}
        />
        <div
          style={{
            marginTop: 36,
            fontSize: 30,
            color: '#9a9a9a',
            letterSpacing: '0.02em',
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size },
  );
}
