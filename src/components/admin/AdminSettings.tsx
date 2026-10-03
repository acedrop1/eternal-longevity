'use client';

import { PrescriberForm } from '@/components/prescriber/PrescriberForm';
import type { PrescriberRecord } from '@/lib/prescriberTypes';
import { SectionCard, SettingsRow, StatusBadge } from '@/components/admin/IndexTable';

export interface ServiceStatus {
  name: string;
  connected: boolean;
  detail: string;
}

export interface AdminSettingsProps {
  services: ServiceStatus[];
  notifications: { careTeam: string; fromEmail: string };
  prescriber: PrescriberRecord;
  clinic: { name: string; siteUrl: string };
}

/**
 * Shopify-style settings: each group is a label column (title and help) and a
 * white card. Service keys are read-only; the prescriber is the one form.
 */
export function AdminSettings({
  services,
  notifications,
  prescriber,
  clinic,
}: AdminSettingsProps) {
  const connectedCount = services.filter((s) => s.connected).length;
  const live = connectedCount > 0;

  return (
    <div className="space-y-6">
      {/* Mode */}
      <p
        className={
          live
            ? 'rounded-inner border border-emerald-600/20 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-800'
            : 'rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900'
        }
      >
        {live
          ? `Live mode — ${connectedCount} of ${services.length} services connected.`
          : 'Demo mode — no backend services connected. Add keys in your environment to go live.'}
      </p>

      <SettingsRow title="System status" description="Backend services this app connects to. Keys live in your environment.">
        <SectionCard flush>
          <ul className="divide-y divide-ink/10">
            {services.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink">{s.name}</div>
                  <div className="mt-0.5 truncate text-[12px] text-ink/65">{s.detail}</div>
                </div>
                <StatusBadge tone={s.connected ? 'success' : 'neutral'}>
                  {s.connected ? 'Connected' : 'Not set'}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </SectionCard>
      </SettingsRow>

      <Divider />

      <SettingsRow
        title="Prescriber on file"
        description="Name, credential, NPI and state licence. These print on every prescription sent to the pharmacy and on the published prescription policy."
      >
        <SectionCard>
          <PrescriberForm record={prescriber} mode="admin" />
        </SectionCard>
      </SettingsRow>

      <Divider />

      <SettingsRow
        title="Notification routing"
        description="Where system alerts are sent. Set these in your environment variables."
      >
        <SectionCard flush>
          <ReadRow label="Care team inbox" value={notifications.careTeam} />
          <ReadRow label="Outbound sender" value={notifications.fromEmail} />
        </SectionCard>
      </SettingsRow>

      <Divider />

      <SettingsRow title="Clinic" description="Public details used across the site.">
        <SectionCard flush>
          <ReadRow label="Clinic name" value={clinic.name} />
          <ReadRow label="Site URL" value={clinic.siteUrl} />
        </SectionCard>
      </SettingsRow>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Divider() {
  return <hr className="border-ink/10" />;
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-ink/10 px-4 py-3 first:border-t-0">
      <span className="flex-none text-[13px] text-ink/65">{label}</span>
      <span className="min-w-0 truncate text-[13px] text-ink/90">{value}</span>
    </div>
  );
}
