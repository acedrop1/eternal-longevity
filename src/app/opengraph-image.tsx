import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

/**
 * Open Graph / social-share image.
 *
 * Serves the brand social card at public/social.png. Next.js wires this
 * route into the <meta property="og:image"> + <meta name="twitter:image">
 * tags automatically, so any shared Eternal Longevity URL previews with
 * this card.
 */
export const alt = `${SITE_NAME} | ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 800 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const data = await readFile(join(process.cwd(), 'public', 'social.png'));
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
