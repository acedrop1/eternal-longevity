import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Settings — Eternal Longevity',
};

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

export default async function AdminSettingsPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          SETTINGS
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: 'clamp(1.85rem, 4vw, 2.75rem)', letterSpacing: '-0.02em', lineHeight: 1.05 }}
        >
          Operations settings.
        </h1>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">
            State availability
          </h2>
          <p className="mb-5 text-sm text-foreground/65">
            Toggling a state off prevents new intakes from that state. Existing
            members in that state continue to receive care.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['NJ', true], ['NY', true], ['CA', true], ['FL', true],
              ['TX', true], ['IL', true], ['CO', true], ['WA', true],
              ['MA', true], ['PA', false], ['AZ', false], ['GA', false],
            ].map(([code, on]) => (
              <div
                key={code as string}
                className="flex items-center justify-between rounded-2xl border border-line bg-background p-3"
              >
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {code}
                </span>
                <span
                  className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-foreground/15'}`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">
            Pharmacy integrations
          </h2>
          <ul className="space-y-3">
            {[
              { name: 'Empower 503A', region: 'Houston, TX', status: 'connected' as const, lots: 14 },
              { name: 'Hallandale 503A', region: 'Hallandale, FL', status: 'connected' as const, lots: 9 },
              { name: 'Olympia 503A', region: 'Olympia, WA', status: 'pending' as const, lots: 0 },
            ].map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-background p-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{p.name}</div>
                  <div className="text-xs text-foreground/55 mt-0.5">{p.region}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-foreground/55">{p.lots} lots</div>
                  <span
                    className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] tracking-widest font-semibold ${
                      p.status === 'connected'
                        ? 'bg-accent/10 text-accent border-accent/40'
                        : 'bg-amber-500/10 text-amber-300 border-amber-400/40'
                    }`}
                  >
                    {p.status.toUpperCase()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-soft"
          >
            + Add a pharmacy partner
          </button>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">
            Team
          </h2>
          <ul className="space-y-3">
            {[
              { name: 'Dr. M. Reyes', role: 'Medical Director', email: 'reyes@eternallongevity.com' },
              { name: 'Dr. A. Chen', role: 'Compounding Lead', email: 'chen@eternallongevity.com' },
              { name: 'Dr. P. Okafor', role: 'Reviewing Physician', email: 'okafor@eternallongevity.com' },
              { name: 'Ops Admin', role: 'Admin', email: 'admin@eternal.test' },
            ].map((t) => (
              <li key={t.email} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-background p-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-foreground/55 mt-0.5">{t.role} · {t.email}</div>
                </div>
                <button type="button" className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] tracking-widest text-foreground/65 hover:text-foreground hover:border-foreground/30 transition-colors flex-shrink-0">
                  EDIT
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
          <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">
            Compliance &amp; audit
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Download HIPAA audit log (CSV)', cta: 'DOWNLOAD' },
              { label: 'Export all prescriptions (PDF)', cta: 'EXPORT' },
              { label: 'Rotate API keys', cta: 'ROTATE' },
              { label: 'Backup database snapshot', cta: 'SNAPSHOT' },
            ].map((a) => (
              <div key={a.label} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-background p-4">
                <span className="text-sm text-foreground/85">{a.label}</span>
                <button type="button" className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] tracking-widest text-foreground/85 hover:text-foreground hover:border-foreground/30 transition-colors flex-shrink-0">
                  {a.cta}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
