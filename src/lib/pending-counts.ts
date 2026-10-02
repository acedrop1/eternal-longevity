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
      const dayAgo = new Date(Date.now() - 86400_000).toISOString();
      const [board, issues, support] = await Promise.all([
        db
          .from('fulfillment_orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['draft', 'submitted', 'accepted']),
        // Orders board Issues that are not yet on the board: a failed release,
        // approved but unpaid, or with the prescriber over a day.
        db
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .or(
            `status.eq.pending-admin,and(status.eq.signed,paid_confirmed_at.is.null),and(status.eq.assigned,created_at.lt.${dayAgo})`,
          ),
        awaitingReply(db, 'support'),
      ]);
      return {
        '/portal/admin/fulfillment': (board.count ?? 0) + (issues.count ?? 0),
        '/portal/admin/messages': support,
      };
    }

    if (role === 'doctor') {
      // His queue is orders waiting on him; prescriptions are only written at signing.
      const [queue, toPlace, threads] = await Promise.all([
        db.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'assigned'),
        db
          .from('fulfillment_orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['draft', 'submitted']),
        awaitingReply(db, 'doctor'),
      ]);
      return {
        '/portal/doctor': queue.count ?? 0,
        '/portal/doctor/fulfillment': toPlace.count ?? 0,
        '/portal/doctor/messages': threads,
      };
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

/**
 * Threads on a channel where the member spoke last: waiting on a reply.
 * Same rule as the inbox's "awaiting reply" (messages-db listMessageThreads).
 */
async function awaitingReply(
  db: ReturnType<typeof createSupabaseAdminClient>,
  channel: 'support' | 'doctor',
): Promise<number> {
  // ponytail: newest 500 messages, like the inbox; a thread quiet past that is not counted.
  const { data } = await db
    .from('messages')
    .select('thread_user_id, sender_id')
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(500);
  const latest = new Map<string, boolean>();
  for (const m of data ?? []) {
    if (!latest.has(m.thread_user_id)) latest.set(m.thread_user_id, m.sender_id === m.thread_user_id);
  }
  return [...latest.values()].filter(Boolean).length;
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
