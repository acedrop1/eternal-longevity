'use client';

import { useState } from 'react';
import { PrescriberForm } from '@/components/prescriber/PrescriberForm';
import { saveShippingSettingsAction } from '@/lib/settings-actions';
import type { SettingsResult } from '@/lib/admin-settings-actions';
import type { ShippingSettings } from '@/lib/shipping-settings';
import { cn } from '@/lib/utils';
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
  shipping: ShippingSettings;
}

/**
 * Shopify-style settings: each group is a label column (title and help) and a
 * white card. Service keys are read-only; the prescriber and shipping are forms.
 */
export function AdminSettings({
  services,
  notifications,
  prescriber,
  clinic,
  shipping,
}: AdminSettingsProps) {
  const connectedCount = services.filter((s) => s.connected).length;
  const live = connectedCount > 0;

  return (
    <div className="space-y-6">
      {/* Mode */}
      <p
        className={
          live
            ? 'rounded-inner border border-emerald-600/20 bg-emerald-50 px-4 py-2.5 text-[14px] text-emerald-800'
            : 'rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900'
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
                  <div className="text-[14px] font-medium text-ink">{s.name}</div>
                  <div className="mt-0.5 truncate text-[13px] text-ink/65">{s.detail}</div>
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
        title="Shipping"
        description="What customers pay per box, 2-day and overnight alike. A 12-month plan ships two boxes and pays for both up front."
      >
        <SectionCard>
          <ShippingForm initial={shipping} />
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

function ShippingForm({ initial }: { initial: ShippingSettings }) {
  const [saved, setSaved] = useState(initial);
  const [price, setPrice] = useState(String(initial.pricePerShipment));
  const [firstOrderFree, setFirstOrderFree] = useState(initial.firstOrderFree);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SettingsResult | null>(null);
  const dirty = price !== String(saved.pricePerShipment) || firstOrderFree !== saved.firstOrderFree;

  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await saveShippingSettingsAction({ pricePerShipment: Number(price), firstOrderFree });
      setResult(res);
      if (res.ok && res.value) {
        setSaved(res.value);
        setPrice(String(res.value.pricePerShipment));
        setFirstOrderFree(res.value.firstOrderFree);
      }
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink/70">Shipping per box</span>
          <span className="relative block">
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-ink/60">
              $
            </span>
            <input
              inputMode="numeric"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value.replace(/[^0-9]/g, '').slice(0, 3));
                setResult(null);
              }}
              className="w-full rounded-inner bg-white py-3 pl-8 pr-4 text-[16px] tabular-nums text-ink ring-1 ring-ink/10 focus:outline-none focus:ring-ink/30"
            />
          </span>
          <span className="mt-1 block text-[13px] text-ink/60">Whole dollars, $0 to $200.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 sm:pt-7">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 flex-none accent-ink"
            checked={firstOrderFree}
            onChange={(e) => {
              setFirstOrderFree(e.target.checked);
              setResult(null);
            }}
          />
          <span>
            <span className="block text-[14px] font-medium text-ink">First order ships free</span>
            <span className="block text-[13px] leading-snug text-ink/60">
              A member&apos;s first paid order ships its first box free. Renewals and the second box of a 12-month plan still pay.
            </span>
          </span>
        </label>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink/60">
        Shown on product pages and charged at checkout and on every renewal. Every change is recorded in the audit trail.
      </p>

      {result && (
        <p
          role={result.ok ? 'status' : 'alert'}
          className={cn(
            'mt-4 rounded-inner border px-4 py-3 text-sm',
            result.ok ? 'border-emerald-600/20 bg-emerald-50 text-emerald-800' : 'border-red-600/20 bg-red-50 text-red-700',
          )}
        >
          {result.message}
        </p>
      )}

      <div className="mt-5">
        <button
          type="button"
          disabled={busy || !dirty || price === ''}
          onClick={save}
          className={cn(
            'rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all active:scale-[0.98]',
            busy || !dirty || price === '' ? 'cursor-not-allowed bg-ink/10 text-ink/65' : 'bg-ink text-white hover:bg-ink/85',
          )}
        >
          {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>
    </div>
  );
}

function Divider() {
  return <hr className="border-ink/10" />;
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-ink/10 px-4 py-3 first:border-t-0">
      <span className="flex-none text-[14px] text-ink/65">{label}</span>
      <span className="min-w-0 truncate text-[14px] text-ink/90">{value}</span>
    </div>
  );
}
