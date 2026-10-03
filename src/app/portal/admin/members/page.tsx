import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminUsers, type AdminUserRow } from '@/components/admin/AdminUsers';
import { USER_TABS, type UserTab } from '@/components/admin/user-labels';
import { getSession, loginUrl } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Users',
};


// Empty fallback: only renders if the Supabase query fails. Inventing
// members for an admin screen would be worse than showing none.
const DEMO_USERS: AdminUserRow[] = [];

function formatJoined(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  let users: AdminUserRow[] = DEMO_USERS;

  if (live) {
    try {
      const db = createSupabaseAdminClient();
      const { data } = await db
        .from('profiles')
        .select('id, full_name, email, role, account_status, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (data) {
        users = data.map((p) => ({
          id: p.id,
          name: p.full_name ?? 'Unnamed',
          email: p.email ?? '',
          role: p.role,
          status: p.account_status,
          joinedAt: formatJoined(p.created_at),
        }));
      }
    } catch {
      users = DEMO_USERS;
    }
  }

  // Dev only: sample rows so the index can be designed without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  let sample = false;
  if (process.env.NODE_ENV === 'development' && !live) {
    users = (await import('@/components/admin/dev-sample')).SAMPLE_USERS;
    sample = true;
  }

  // `?tab=` opens a filter tab directly; anything unknown falls back to All.
  const { tab } = await searchParams;
  const initialTab = USER_TABS.find((t) => t.key === tab)?.key ?? ('all' as UserTab);

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AdminUsers users={users} live={live} sample={sample} initialTab={initialTab} />
    </PortalShell>
  );
}
