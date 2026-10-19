import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPrivacyRequests, type PrivacyRow } from '@/components/admin/AdminPrivacyRequests';
import { getSession, loginUrl } from '@/lib/auth-server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Privacy requests' };
export const dynamic = 'force-dynamic';

/** Every /privacy-request submission, newest first, with its deadline. */
export default async function AdminPrivacyRequestsPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  let rows: PrivacyRow[] = [];
  if (supabaseAdminConfigured()) {
    const { data } = await createSupabaseAdminClient()
      .from('privacy_requests')
      .select('id, ref, request_type, name, email, state, details, is_agent, agent_name, status, due_at, extended_until, extension_reason, appeal_of, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);
    rows = data ?? [];
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AdminPrivacyRequests rows={rows} />
    </PortalShell>
  );
}
