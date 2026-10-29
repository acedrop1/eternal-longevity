import { NextResponse } from 'next/server';
import { allow } from '@/lib/rate-limit';

/**
 * Receives browser crash reports (lib/report-client-error) and writes them to
 * the server log. Public by necessity (it fires when the page is broken), so
 * it trusts nothing: fields are clipped and it never echoes anything back.
 */
export async function POST(req: Request) {
  const none = new NextResponse(null, { status: 204 });
  // Our pages only, and a few a minute per visitor: a flood can't bury real errors.
  const origin = req.headers.get('origin');
  try {
    if (origin && new URL(origin).host !== new URL(req.url).host) return none;
  } catch {
    return none;
  }
  if (!(await allow('client-error', { max: 20, windowSeconds: 600 }))) return none;
  try {
    const raw = (await req.text()).slice(0, 4000);
    const r = JSON.parse(raw) as Record<string, unknown>;
    const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '');
    console.error(
      '[client-error]',
      JSON.stringify({
        where: clip(r.where, 40),
        path: clip(r.path, 200),
        message: clip(r.message, 500),
        digest: clip(r.digest, 80),
        stack: clip(r.stack, 1500),
      }),
    );
  } catch {
    // Malformed report: ignore.
  }
  return new NextResponse(null, { status: 204 });
}
