import 'server-only';

/**
 * Reads for the 30-day check-in. Every function returns nothing when Supabase
 * isn't configured (demo mode), so the page, the portal card and the admin
 * list simply render empty.
 */

import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { checkinOpen, type CheckinKind } from '@/lib/checkins';

export interface CheckinView {
  token: string;
  firstName: string;
  kind: CheckinKind;
  /** Already answered: the page shows the thank-you instead of the form. */
  answered: boolean;
}

/** The check-in behind an emailed link. Null for unknown or expired links. */
export async function getCheckinByToken(token: string): Promise<CheckinView | null> {
  if (!supabaseAdminConfigured() || !token || token.length > 100) return null;
  const db = createSupabaseAdminClient();
  const { data: row } = await db
    .from('checkins')
    .select('user_id, kind, token, responded_at, created_at')
    .eq('token', token)
    .maybeSingle();
  if (!row) return null;
  const answered = Boolean(row.responded_at);
  if (!answered && !checkinOpen(row)) return null;

  const { data: profile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', row.user_id)
    .maybeSingle();
  return {
    token: row.token,
    firstName: (profile?.full_name ?? '').trim().split(/\s+/)[0] || 'there',
    kind: row.kind,
    answered,
  };
}

/** The member's open check-ins, for the portal card. */
export async function listOpenCheckinsForUser(userId: string): Promise<{ token: string }[]> {
  if (!supabaseAdminConfigured()) return [];
  const { data } = await createSupabaseAdminClient()
    .from('checkins')
    .select('token, responded_at, created_at')
    .eq('user_id', userId)
    .is('responded_at', null)
    .order('created_at', { ascending: false })
    .limit(5);
  return (data ?? []).filter((r) => checkinOpen(r)).map((r) => ({ token: r.token }));
}

export interface CheckinRow {
  id: string;
  createdAt: string;
  memberName: string;
  memberEmail: string;
  productName: string;
  kind: CheckinKind;
  rating: number | null;
  comment: string | null;
  respondedAt: string | null;
}

/** Every check-in, newest first, for the admin list. Caller checks the role. */
export async function listCheckinsForStaff(limit = 500): Promise<CheckinRow[]> {
  if (!supabaseAdminConfigured()) return [];
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('checkins')
    .select('id, user_id, product_name, kind, rating, comment, responded_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const people = new Map<string, { name: string; email: string }>();
  if (ids.length) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids);
    for (const p of profiles ?? []) {
      people.set(p.id, { name: p.full_name ?? '', email: p.email ?? '' });
    }
  }
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    memberName: people.get(r.user_id)?.name || 'Member',
    memberEmail: people.get(r.user_id)?.email ?? '',
    productName: r.product_name,
    kind: r.kind,
    rating: r.rating,
    comment: r.comment,
    respondedAt: r.responded_at,
  }));
}
