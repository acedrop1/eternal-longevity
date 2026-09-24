import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession } from '@/lib/auth-server';
import { getPrescriber, listAudit } from '@/lib/prescriber';
import { formatDateTime } from '@/lib/format';
import { BUSINESS_LEGAL_NAME, BUSINESS_ADDRESS, SERVICE_AREA } from '@/lib/site';
import { ADMIN_NAV } from '@/components/portal/ui';

export const metadata: Metadata = { title: 'Compliance & audit' };


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
        <p className="mb-2 font-mono text-[12px] text-foreground/55">
          Compliance &amp; audit
        </p>
        <h1
          className="font-display font-normal text-foreground"
          style={{
            fontSize: 'clamp(1.8rem, 1.5vw + 1rem, 2.6rem)',
            fontStretch: '75%',
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

      <section className="mb-8 rounded-[4px] border border-line bg-surface p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            On file
          </h2>
          {missing > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[12px] text-accent">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
              {missing} not set
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

      <section className="rounded-[4px] border border-line bg-surface p-6 md:p-8">
        <h2 className="mb-1.5 text-lg font-semibold tracking-tight text-foreground">
          Audit trail
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-foreground/55">
          Append-only. Nothing here can be edited or removed from inside the
          app.
        </p>

        {audit.length === 0 ? (
          <p className="rounded-[4px] border border-line bg-background px-4 py-3 text-sm text-foreground/55">
            Nothing recorded yet. Changes to the prescriber&apos;s name,
            credential, NPI or licence appear here, as does every staff
            sign-in from a new device.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line text-left font-mono text-[12px] text-foreground/60">
                  <th className="py-2 pr-4 font-normal">When</th>
                  <th className="py-2 pr-4 font-normal">Who</th>
                  <th className="py-2 pr-4 font-normal">Field</th>
                  <th className="py-2 pr-4 font-normal">From</th>
                  <th className="py-2 font-normal">To</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i} className="border-t border-line first:border-t-0">
                    <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[12px] tabular-nums text-foreground/60">
                      {formatDateTime(a.at)}
                    </td>
                    <td className="py-2.5 pr-4 text-foreground/85">
                      {a.actor}
                      <span className="ml-1.5 font-mono text-[12px] text-foreground/55">
                        {a.role}
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
