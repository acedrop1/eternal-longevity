import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import {
  createSupabaseAdminClient,
  supabaseAdminConfigured,
} from '@/lib/supabase/admin';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pharmacy | Eternal Longevity',
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

/** Kaduceus business details (from their physician order form). */
const PHARMACY = {
  name: 'Kaduceus Pharmacy',
  tagline: 'Trusted Experts in Specialty Compounds',
  address: '13462 FM Rd 529, Ste 200, Houston, TX 77041',
  phone: '(470) 831-7220',
  website: 'mykaduceus.com',
  license: 'Licensed by the Texas State Board of Pharmacy (503A)',
  catalog: '72 compounds — GLP-1s, single peptides, and peptide blends',
};

interface Activity {
  draft: number;
  atPharmacy: number;
  shipped: number;
  delivered: number;
  recent: { ref: string; patient: string; status: string; when: string }[];
  account: { email: string; status: string };
}

const DEMO_ACTIVITY: Activity = {
  draft: 2,
  atPharmacy: 3,
  shipped: 9,
  delivered: 41,
  recent: [
    { ref: 'FUL-DEMO02', patient: 'Lena Ruiz', status: 'shipped', when: 'May 18' },
    { ref: 'FUL-DEMO01', patient: 'Marcus Tran', status: 'submitted', when: 'May 18' },
    { ref: 'FUL-9KX2', patient: 'Hadi Khoury', status: 'delivered', when: 'May 14' },
  ],
  account: { email: 'orders@mykaduceus.com', status: 'active' },
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function loadActivity(): Promise<Activity> {
  if (!supabaseAdminConfigured()) return DEMO_ACTIVITY;
  try {
    const db = createSupabaseAdminClient();
    const [{ data: orders }, { data: account }] = await Promise.all([
      db
        .from('fulfillment_orders')
        .select('order_ref, patient_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      db
        .from('profiles')
        .select('email, account_status')
        .eq('role', 'pharmacy')
        .limit(1)
        .maybeSingle(),
    ]);
    const all = orders ?? [];
    const by = (s: string) => all.filter((o) => o.status === s).length;
    return {
      draft: by('draft'),
      atPharmacy: by('submitted') + by('accepted'),
      shipped: by('shipped'),
      delivered: by('delivered'),
      recent: all.slice(0, 6).map((o) => ({
        ref: o.order_ref,
        patient: o.patient_name,
        status: o.status,
        when: fmtWhen(o.created_at),
      })),
      account: {
        email: account?.email ?? 'Not yet invited',
        status: account?.account_status ?? 'pending',
      },
    };
  } catch {
    return DEMO_ACTIVITY;
  }
}

export default async function AdminPharmacyPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  const activity = await loadActivity();

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-8">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          PHARMACY PARTNER
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          {PHARMACY.name}.
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/65 leading-relaxed">
          The 503A compounding pharmacy that fulfills and drop-ships every
          order. Their portal account, contact details, and live fulfillment
          activity.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Account + contact */}
        <section className="rounded-3xl border border-line bg-surface p-6">
          <div className="mb-4 text-[10px] tracking-widest text-accent">
            ACCOUNT
          </div>
          <Field label="Pharmacy" value={PHARMACY.name} />
          <Field label="Portal login" value={activity.account.email} />
          <Field
            label="Account status"
            value={activity.account.status.toUpperCase()}
          />
          <div className="my-4 h-px bg-line" />
          <div className="mb-4 text-[10px] tracking-widest text-accent">
            CONTACT
          </div>
          <Field label="Address" value={PHARMACY.address} />
          <Field label="Phone" value={PHARMACY.phone} />
          <Field label="Website" value={PHARMACY.website} />
          <Field label="Licensing" value={PHARMACY.license} />
          <Field label="Catalog" value={PHARMACY.catalog} />
        </section>

        {/* Activity */}
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Awaiting submit" value={activity.draft} tone="amber" />
            <Stat label="At pharmacy" value={activity.atPharmacy} tone="sky" />
            <Stat label="Shipped" value={activity.shipped} tone="accent" />
            <Stat
              label="Delivered"
              value={activity.delivered}
              tone="neutral"
            />
          </section>

          <section className="rounded-3xl border border-line bg-surface p-6">
            <div className="mb-4 text-[10px] tracking-widest text-foreground/50">
              RECENT FULFILLMENT
            </div>
            {activity.recent.length === 0 ? (
              <p className="text-sm text-foreground/45">
                No orders sent to the pharmacy yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {activity.recent.map((r) => (
                  <li
                    key={r.ref}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="font-mono text-xs text-foreground/80">
                      {r.ref}
                    </span>
                    <span className="flex-1 truncate text-sm text-foreground">
                      {r.patient}
                    </span>
                    <span className="text-xs text-foreground/50">
                      {r.when}
                    </span>
                    <span className="text-[10px] tracking-widest text-accent">
                      {r.status.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PortalShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <span className="flex-shrink-0 text-foreground/55">{label}</span>
      <span className="text-right text-foreground/90">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'sky' | 'accent' | 'neutral';
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-1.5 text-[10px] tracking-widest text-foreground/55">
        {label.toUpperCase()}
      </div>
      <div
        className={cn(
          'text-2xl font-semibold tracking-tight tabular-nums',
          tone === 'amber' && 'text-amber-300',
          tone === 'sky' && 'text-sky-300',
          tone === 'accent' && 'text-accent',
          tone === 'neutral' && 'text-foreground',
        )}
      >
        {value}
      </div>
    </div>
  );
}
