import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getPrescriber } from '@/lib/prescriber';
import {
  AdminSettings,
  type ServiceStatus,
} from '@/components/admin/AdminSettings';
import { getSession } from '@/lib/auth-server';
import { supabaseConfigured } from '@/lib/env';
import { stripeConfigured } from '@/lib/stripe';
import { emailConfigured } from '@/lib/email';
import { smsConfigured } from '@/lib/sms';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { ADMIN_NAV } from '@/components/portal/ui';

export const metadata: Metadata = {
  title: 'Settings',
};


export default async function AdminSettingsPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

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
  ];

  const notifications = {
    careTeam: process.env.CARE_TEAM_EMAIL || 'Not set',
    pharmacy: process.env.PHARMACY_EMAIL || 'Not set',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Not set',
  };

  const prescriber = await getPrescriber();

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div>
        <p className="mb-2 font-mono text-[12px] text-foreground/55">
          Settings
        </p>
        <h1
          className="font-display font-normal text-foreground"
          style={{
            fontSize: 'clamp(1.8rem, 1.5vw + 1rem, 2.6rem)',
            fontStretch: '75%',
            lineHeight: 1.05,
          }}
        >
          Operations settings.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          What&apos;s connected, where alerts are routed, and the prescriber on
          file. Service keys live in your environment; the prescriber is editable
          here.
        </p>
      </div>

      <AdminSettings
        services={services}
        notifications={notifications}
        prescriber={prescriber}
        clinic={{ name: SITE_NAME, siteUrl: SITE_URL }}
      />
    </PortalShell>
  );
}
