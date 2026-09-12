import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { getPrescriber, listAudit } from '@/lib/prescriber';
import { formatDateTime } from '@/lib/format';
import { BUSINESS_LEGAL_NAME, BUSINESS_ADDRESS, SERVICE_AREA } from '@/lib/site';

export const metadata: Metadata = { title: 'Compliance & audit' };

const ADMIN_NAV = [
  { label: 'Overview', href: '/portal/admin' },
  { label: 'Members', href: '/portal/admin/members' },
  { label: 'Queue', href: '/portal/admin/queue' },
  { label: 'Messages', href: '/portal/admin/messages' },
  { label: 'Billing', href: '/portal/admin/billing' },
  { label: 'Orders', href: '/portal/admin/fulfillment' },
  { label: 'Pharmacy', href: '/portal/admin/pharmacy' },
  { label: 'Compliance', href: '/portal/admin/compliance' },
  { label: 'Settings', href: '/portal/admin/settings' },
];

/**
 * What a board, a processor or a certifier asks to see, and who changed it.
 *
 * The prescriber's credential and licence used to live in a page constant and
 * inside his name, so there was no record that either had ever been different.
 * These are the facts that print on prescriptions and on published policy, and
 * an unexplained change to one is exactly what an audit looks for.
 */
export default async function CompliancePage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  const [record, audit] = await Promise.all([getPrescriber(), listAudit(200)]);

  const facts: [string, string][] = [
    ['Legal entity', BUSINESS_LEGAL_NAME],
    ['Registered address', BUSINESS_ADDRESS],
    ['States served', SERVICE_AREA],
    ['Prescriber of record', record.display || '— not set —'],
    ['NPI', record.npi || '— not set —'],
    [
      'Medical licence',
      record.licenseNumber
        ? `${record.licenseState || '—'} ${record.licenseNumber}`
        : '— not set —',
    ],
    ['Licence expires', record.licenseExpires || '— not set —'],
    ['Controlled substances', 'None dispensed. No DEA registration held.'],
  ];

  const missing = facts.filter(([, v]) => v.startsWith('—')).length;

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div>
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          COMPLIANCE &amp; AUDIT
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(1.85rem, 4vw, 2.75rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          What we can evidence.
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-foreground/65">
          The facts a state board, a payment processor or LegitScript asks for,
          and every change made to them.
        </p>
      </div>

      <section className="mb-8 rounded-3xl border border-line bg-surface p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            On file
          </h2>
          {missing > 0 && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-semibold tracking-widest text-accent">
              {missing} NOT SET
            </span>
          )}
        </div>
        <dl className="grid gap-x-8 gap-y-0 md:grid-cols-2">
          {facts.map(([k, v]) => (
            <div
              key={k}
              className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2.5 last:border-0"
            >
              <dt className="text-sm text-foreground/60">{k}</dt>
              <dd
                className={
                  v.startsWith('—')
                    ? 'text-sm font-semibold text-accent'
                    : 'text-right text-sm font-medium text-foreground/90'
                }
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
        <h2 className="mb-1.5 text-lg font-semibold tracking-tight text-foreground">
          Audit trail
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-foreground/55">
          Append-only. Nothing here can be edited or removed from inside the
          app.
        </p>

        {audit.length === 0 ? (
          <p className="rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground/55">
            Nothing recorded yet. Changes to the prescriber&apos;s name,
            credential, NPI or licence appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] tracking-widest text-foreground/45">
                  <th className="py-2 pr-4 font-medium">WHEN</th>
                  <th className="py-2 pr-4 font-medium">WHO</th>
                  <th className="py-2 pr-4 font-medium">FIELD</th>
                  <th className="py-2 pr-4 font-medium">FROM</th>
                  <th className="py-2 font-medium">TO</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2.5 pr-4 text-xs text-foreground/55">
                      {formatDateTime(a.at)}
                    </td>
                    <td className="py-2.5 pr-4 text-foreground/85">
                      {a.actor}
                      <span className="ml-1.5 text-[10px] tracking-widest text-foreground/40">
                        {a.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-foreground/85">{a.field}</td>
                    <td className="py-2.5 pr-4 text-foreground/50 line-through">
                      {a.from}
                    </td>
                    <td className="py-2.5 font-medium text-foreground">
                      {a.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}
