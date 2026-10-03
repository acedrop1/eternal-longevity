import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { IntakeReview, type IntakeRowView } from '@/components/admin/AdminIntakeQueue';
import { DetailHeader } from '@/components/admin/DetailHeader';
import { loadIntakes } from '@/components/admin/intake-load';
import { getSession, loginUrl } from '@/lib/auth-server';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Application',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminApplicationPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const { id } = await params;
  const live = supabaseAdminConfigured();
  let intake: IntakeRowView | undefined;
  let failed = false;

  if (live) {
    try {
      [intake] = await loadIntakes(id);
    } catch {
      failed = true;
    }
  } else if (process.env.NODE_ENV === 'development') {
    // Dev only: the sample rows the index shows (see dev-sample-pages).
    intake = (await import('@/components/admin/dev-sample-pages')).SAMPLE_INTAKES.find((i) => i.id === id);
  }

  if (!intake && !failed) notFound();

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      {intake ? (
        <IntakeReview intake={intake} sample={!live} />
      ) : (
        <div className="space-y-5">
          <DetailHeader backHref="/portal/admin/queue" backLabel="Applications" title="Application" />
          <p role="alert" className="rounded-inner border border-red-600/20 bg-red-50 px-4 py-8 text-center text-[14px] text-red-700">
            This application could not be loaded. Refresh to try again.
          </p>
        </div>
      )}
    </PortalShell>
  );
}
