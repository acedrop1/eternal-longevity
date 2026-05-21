'use client';

import { useState } from 'react';
import {
  adminSavePrescriber,
  type SettingsResult,
} from '@/lib/admin-settings-actions';
import { cn } from '@/lib/utils';

export interface ServiceStatus {
  name: string;
  connected: boolean;
  detail: string;
}

export interface AdminSettingsProps {
  services: ServiceStatus[];
  notifications: { careTeam: string; pharmacy: string; fromEmail: string };
  prescriber: { id: string; name: string; npi: string };
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

function PrescriberCard({
  prescriber,
}: {
  prescriber: { id: string; name: string; npi: string };
}) {
  const [name, setName] = useState(prescriber.name);
  const [npi, setNpi] = useState(prescriber.npi);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SettingsResult | null>(null);

  const dirty = name !== prescriber.name || npi !== prescriber.npi;

  async function save() {
    setBusy(true);
    setResult(null);
    try {
      setResult(
        await adminSavePrescriber({ doctorId: prescriber.id, name, npi }),
      );
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Prescriber on file"
      subtitle="The licensed prescriber whose name and NPI appear on every order sent to the pharmacy."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
            PRESCRIBER NAME
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. Bader"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
            NPI (10 DIGITS)
          </label>
          <input
            value={npi}
            onChange={(e) => setNpi(e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            placeholder="1234567890"
            className={inputClass}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={save}
          className={cn(
            'rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98]',
            busy || !dirty
              ? 'cursor-not-allowed bg-foreground/15 text-foreground/40'
              : 'bg-accent text-black hover:bg-accent-soft',
          )}
        >
          {busy ? 'Saving…' : 'Save prescriber'}
        </button>
        {result && (
          <span
            className={cn(
              'text-sm',
              result.ok ? 'text-accent' : 'text-red-300',
            )}
          >
            {result.message}
          </span>
        )}
      </div>
    </Card>
  );
}
