'use client';

import { useState } from 'react';
import {
  adminSavePrescriber,
  type SettingsResult,
} from '@/lib/admin-settings-actions';
import { cn } from '@/lib/utils';
import { PrescriberForm } from '@/components/prescriber/PrescriberForm';
import type { PrescriberRecord } from '@/lib/prescriberTypes';

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

const inputClass =
  'w-full rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30';

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
      <div
        className={cn(
          'rounded-inner border px-4 py-3 text-sm',
          live
            ? 'border-emerald-600/20 bg-emerald-50 text-emerald-800'
            : 'border-amber-600/25 bg-amber-50 text-amber-800',
        )}
      >
        {live
          ? `Live mode — ${connectedCount} of ${services.length} services connected.`
          : 'Demo mode — no backend services connected. Add keys in your environment to go live.'}
      </div>

      {/* System status */}
      <Card title="System status" subtitle="Backend services this app connects to.">
        <ul className="space-y-2">
          {services.map((s) => (
            <li
              key={s.name}
              className="flex items-center justify-between gap-3 rounded-inner border border-ink/10 bg-white p-4"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink">
                  {s.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-ink/65">
                  {s.detail}
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]',
                  s.connected
                    ? 'border-emerald-600/20 bg-emerald-50 text-emerald-800'
                    : 'border-ink/10 bg-milk text-ink/60',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    s.connected ? 'bg-emerald-600' : 'bg-ink/30',
                  )}
                />
                {s.connected ? 'Connected' : 'Not set'}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Prescriber — editable */}
      <PrescriberCard prescriber={prescriber} />

      {/* Notification routing */}
      <Card
        title="Notification routing"
        subtitle="Where system alerts are sent. Set these in your environment variables."
      >
        <div className="space-y-2">
          <ReadRow label="Care team inbox" value={notifications.careTeam} />
          <ReadRow label="Outbound sender" value={notifications.fromEmail} />
        </div>
      </Card>

      {/* Clinic */}
      <Card title="Clinic" subtitle="Public details used across the site.">
        <div className="space-y-2">
          <ReadRow label="Clinic name" value={clinic.name} />
          <ReadRow label="Site URL" value={clinic.siteUrl} />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-shell bg-milk p-6 md:p-8">
      <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
        {title}
      </h2>
      <p className="mt-1 mb-5 text-sm leading-relaxed text-ink/65">
        {subtitle}
      </p>
      {children}
    </section>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-inner border border-ink/10 bg-white p-4">
      <span className="text-sm text-ink/65">{label}</span>
      <span className="truncate text-sm text-ink/90">{value}</span>
    </div>
  );
}

function PrescriberCard({ prescriber }: { prescriber: PrescriberRecord }) {
  return (
    <Card
      title="Prescriber on file"
      subtitle="Name, credential, NPI and state licence. These print on every prescription sent to the pharmacy and on the published prescription policy."
    >
      <PrescriberForm record={prescriber} mode="admin" />
    </Card>
  );
}
