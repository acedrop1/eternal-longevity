import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * Who is signed in, for the public header: a client component on pages that
 * are otherwise static. Answers with the dashboard path only.
 */
export async function GET() {
  const user = await getSession();
  return NextResponse.json(
    { home: user?.redirectTo ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
