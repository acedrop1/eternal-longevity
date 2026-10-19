import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getPrescriber } from '@/lib/prescriber';
import { getShippingSettings } from '@/lib/shipping-settings';
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
import { catalogItems, type RxHereCatalogItem } from '@/lib/rxhere-rules';
import { getPharmacyEntries } from '@/lib/catalog';
import { SectionCard } from '@/components/admin/IndexTable';
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
  // ponytail: first 5 pages (500 products); page further if the catalog ever outgrows that.
  const rx = rxhereConfigured() ? await listCatalog({ limit: 100 }) : null;
  let catalog: RxHereCatalogItem[] = rx?.ok ? catalogItems(rx.data) : [];
  for (let page = 2; rx?.ok && catalog.length === (page - 1) * 100 && page <= 5; page++) {
    const next = await listCatalog({ page, limit: 100 });
    if (!next.ok) break;
    catalog = catalog.concat(catalogItems(next.data));
  }
  const entries = rx?.ok ? await getPharmacyEntries() : {};
  const usedBy = new Map<string, string[]>();
  for (const [productId, e] of Object.entries(entries)) {
    if (e.sku) usedBy.set(e.sku, [...(usedBy.get(e.sku) ?? []), productId]);
  }

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
          ? `RxHere key accepted${rxhereSandbox() ? ' · sandbox key (vr_test_): orders are checked, nothing is created' : ' · live: orders send automatically'}`
          : rx.code === 'unauthorized' || rx.code === 'forbidden'
            ? 'RxHere refused the key. Ask RxHere for a new one'
            : `RxHere API not reachable (${rx.status || 'timeout'})`,
    },
  ];

  const notifications = {
    careTeam: process.env.CARE_TEAM_EMAIL || 'Not set',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'Not set',
  };

  const [prescriber, shipping, marketing] = await Promise.all([getPrescriber(), getShippingSettings(), getMarketingSettings()]);

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
        marketing={marketing}
        smsReady={smsConfigured()}
      />
      </div>

      {rx?.ok && (
        <div className="mt-5">
          <SectionCard
            title={`Pharmacy catalog · ${catalog.length} products`}
            description="RxHere's products and our price. Copy a product's ID into Admin → Products → (product) → Pharmacy ID to send its orders automatically."
            flush
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-milk">
                  <tr>
                    {['Product', 'Form', 'Type', 'Our price', 'Controlled', 'ID', 'Used by'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-[13px] font-semibold text-ink/70">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((c) => (
                    <tr key={c.id} className="border-t border-ink/10 align-top text-[13px]">
                      <td className="px-4 py-2 font-medium text-ink">
                        {c.name}
                        {c.strengths ? <div className="font-normal text-ink/60">{Array.isArray(c.strengths) ? c.strengths.join(', ') : String(c.strengths)}</div> : null}
                      </td>
                      <td className="px-4 py-2">{c.dosage_form ?? '—'}</td>
                      <td className="px-4 py-2 uppercase">{c.type ?? '—'}</td>
                      <td className="px-4 py-2 tabular-nums">{typeof c.price_cents === 'number' ? `$${(c.price_cents / 100).toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-2">{c.controlled_substance ? 'Yes · needs DEA' : 'No'}</td>
                      <td className="px-4 py-2 font-mono text-[12px] text-ink/70 select-all">{c.id}</td>
                      <td className="px-4 py-2">{usedBy.get(c.id)?.join(', ') ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}
    </PortalShell>
  );
}
