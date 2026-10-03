import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { getSession, loginUrl } from '@/lib/auth-server';
import { getPrescriber, listAudit } from '@/lib/prescriber';
import { formatDateTime } from '@/lib/format';
import { BUSINESS_LEGAL_NAME, BUSINESS_ADDRESS, SERVICE_AREA } from '@/lib/site';
import { ADMIN_NAV } from '@/components/portal/ui';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';
import {
  AdminPageHeader,
  SectionCard,
  StatusBadge,
  plainTable,
  plainTd,
  th,
} from '@/components/admin/IndexTable';
import { cn } from '@/lib/utils';

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
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const [record, liveAudit] = await Promise.all([getPrescriber(), listAudit(200)]);
  let audit = liveAudit;
  // Dev only: sample rows so the trail can be designed without Supabase.
  // NODE_ENV is inlined at build, so production never loads the fixture.
  const sample = process.env.NODE_ENV === 'development' && !supabaseAdminConfigured();
  if (sample) audit = (await import('@/components/admin/dev-sample')).SAMPLE_AUDIT;

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
      <AdminPageHeader
        title="Compliance & audit"
        subtitle="The facts a state board, a payment processor or LegitScript asks for, and every change made to them."
      />

      <div className="mt-5 space-y-5">
        <SectionCard
          flush
          title="On file"
          description="What prints on prescriptions and published policy."
          actions={missing > 0 ? <StatusBadge tone="attention">{missing} not set</StatusBadge> : undefined}
        >
          <div className="overflow-x-auto">
            <table className={cn(plainTable, 'min-w-[340px]')}>
              <thead>
                <tr>
                  <th className={th}>Item</th>
                  <th className={th}>On file</th>
                  <th className={th}>
                    <span className="sr-only">Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {facts.map(([k, v]) => {
                  const unset = v.startsWith('—');
                  return (
                    <tr key={k}>
                      <td className={cn(plainTd, 'w-[34%] whitespace-normal text-ink/65')}>{k}</td>
                      <td
                        className={cn(
                          plainTd,
                          'whitespace-normal',
                          unset ? 'font-semibold text-amber-800' : 'font-medium text-ink/90',
                        )}
                      >
                        {v}
                      </td>
                      <td className={cn(plainTd, 'w-px text-right')}>
                        {unset && <StatusBadge tone="attention">Not set</StatusBadge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          flush
          title="Audit trail"
          description="Append-only. Nothing here can be edited or removed from inside the app."
          actions={sample ? <StatusBadge tone="attention">Sample data (dev only)</StatusBadge> : undefined}
        >
          {audit.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-ink/65">
              Nothing recorded yet. Changes to the prescriber&apos;s name,
              credential, NPI or licence appear here, as does every staff
              sign-in from a new device.
            </p>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className={plainTable}>
                <thead className="sticky top-0 z-[1]">
                  <tr>
                    <th className={cn(th, 'bg-milk')}>When</th>
                    <th className={cn(th, 'bg-milk')}>Who</th>
                    <th className={cn(th, 'bg-milk')}>Field</th>
                    <th className={cn(th, 'bg-milk')}>From</th>
                    <th className={cn(th, 'bg-milk')}>To</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a, i) => (
                    <tr key={i}>
                      <td className={cn(plainTd, 'text-[12px] tabular-nums text-ink/65')}>
                        {formatDateTime(a.at)}
                      </td>
                      <td className={cn(plainTd, 'text-ink/85')}>
                        {a.actor}
                        <span className="ml-1.5 text-[12px] text-ink/65">{a.role}</span>
                      </td>
                      <td className={cn(plainTd, 'text-ink/85')}>{a.field}</td>
                      <td className={cn(plainTd, 'text-ink/60 line-through')}>{a.from}</td>
                      <td className={cn(plainTd, 'font-medium')}>{a.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </PortalShell>
  );
}
