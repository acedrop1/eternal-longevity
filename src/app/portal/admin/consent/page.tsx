import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminPageHeader, MetricCard, SectionCard, StatusBadge } from '@/components/admin/IndexTable';
import { getSession, loginUrl } from '@/lib/auth-server';
import { createSupabaseAdminClient, supabaseAdminConfigured } from '@/lib/supabase/admin';
import { NEVER_RUN_ON, NEVER_SENT, PIXELS, REVIEWED_PAGES } from '@/lib/tracking-config';

export const metadata: Metadata = { title: 'Consent & tracking' };
export const dynamic = 'force-dynamic';

const th = 'px-4 py-2 text-left text-[13px] font-semibold text-ink/70';
const td = 'border-t border-ink/10 px-4 py-2.5 align-top text-[14px]';
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Admin → Consent & tracking. Read-only: the pixels and the rules they run
 * under (lib/tracking-config, the same file the site enforces), what visitors
 * chose in the consent banner, and who is enrolled in marketing email or texts.
 */
export default async function AdminConsentPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const choices = { accept: 0, reject: 0, custom: 0, gpc: 0 };
  let contacts: { id: string; email: string | null; phone: string | null; state: string | null; email_status: string; sms_status: string; created_at: string }[] = [];
  let ready = true;
  if (supabaseAdminConfigured()) {
    const db = createSupabaseAdminClient();
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [log, list] = await Promise.all([
      // consent_log isn't in the generated types (migration 0034).
      (db as unknown as SupabaseClient).from('consent_log').select('analytics, advertising, gpc').gte('created_at', since).limit(10_000),
      db
        .from('marketing_contacts')
        .select('id, email, phone, state, email_status, sms_status, created_at')
        .or('email_status.neq.none,sms_status.neq.none')
        .order('created_at', { ascending: false })
        .limit(1000),
    ]);
    if (log.error || list.error) ready = false;
    for (const r of (log.data ?? []) as { analytics: boolean; advertising: boolean; gpc: boolean }[]) {
      if (r.gpc) choices.gpc++;
      else if (r.analytics && r.advertising) choices.accept++;
      else if (!r.analytics && !r.advertising) choices.reject++;
      else choices.custom++;
    }
    contacts = list.data ?? [];
  }
  const subscribedEmail = contacts.filter((c) => c.email_status === 'subscribed').length;
  const subscribedSms = contacts.filter((c) => c.sms_status === 'subscribed').length;
  const tone = (s: string) => (s === 'subscribed' ? 'success' : s === 'pending' ? 'attention' : s === 'unsubscribed' ? 'critical' : 'neutral') as 'success' | 'attention' | 'critical' | 'neutral';

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="space-y-5">
        <AdminPageHeader
          title="Consent & tracking"
          subtitle="Which tracking tools exist, where they may run and what they may send; what visitors chose; and who is enrolled in marketing."
        />
        {!ready && (
          <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">
            Some data couldn’t load. Run migrations 0033–0035 in Supabase.
          </p>
        )}

        <SectionCard title="Pixels and tags" description="Read-only. Changing these is a code change to lib/tracking-config, reviewed before it ships." flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-milk">
                <tr>
                  <th className={th}>Tool</th>
                  <th className={th}>Status</th>
                  <th className={th}>Needs consent for</th>
                  <th className={th}>Allowed to send</th>
                  <th className={th}>Switched off</th>
                </tr>
              </thead>
              <tbody>
                {PIXELS.map((p) => (
                  <tr key={p.name}>
                    <td className={td}>
                      <div className="font-semibold text-ink">{p.name}</div>
                      {p.id && <div className="text-[13px] tabular-nums text-ink/60">ID {p.id}</div>}
                    </td>
                    <td className={td}>
                      <StatusBadge tone={p.installed ? 'success' : 'neutral'}>{p.installed ? 'Installed' : 'Not installed'}</StatusBadge>
                    </td>
                    <td className={td}>{p.consent}</td>
                    <td className={td}>{p.events.length ? p.events.join(', ') : '—'}</td>
                    <td className={td}>
                      <ul className="list-disc space-y-0.5 pl-4 text-[13px] text-ink/75">
                        {p.off.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard title="May run on (exact pages)">
            <ul className="space-y-1 text-[14px]">
              {REVIEWED_PAGES.map((p) => (
                <li key={p}>
                  <Link href={p} target="_blank" className="tabular-nums underline decoration-ink/25 underline-offset-[3px]">
                    {p}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-ink/60">Only after the visitor accepts Advertising. Leaving these pages unloads the tags.</p>
          </SectionCard>
          <SectionCard title="Never runs on">
            <ul className="list-disc space-y-1 pl-4 text-[14px] text-ink/80">
              {NEVER_RUN_ON.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Never sent to ad platforms">
            <ul className="list-disc space-y-1 pl-4 text-[14px] text-ink/80">
              {NEVER_SENT.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-ink/60">Product views are counted first-party only (Admin → Marketing).</p>
          </SectionCard>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Accepted all (30 days)" value={choices.accept.toLocaleString()} />
          <MetricCard label="Rejected optional" value={choices.reject.toLocaleString()} />
          <MetricCard label="Custom choice" value={choices.custom.toLocaleString()} />
          <MetricCard label="Browser privacy signal (GPC)" value={choices.gpc.toLocaleString()} />
        </div>

        <SectionCard
          title={`Marketing list · ${subscribedEmail} email · ${subscribedSms} text`}
          description="Everyone who opted in from /subscribe, sign-up or the assessment, with their status. Unsubscribes are kept so nobody is re-enrolled. Each member’s page shows their full consent record."
          flush
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-milk">
                <tr>
                  <th className={th}>Email</th>
                  <th className={th}>Marketing email</th>
                  <th className={th}>Mobile</th>
                  <th className={th}>Marketing texts</th>
                  <th className={th}>State</th>
                  <th className={th}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`${td} py-6 text-center text-ink/60`}>
                      Nobody yet.
                    </td>
                  </tr>
                )}
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>{c.email ?? '—'}</td>
                    <td className={td}>
                      <StatusBadge tone={tone(c.email_status)}>{c.email_status}</StatusBadge>
                    </td>
                    <td className={`${td} tabular-nums`}>{c.phone ?? '—'}</td>
                    <td className={td}>
                      <StatusBadge tone={tone(c.sms_status)}>{c.sms_status}</StatusBadge>
                    </td>
                    <td className={td}>{c.state ?? '—'}</td>
                    <td className={`${td} tabular-nums`}>{fmt(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </PortalShell>
  );
}
