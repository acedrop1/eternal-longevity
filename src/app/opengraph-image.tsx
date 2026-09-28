import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

/**
 * Open Graph / social-share image: the SoHo loft hero (our vials on the
 * counter) with a soft dark fade on the left and the butter wordmark on it.
 * Static, so it renders once at build time. Next.js wires it into
 * <meta property="og:image"> and <meta name="twitter:image"> automatically.
 */
export const alt = `${SITE_NAME} | ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const dataUrl = async (file: string, type: string) =>
  `data:${type};base64,${(await readFile(path.join(process.cwd(), file))).toString('base64')}`;

export default async function OpengraphImage() {
  const [frame, logo] = await Promise.all([
    dataUrl('public/brand/og-frame.jpg', 'image/jpeg'),
    dataUrl('public/brand/logo.svg', 'image/svg+xml'),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#000' }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={frame} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0 }} />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingLeft: 80,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img src={logo} width={520} height={172} />
          <div style={{ marginTop: 36, fontSize: 30, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em' }}>
            {SITE_TAGLINE}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
