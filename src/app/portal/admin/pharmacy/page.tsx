import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pharmacy | Eternal Longevity',
};

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Fulfillment', href: '/portal/admin/fulfillment' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

interface Lot {
  id: string;
  peptide: string;
  pharmacy: string;
  compoundedOn: string;
  purity: string;
  qty: number;
  status: 'in-stock' | 'low-stock' | 'depleted';
}

const LOTS: Lot[] = [
  { id: 'LOT-2026-0541', peptide: 'BPC-157', pharmacy: 'Empower 503A', compoundedOn: 'May 6', purity: '99.4%', qty: 42, status: 'in-stock' },
  { id: 'LOT-2026-0537', peptide: 'TB-500', pharmacy: 'Empower 503A', compoundedOn: 'May 3', purity: '99.2%', qty: 14, status: 'low-stock' },
  { id: 'LOT-2026-0531', peptide: 'CJC-1295', pharmacy: 'Hallandale 503A', compoundedOn: 'Apr 28', purity: '99.5%', qty: 28, status: 'in-stock' },
  { id: 'LOT-2026-0526', peptide: 'Ipamorelin', pharmacy: 'Hallandale 503A', compoundedOn: 'Apr 22', purity: '99.6%', qty: 8, status: 'low-stock' },
  { id: 'LOT-2026-0514', peptide: 'Tesamorelin', pharmacy: 'Empower 503A', compoundedOn: 'Apr 14', purity: '99.1%', qty: 0, status: 'depleted' },
];

const LOT_THEME: Record<Lot['status'], { label: string; class: string }> = {
  'in-stock': { label: 'IN STOCK', class: 'bg-accent/10 text-accent border-accent/40' },
  'low-stock': { label: 'LOW STOCK', class: 'bg-amber-500/10 text-amber-300 border-amber-400/40' },
  depleted: { label: 'DEPLETED', class: 'bg-red-500/10 text-red-300 border-red-500/40' },
};

interface Shipment {
  id: string;
  member: string;
  state: string;
  carrier: string;
  status: 'compounding' | 'in-transit' | 'delivered' | 'exception';
  eta: string;
}

const SHIPMENTS: Shipment[] = [
  { id: 'SHP-2104', member: 'Marcus T.', state: 'NJ', carrier: 'FedEx', status: 'compounding', eta: 'Ships in 24h' },
  { id: 'SHP-2103', member: 'Lena R.', state: 'NY', carrier: 'FedEx', status: 'in-transit', eta: 'Tomorrow' },
  { id: 'SHP-2102', member: 'Hadi K.', state: 'FL', carrier: 'UPS', status: 'in-transit', eta: '2 days' },
  { id: 'SHP-2101', member: 'Sam P.', state: 'CA', carrier: 'FedEx', status: 'delivered', eta: 'Delivered' },
  { id: 'SHP-2100', member: 'Daniel G.', state: 'IL', carrier: 'FedEx', status: 'exception', eta: 'On hold' },
];

const SHIP_THEME: Record<Shipment['status'], { label: string; class: string }> = {
  compounding: { label: 'COMPOUNDING', class: 'bg-sky-500/10 text-sky-300 border-sky-400/40' },
  'in-transit': { label: 'IN TRANSIT', class: 'bg-accent/10 text-accent border-accent/40' },
  delivered: { label: 'DELIVERED', class: 'bg-foreground/5 text-foreground/65 border-line' },
  exception: { label: 'EXCEPTION', class: 'bg-red-500/10 text-red-300 border-red-500/40' },
};

export default async function AdminPharmacyPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          PHARMACY · OUTBOUND
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
        >
          Lots &amp; shipments.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          Compounding lots from our 503A partners and every outbound shipment
          they trigger. Sync from pharmacy API every five minutes.
        </p>
      </div>

      <section className="mb-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Compounding lots
          </h2>
          <button type="button" className="text-[11px] tracking-widest text-accent hover:text-accent-soft">
            REQUEST COA →
          </button>
        </div>

        <div className="rounded-3xl border border-line bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-widest text-foreground/45">
                  <th className="px-4 md:px-6 py-3 font-medium">LOT</th>
                  <th className="px-4 md:px-6 py-3 font-medium">PEPTIDE</th>
                  <th className="px-4 md:px-6 py-3 font-medium hidden md:table-cell">PHARMACY</th>
                  <th className="px-4 md:px-6 py-3 font-medium hidden md:table-cell">COMPOUNDED</th>
                  <th className="px-4 md:px-6 py-3 font-medium text-right">PURITY</th>
                  <th className="px-4 md:px-6 py-3 font-medium text-right">QTY</th>
                  <th className="px-4 md:px-6 py-3 font-medium text-right">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {LOTS.map((l) => {
                  const theme = LOT_THEME[l.status];
                  return (
                    <tr key={l.id} className="border-t border-line hover:bg-background/40 transition-colors">
                      <td className="px-4 md:px-6 py-4 font-mono text-xs text-foreground/85">{l.id}</td>
                      <td className="px-4 md:px-6 py-4 text-foreground">{l.peptide}</td>
                      <td className="px-4 md:px-6 py-4 text-foreground/65 hidden md:table-cell">{l.pharmacy}</td>
                      <td className="px-4 md:px-6 py-4 text-foreground/65 hidden md:table-cell">{l.compoundedOn}</td>
                      <td className="px-4 md:px-6 py-4 text-right text-foreground/85 tabular-nums">{l.purity}</td>
                      <td className="px-4 md:px-6 py-4 text-right text-foreground tabular-nums">{l.qty}</td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] tracking-widest font-semibold', theme.class)}>
                          {theme.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Outbound shipments
          </h2>
          <button type="button" className="text-[11px] tracking-widest text-accent hover:text-accent-soft">
            EXPORT CSV →
          </button>
        </div>

        <div className="rounded-3xl border border-line bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-widest text-foreground/45">
                  <th className="px-4 md:px-6 py-3 font-medium">SHIPMENT</th>
                  <th className="px-4 md:px-6 py-3 font-medium">MEMBER</th>
                  <th className="px-4 md:px-6 py-3 font-medium hidden md:table-cell">STATE</th>
                  <th className="px-4 md:px-6 py-3 font-medium hidden md:table-cell">CARRIER</th>
                  <th className="px-4 md:px-6 py-3 font-medium">ETA</th>
                  <th className="px-4 md:px-6 py-3 font-medium text-right">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {SHIPMENTS.map((s) => {
                  const theme = SHIP_THEME[s.status];
                  return (
                    <tr key={s.id} className="border-t border-line hover:bg-background/40 transition-colors">
                      <td className="px-4 md:px-6 py-4 font-mono text-xs text-foreground/85">{s.id}</td>
                      <td className="px-4 md:px-6 py-4 text-foreground">{s.member}</td>
                      <td className="px-4 md:px-6 py-4 text-foreground/65 hidden md:table-cell">{s.state}</td>
                      <td className="px-4 md:px-6 py-4 text-foreground/65 hidden md:table-cell">{s.carrier}</td>
                      <td className="px-4 md:px-6 py-4 text-foreground/85">{s.eta}</td>
                      <td className="px-4 md:px-6 py-4 text-right">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] tracking-widest font-semibold', theme.class)}>
                          {theme.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PortalShell>
  );
}
