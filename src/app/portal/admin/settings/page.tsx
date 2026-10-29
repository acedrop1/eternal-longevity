import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getPrescriber } from '@/lib/prescriber';
import { getShippingCost, getShippingSettings } from '@/lib/shipping-settings';
import { getMarketingSettings } from '@/lib/marketing-settings';
import {
  AdminSettings,
  type ServiceStatus,
} from '@/components/admin/AdminSettings';
import { getSession, loginUrl } from '@/lib/auth-server';
import { supabaseConfigured } from '@/lib/env';
import { frameConfigured } from '@/lib/frame';
import { emailConfigured } from '@/lib/email';
import { smsConfigured } from '@/lib/sms';
import { listCatalog, rxhereConfigured, rxhereSandbox } from '@/lib/rxhere';
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

  // A real read-only call with the saved key: the only way to know a secret env value is right.
  // The key alone is enough to read the catalog; orders also wait for the webhook secret.
  const rx = process.env.RXHERE_API_TOKEN ? await listCatalog({ limit: 1 }) : null;

  // No cheap read-only Frame call, so this reads the key's prefix (never the key).
  const frameKey = process.env.FRAME_SECRET_KEY ?? '';
  const frameMode = frameKey.startsWith('sk_production_')
    ? 'live keys'
    : frameKey.startsWith('sk_sandbox_')
      ? 'sandbox keys'
      : 'unrecognised key';

  const services: ServiceStatus[] = [
    {
      name: 'Supabase',
      connected: supabaseConfigured,
      detail: 'Database, authentication, and file storage',
    },
    {
      name: 'Payments',
      connected: frameConfigured(),
      detail: !frameConfigured()
        ? 'Card processor key not set'
        : `Frame · ${frameMode}${process.env.FRAME_WEBHOOK_SECRET ? '' : ' · webhook not set'}`,
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
          ? `RxHere key accepted${rxhereConfigured() ? '' : ' · webhook secret not set, orders wait'}${rxhereSandbox() ? ' · sandbox key (vr_test_): orders are checked, nothing is created' : ' · live: orders send automatically'}`
          : rx.code === 'unauthorized' || rx.code === 'forbidden'
            ? 'RxHere refused the key. Ask RxHere for a new one'
            : `RxHere API not reachable (${rx.status || 'timeout'})`,
    },
  ];

  const notifications = {
    careTeam: process.env.CARE_TEAM_EMAIL || 'Not set',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Not set',
  };

  const [prescriber, shipping, shippingCost, marketing] = await Promise.all([getPrescriber(), getShippingSettings(), getShippingCost(), getMarketingSettings()]);

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AdminPageHeader
        title="Settings"
        subtitle="What's connected, where alerts are routed, the prescriber on file and shipping. Service keys live in your environment; the prescriber and shipping are editable here."
      />

      <div className="mt-5">
      <AdminSettings
        services={services}
        notifications={notifications}
        prescriber={prescriber}
        clinic={{ name: SITE_NAME, siteUrl: SITE_URL }}
        shipping={shipping}
        shippingCost={shippingCost}
        marketing={marketing}
        smsReady={smsConfigured()}
      />
      </div>

      <p className="mt-5 text-[14px] text-ink/70">
        RxHere&apos;s live catalog, our products&apos; prices and the sandbox test are in{' '}
        <Link href="/portal/admin/pharmacy" className="font-medium text-ink underline decoration-ink/30 underline-offset-[3px]">
          Admin → Pharmacy
        </Link>
        .
      </p>
    </PortalShell>
  );
}
