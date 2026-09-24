import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { DOCTOR_NAV, PageHeader } from '@/components/portal/ui';
import { FulfillmentBoard } from '@/components/fulfillment/FulfillmentBoard';
import { getSession } from '@/lib/auth-server';
import { loadFulfillmentBoard } from '@/lib/fulfillment-core';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

export default async function DoctorFulfillmentPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'doctor') redirect(user.redirectTo);

  const rows = supabaseAdminConfigured() ? await loadFulfillmentBoard().catch(() => []) : [];

  return (
    <PortalShell user={user} nav={DOCTOR_NAV}>
      <PageHeader
        title="Orders to place."
        intro="Every paid order, new or refill. Place it in the Formula Health portal and mark it placed here. Admin sees the same list, so whoever places it first marks it."
      />
      <div className="mt-10">
        <FulfillmentBoard rows={rows} />
      </div>
    </PortalShell>
  );
}
