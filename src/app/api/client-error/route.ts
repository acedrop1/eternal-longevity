import { NextResponse } from 'next/server';

/**
 * Receives browser crash reports (lib/report-client-error) and writes them to
 * the server log. Public by necessity (it fires when the page is broken), so
 * it trusts nothing: fields are clipped and it never echoes anything back.
 */
export async function POST(req: Request) {
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
