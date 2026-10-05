import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getPrescriber } from '@/lib/prescriber';
import {
  AdminSettings,
  type ServiceStatus,
} from '@/components/admin/AdminSettings';
import { getSession, loginUrl } from '@/lib/auth-server';
import { supabaseConfigured } from '@/lib/env';
import { stripeConfigured } from '@/lib/stripe';
import { emailConfigured } from '@/lib/email';
import { smsConfigured } from '@/lib/sms';
import { getShippingRates, rxhereConfigured, rxhereDryRun } from '@/lib/rxhere';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader } from '@/components/admin/IndexTable';

export const metadata: Metadata = {
  title: 'Settings',
};


export default async function AdminSettingsPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  // A real read-only call with the saved token: the only way to know a secret env value is right.
  const rx = rxhereConfigured() ? await getShippingRates() : null;

  const services: ServiceStatus[] = [
    {
      name: 'Supabase',
      connected: supabaseConfigured,
      detail: 'Database, authentication, and file storage',
    },
    {
      name: 'Stripe',
      connected: stripeConfigured(),
      detail: 'Payments and recurring subscriptions',
    },
    {
      name: 'Resend',
      connected: emailConfigured(),
      detail: 'Transactional email',
    },
    {
      name: 'Twilio',
      connected: smsConfigured(),
      detail: 'SMS notifications and codes',
    },
    {
      name: 'Pharmacy',
      connected: Boolean(rx?.ok),
      detail: !rx
        ? 'Partner API token not set'
        : rx.ok
          ? `Token accepted${rxhereDryRun() ? ' · dry run on, orders are not sent' : ' · orders send automatically'}`
          : rx.code === 'auth'
            ? 'Token rejected. Create a new one in the pharmacy portal'
            : `Pharmacy API not reachable (${rx.status || 'timeout'})`,
    },
  ];

  const notifications = {
    careTeam: process.env.CARE_TEAM_EMAIL || 'Not set',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Not set',
  };

  const prescriber = await getPrescriber();

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AdminPageHeader
        title="Settings"
        subtitle="What's connected, where alerts are routed, and the prescriber on file. Service keys live in your environment; the prescriber is editable here."
      />

      <div className="mt-5">
      <AdminSettings
        services={services}
        notifications={notifications}
        prescriber={prescriber}
        clinic={{ name: SITE_NAME, siteUrl: SITE_URL }}
      />
      </div>
    </PortalShell>
  );
}
