import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession, loginUrl } from '@/lib/auth-server';
import { listCheckinsForStaff, type CheckinRow } from '@/lib/checkins-db';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/format';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import { AdminCheckins } from '@/components/admin/AdminCheckins';

export const metadata: Metadata = { title: 'Check-ins' };

/**
 * Every 30-day check-in and its answer. Read-only: follow-ups happen in the
 * member's message thread. A score of 3 or less, or any comment, also emails
 * the support inbox the moment it comes in.
 */
export default async function AdminCheckinsPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  let rows: CheckinRow[] = await listCheckinsForStaff();

  // Dev only: sample rows so the index can be designed without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  let sample = false;
  if (process.env.NODE_ENV === 'development' && !supabaseAdminConfigured()) {
    rows = (await import('@/components/admin/dev-sample-pages')).SAMPLE_CHECKINS;
    sample = true;
  }

  const answered = rows.filter((r) => r.rating !== null);
  const low = answered.filter((r) => (r.rating ?? 5) <= 3).length;

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Check-ins"
          subtitle={`Sent 30 days after a member's first delivery of a product and after their first refill. ${answered.length} of ${rows.length} answered${low > 0 ? `, ${low} at 3 or below` : ''}.`}
        />
        {sample && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">
            Sample data (dev only). Check-ins load from Supabase once it is connected.
          </p>
        )}
        <AdminCheckins rows={rows.map((r) => ({ ...r, date: formatDate(r.createdAt) }))} />
      </div>
    </PortalShell>
  );
}
