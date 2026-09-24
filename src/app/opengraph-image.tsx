import { ImageResponse } from 'next/og';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

/**
 * Open Graph / social-share image.
 *
 * Rendered dynamically as a clean brand card — flat black field, gold
 * wordmark with the logo's rule beneath it, white tagline — so shared
 * Eternal Longevity URLs preview on-brand with no lifestyle photography. Next.js wires this into <meta property="og:image">
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
          justifyContent: 'flex-end',
          padding: '80px 88px',
          background: '#000000',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: '#d5a850',
            lineHeight: 1,
          }}
        >
          ETERNAL LONGEVITY
        </div>
        <div style={{ marginTop: 36, width: '100%', height: 2, background: '#d5a850' }} />
        <div style={{ marginTop: 36, fontSize: 40, color: '#ffffff', lineHeight: 1.2 }}>
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size },
  );
}
