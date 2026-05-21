import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
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

export const metadata: Metadata = {
  title: 'Settings | Eternal Longevity',
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

  let prescriber = { id: '', name: 'Dr. Bader', npi: '' };
  if (supabaseAdminConfigured()) {
    try {
      const db = createSupabaseAdminClient();
      const { data } = await db
        .from('profiles')
        .select('id, full_name, npi')
        .eq('role', 'doctor')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        prescriber = {
          id: data.id,
          name: data.full_name ?? '',
          npi: data.npi ?? '',
        };
      }
    } catch {
      // keep the demo prescriber
    }
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-8">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          SETTINGS
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
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
