import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DOCTOR_NAV } from '@/components/portal/ui';
import { AdminPageHeader } from '@/components/admin/IndexTable';
import { FulfillmentBoard } from '@/components/fulfillment/FulfillmentBoard';
import { getSession, loginUrl } from '@/lib/auth-server';
import { loadFulfillmentBoard, type BoardRow } from '@/lib/fulfillment-core';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

export default async function DoctorFulfillmentPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'doctor') redirect(user.redirectTo);

  const live = supabaseAdminConfigured();
  let rows: BoardRow[] = live ? await loadFulfillmentBoard().catch(() => []) : [];
  // Dev only: the admin's sample board, so the index can be seen without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  const sample = process.env.NODE_ENV === 'development' && !live;
  if (sample) rows = (await import('@/components/admin/dev-sample')).SAMPLE_BOARD;

  return (
    <PortalShell user={user} nav={DOCTOR_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Orders to place"
          subtitle={
            <span className="text-[15px] md:text-[14px]">
              Every paid order, new or refill. Place it in the pharmacy portal and mark it placed here. Admin sees the
              same list, so whoever places it first marks it.
            </span>
          }
        />
        {sample && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[15px] text-amber-900 md:text-[14px]">
            Sample data (dev only).
          </p>
        )}
        {/* Phones: the shared board's tabs and filters are 36-40px; 44px here. */}
        <div className="max-md:[&_[role=tab]]:min-h-[44px] max-md:[&_input]:h-11 max-md:[&_select]:h-11">
          <FulfillmentBoard rows={rows} />
        </div>
      </div>
    </PortalShell>
  );
}
