/**
 * Pending-task counts for the portal nav badges.
 *
 * Each role sees a count on the tabs that need their attention — the doctor's
 * sign-off queue, the admin's open orders, the pharmacy's
 * orders to ship. Server-only; reads Supabase in live mode, demo numbers
 * otherwise so the badges still show in the preview.
 */
import 'server-only';
import type { NavItem } from '@/components/portal/PortalNav';
import type { Role } from '@/lib/auth';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

/** Plausible demo counts so the badges render before the backend is connected. */
const DEMO_COUNTS: Record<Role, Record<string, number>> = {
  admin: { '/portal/admin/fulfillment': 2 },
  doctor: { '/portal/doctor': 3 },
  pharmacy: { '/portal/pharmacy': 2 },
  member: {},
};

/** Pending-task counts keyed by nav href, for the given role. */
export async function getPendingCounts(
  role: Role,
): Promise<Record<string, number>> {
  if (!supabaseAdminConfigured()) return DEMO_COUNTS[role] ?? {};

  try {
    const db = createSupabaseAdminClient();

    if (role === 'admin') {
      // Applications get no badge: signing up is not a task for anyone.
      const orders = await db
        .from('fulfillment_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'submitted', 'accepted']);
      return { '/portal/admin/fulfillment': orders.count ?? 0 };
    }

    if (role === 'doctor') {
      const { count } = await db
        .from('prescriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return { '/portal/doctor': count ?? 0 };
    }

    if (role === 'pharmacy') {
      const { count } = await db
        .from('fulfillment_orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'accepted']);
      return { '/portal/pharmacy': count ?? 0 };
    }

    return {};
  } catch {
    return DEMO_COUNTS[role] ?? {};
  }
}

/** Attach badge counts to nav items by matching href. */
export async function enrichNavWithCounts(
  nav: NavItem[],
  role: Role,
): Promise<NavItem[]> {
  if (nav.length === 0) return nav;
  const counts = await getPendingCounts(role);
  return nav.map((item) => {
    const count = counts[item.href];
    return count && count > 0 ? { ...item, badge: count } : item;
  });
}
