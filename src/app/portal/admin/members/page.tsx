import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminUsers, type AdminUserRow } from '@/components/admin/AdminUsers';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';

export const metadata: Metadata = {
  title: 'Users | Eternal Longevity',
};

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Orders', href: '/portal/admin/fulfillment' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

const DEMO_USERS: AdminUserRow[] = [
  { id: 'demo-m1', name: 'Marcus Thompson', email: 'marcus.t@protonmail.com', role: 'member', status: 'active', joinedAt: 'May 9, 2026' },
  { id: 'demo-m2', name: 'Lena Rodriguez', email: 'lena.r@gmail.com', role: 'member', status: 'active', joinedAt: 'Apr 23, 2026' },
  { id: 'demo-m3', name: 'Sam Park', email: 'sam.park@icloud.com', role: 'member', status: 'suspended', joinedAt: 'Apr 17, 2026' },
  { id: 'demo-m4', name: 'Hadi Khoury', email: 'hadi.k@gmail.com', role: 'member', status: 'active', joinedAt: 'Apr 10, 2026' },
  { id: 'demo-m5', name: 'Priya Narayan', email: 'priya.n@gmail.com', role: 'member', status: 'deactivated', joinedAt: 'Mar 30, 2026' },
  { id: 'demo-d1', name: 'Dr. Bader', email: 'bader@eternallongevity.com', role: 'doctor', status: 'active', joinedAt: 'Feb 2, 2026' },
  { id: 'demo-p1', name: 'Kaduceus Pharmacy', email: 'orders@mykaduceus.com', role: 'pharmacy', status: 'active', joinedAt: 'Feb 2, 2026' },
  { id: 'demo-a1', name: 'Ops Admin', email: 'admin@eternallongevity.com', role: 'admin', status: 'active', joinedAt: 'Jan 14, 2026' },
];

function formatJoined(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function AdminUsersPage() {
  const user = await getSession();
  if (!user) redirect('/login');
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

  const memberCount = users.filter((u) => u.role === 'member').length;

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-8">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          USERS · {users.length} TOTAL · {memberCount} MEMBERS
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          People & access.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Everyone with an account — members, doctors, the pharmacy, admins.
          Invite new users, and suspend or deactivate any account. Click a
          member to see their full record.
        </p>
      </div>

      <AdminUsers users={users} live={live} />
    </PortalShell>
  );
}
