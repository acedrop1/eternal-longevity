import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { AdminIntakeQueue, type IntakeRowView } from '@/components/admin/AdminIntakeQueue';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import { loadIntakes } from '@/components/admin/intake-load';
import { getSession, loginUrl } from '@/lib/auth-server';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Applications',
};

export default async function AdminQueuePage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  let intakes: IntakeRowView[] = [];
  let failed = false;

  if (live) {
    try {
      intakes = await loadIntakes();
    } catch {
      intakes = [];
      failed = true;
    }
  }

  // Dev only: sample rows so the index can be designed without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  let sample = false;
  if (process.env.NODE_ENV === 'development' && !live) {
    intakes = (await import('@/components/admin/dev-sample-pages')).SAMPLE_INTAKES;
    sample = true;
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Applications"
          subtitle="Everyone who has completed the intake. The prescriber reviews each order under Orders; request info or close an application only if something in it is wrong."
        />

        {sample && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
            Sample data (dev only). Applications load from Supabase once it is connected.
          </p>
        )}

        {!live && !sample ? (
          <p className="rounded-inner border border-ink/10 bg-white px-4 py-8 text-center text-[13px] text-ink/60">
            Applications appear here once Supabase is connected.
          </p>
        ) : failed ? (
          <p role="alert" className="rounded-inner border border-red-600/20 bg-red-50 px-4 py-8 text-center text-[13px] text-red-700">
            Applications could not be loaded. Refresh to try again.
          </p>
        ) : (
          <AdminIntakeQueue intakes={intakes} />
        )}
      </div>
    </PortalShell>
  );
}
