import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { loginHref } from '@/lib/safe-next';
import { payPathForMember } from '@/lib/pay-on-approval';

/**
 * "Complete payment" on an approved order: on to its pay page. A link, not a
 * form, so the dashboard's next step and the order list can both use it.
 * Re-running it is harmless: a live pay link is reused, never re-emailed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const user = await getSession();
  if (!user) return to(loginHref(`/portal/orders/pay/${encodeURIComponent(ref)}`));
  if (user.role !== 'member') return to(user.redirectTo);

  const res = await payPathForMember(user.id, ref);
  if (res.path) return to(res.path);
  // A refill restarts from a fixed card; anything else says why on the orders page.
  if (res.error === 'refill') return to('/portal/account');
  const why = res.error === 'paid' || res.error === 'closed' ? res.error : 'error';
  return to(`/portal/orders?pay=${why}`);
}
