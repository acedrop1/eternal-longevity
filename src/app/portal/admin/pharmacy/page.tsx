import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader, SectionCard, StatusBadge } from '@/components/admin/IndexTable';
import { RxHereSandboxTest } from '@/components/admin/RxHereSandboxTest';
import { getSession, loginUrl } from '@/lib/auth-server';
import { liveCatalog, ourProductPrices } from '@/lib/pharmacy-prices';
import { rxhereSandbox } from '@/lib/rxhere';
import { PharmacyCatalogTable } from './PharmacyCatalogTable';

export const metadata: Metadata = { title: 'Pharmacy' };
export const dynamic = 'force-dynamic';

const money = (n: number | null) => (n === null ? '—' : `$${n.toFixed(2)}`);
const th = 'px-4 py-2 text-left text-[13px] font-semibold text-ink/70';
const td = 'border-t border-ink/10 px-4 py-2.5 align-top text-[14px]';

/**
 * Admin → Pharmacy: RxHere's live catalog. Our products first, RxHere's price
 * today beside the cost we hold (what margins used before live pricing), then
 * the whole catalog to search and start a new product from.
 */
export default async function AdminPharmacyPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const [ours, catalog] = await Promise.all([ourProductPrices(), liveCatalog().catch(() => null)]);
  const used = new Map<string, string>();
  for (const r of ours) if (r.catalogId) used.set(r.catalogId, r.productId);

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Pharmacy"
          subtitle="RxHere's live catalog and prices (refreshed hourly). Margins across admin use RxHere's price today; you get an email when the price of anything we sell changes."
        />

        {!catalog && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">
            RxHere did not answer, or RXHERE_API_TOKEN is not set. Prices below are our stored costs.
          </p>
        )}

        <SectionCard title="Our products" description="What RxHere charges today beside the cost we stored. A difference is flagged." flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-milk">
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>RxHere item</th>
                  <th className={th}>RxHere today</th>
                  <th className={th}>Our stored cost</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {ours.map((r) => {
                  const drift = r.live !== null && Math.abs(r.live - r.stored) >= 0.005;
                  return (
                    <tr key={r.productId}>
                      <td className={td}>
                        <Link href={`/portal/admin/products/${r.productId}`} className="font-medium text-ink underline decoration-ink/25 underline-offset-[3px]">
                          {r.name}
                        </Link>
                        <div className="text-[12px] text-ink/55">{r.status}</div>
                      </td>
                      <td className={td}>{r.catalogName ?? (r.catalogId ? 'Not in catalog' : 'Not linked')}</td>
                      <td className={`${td} tabular-nums`}>{money(r.live)}</td>
                      <td className={`${td} tabular-nums`}>{money(r.stored)}</td>
                      <td className={td}>
                        {!r.catalogId || !r.catalogName ? (
                          <StatusBadge tone="critical">Placed by hand</StatusBadge>
                        ) : drift ? (
                          <StatusBadge tone={r.live! > r.stored ? 'critical' : 'success'}>
                            {r.live! > r.stored ? 'Up' : 'Down'} {money(Math.abs(r.live! - r.stored))}
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">Same</StatusBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {catalog && (
          <SectionCard
            title={`RxHere catalog · ${catalog.length} products`}
            description="Search everything RxHere makes. “Add to site” starts a draft product filled in from RxHere; it goes live only once it has copy, a price, a photo, safety information and its assessment questions."
            flush
          >
            {rxhereSandbox() && <RxHereSandboxTest />}
            <PharmacyCatalogTable items={catalog} used={Object.fromEntries(used)} />
          </SectionCard>
        )}
      </div>
    </PortalShell>
  );
}
