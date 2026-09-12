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
  notifications: { careTeam: string; pharmacy: string; fromEmail: string };
  prescriber: PrescriberRecord;
  clinic: { name: string; siteUrl: string };
}

const inputClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3 text-base text-foreground placeholder-foreground/30 transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

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
          'rounded-2xl border px-4 py-3 text-sm',
          live
            ? 'border-accent/30 bg-accent/10 text-accent'
            : 'border-amber-400/30 bg-amber-500/10 text-amber-200',
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
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-background p-4"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {s.name}
                </div>
                <div className="mt-0.5 truncate text-xs text-foreground/55">
                  {s.detail}
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-widest',
                  s.connected
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-line bg-surface text-foreground/45',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    s.connected ? 'bg-accent' : 'bg-foreground/30',
                  )}
                />
                {s.connected ? 'CONNECTED' : 'NOT SET'}
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
          <ReadRow label="Pharmacy inbox" value={notifications.pharmacy} />
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
    <section className="rounded-3xl border border-line bg-surface p-6 md:p-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1 mb-5 text-sm leading-relaxed text-foreground/55">
        {subtitle}
      </p>
      {children}
    </section>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-background p-4">
      <span className="text-sm text-foreground/65">{label}</span>
      <span className="truncate text-sm text-foreground/90">{value}</span>
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
