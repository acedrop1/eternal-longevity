'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SectionCard, StatusBadge, th } from '@/components/admin/IndexTable';
import { planEconomics } from '@/lib/profit';
import type { ShippingSettings } from '@/lib/shipping-settings';
import { savePricingAction, type ProductInput } from '@/lib/product-actions';
import type { Position } from '@/lib/competitor-prices';
import { cn } from '@/lib/utils';

export interface PricingRow {
  id: string;
  name: string;
  sub: string;
  pricing: ProductInput['pricing'];
  twelveMonthPlan: boolean;
  unitCost: number;
  quantity: number;
  storage?: 'refrigerated' | 'room';
  comp?: { market: string; position: Position };
}

type PlanKey = 'monthly' | 'quarterly' | 'sixMonth' | 'annual';
const PLANS: { key: PlanKey; label: string; months: number }[] = [
  { key: 'monthly', label: '1 month', months: 1 },
  { key: 'quarterly', label: '3 months', months: 3 },
  { key: 'sixMonth', label: '6 months', months: 6 },
  { key: 'annual', label: '12 months', months: 12 },
];

const POSITION: Record<Position, [string, 'success' | 'neutral' | 'critical']> = {
  cheapest: ['Cheapest', 'success'],
  middle: ['Middle', 'neutral'],
  high: ['Above market', 'critical'],
};

const usd = (cents: number) => `${cents < 0 ? '−' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;
const whole = (cents: number) => `${cents < 0 ? '−' : ''}$${Math.round(Math.abs(cents) / 100)}`;
const field =
  'w-full rounded-thumb bg-white py-1.5 pl-6 pr-2 text-right text-[16px] tabular-nums text-ink ring-1 ring-ink/15 focus:outline-none focus:ring-2 focus:ring-ink/30 md:text-[14px]';
/** Our cost for a 30-day supply (a bottle, a vial), in dollars. */
const monthCost = (r: Pick<PricingRow, 'unitCost' | 'quantity'>) => r.unitCost * Math.max(1, r.quantity);
const planPrice = (r: PricingRow, key: PlanKey) => (key === 'sixMonth' ? (r.pricing.sixMonth ?? 0) : r.pricing[key]);

/**
 * Admin → Pricing. Read-only by default; the pencil on a row opens it for
 * editing, where every number recalculates as you type. Costs are per 30-day
 * supply (what the pharmacy bills for a bottle or vial), never per capsule.
 * Save writes through the product editor's own save (same checks, same audit).
 */
export function PricingEditor({ rows, shipping }: { rows: PricingRow[]; shipping: ShippingSettings }) {
  const [list, setList] = useState(rows);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <SectionCard flush>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-[14px]">
          <thead>
            <tr>
              <th className={th}>Product</th>
              <th className={cn(th, 'text-right')}>Our cost / mo</th>
              {PLANS.map((pl) => (
                <th key={pl.key} className={cn(th, 'text-right')}>
                  {pl.label}
                </th>
              ))}
              <th className={th}>Market</th>
              <th className={th}>
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) =>
              editing === r.id ? (
                <EditRow
                  key={r.id}
                  row={r}
                  shipping={shipping}
                  onCancel={() => setEditing(null)}
                  onSaved={(next) => {
                    setList((xs) => xs.map((x) => (x.id === next.id ? next : x)));
                    setEditing(null);
                  }}
                />
              ) : (
                <ViewRow key={r.id} row={r} shipping={shipping} onEdit={() => setEditing(r.id)} disabled={editing !== null} />
              ),
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function economics(r: PricingRow, key: PlanKey, months: number, shipping: ShippingSettings, firstOrder = false) {
  const price = planPrice(r, key);
  if (!(price > 0) || !(r.unitCost > 0) || (key === 'annual' && !r.twelveMonthPlan)) return null;
  return planEconomics(price, shipping.pricePerShipment, months, { unitCost: r.unitCost, quantity: r.quantity, storage: r.storage }, { firstOrder });
}

function MarketCell({ comp }: { comp?: PricingRow['comp'] }) {
  return comp ? (
    <>
      <StatusBadge tone={POSITION[comp.position][1]}>{POSITION[comp.position][0]}</StatusBadge>
      <div className="mt-1 text-[13px] leading-snug text-ink/65">{comp.market}</div>
    </>
  ) : (
    <span className="text-[13px] text-ink/45">Not checked</span>
  );
}

function ViewRow({ row: r, shipping, onEdit, disabled }: { row: PricingRow; shipping: ShippingSettings; onEdit: () => void; disabled: boolean }) {
  return (
    <tr className="border-t border-ink/10 align-top">
      <td className="px-2 py-3 pl-4">
        <Link href={`/portal/admin/products/${r.id}`} className="font-medium text-ink hover:underline">
          {r.name}
        </Link>
        <div className="text-[12px] text-ink/55">{r.sub}</div>
      </td>
      <td className="px-2 py-3 text-right tabular-nums text-ink">{r.unitCost > 0 ? usd(Math.round(monthCost(r) * 100)) : <span className="text-amber-800">Not set</span>}</td>
      {PLANS.map(({ key, months }) => {
        const price = planPrice(r, key);
        const e = economics(r, key, months, shipping);
        const off = key === 'annual' && !r.twelveMonthPlan;
        return (
          <td key={key} className="px-2 py-3 text-right tabular-nums">
            {off || !price ? (
              <span className="text-ink/30">—</span>
            ) : (
              <>
                <div className="font-semibold text-ink">${Math.round(price / months)}/mo</div>
                {e && (
                  <div className={cn('text-[12px]', e.profit < 0 ? 'text-red-700' : e.margin !== null && e.margin < 0.2 ? 'text-amber-800' : 'text-ink/55')}>
                    {whole(e.profit)} profit · {e.margin === null ? '—' : `${Math.round(e.margin * 100)}%`}
                  </div>
                )}
              </>
            )}
          </td>
        );
      })}
      <td className="min-w-[230px] px-2 py-3">
        <MarketCell comp={r.comp} />
      </td>
      <td className="w-12 px-2 py-3 pr-4 text-right">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          aria-label={`Edit ${r.name} pricing`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-thumb text-ink/60 transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" strokeLinejoin="round" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

function EditRow({
  row,
  shipping,
  onCancel,
  onSaved,
}: {
  row: PricingRow;
  shipping: ShippingSettings;
  onCancel: () => void;
  onSaved: (r: PricingRow) => void;
}) {
  const router = useRouter();
  const [r, setR] = useState(row);
  // The month's cost as typed ("31." survives); unitCost is derived from it.
  const [costText, setCostText] = useState(row.unitCost ? String(Math.round(monthCost(row) * 100) / 100) : '');
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(r) !== JSON.stringify(row);

  const setPrice = (key: PlanKey, v: string) => setR((x) => ({ ...x, pricing: { ...x.pricing, [key]: v === '' ? 0 : Math.round(Number(v)) } }));
  const save = () =>
    start(async () => {
      setError(null);
      const res = await savePricingAction([{ id: r.id, pricing: r.pricing, twelveMonthPlan: r.twelveMonthPlan, unitCost: r.unitCost }]);
      if (!res.ok) {
        setError(res.failed[0]?.message ?? res.message);
        return;
      }
      onSaved(r);
      router.refresh();
    });

  return (
    <>
      <tr className="border-t border-ink/10 bg-butter/15 align-top">
        <td className="px-2 py-3 pl-4">
          <span className="font-medium text-ink">{r.name}</span>
          <div className="text-[12px] text-ink/55">{r.sub}</div>
        </td>
        <td className="w-[128px] px-2 py-3">
          <Dollar
            label={`${r.name}: our cost per month`}
            value={costText}
            onChange={(v) => {
              const t = v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
              setCostText(t);
              setR((x) => ({ ...x, unitCost: (Number(t) || 0) / Math.max(1, x.quantity) }));
            }}
          />
          <div className="mt-1 text-right text-[12px] text-ink/55">per 30 days</div>
        </td>
        {PLANS.map(({ key, label, months }) => {
          const price = planPrice(r, key);
          const off = key === 'annual' && !r.twelveMonthPlan;
          const e = economics(r, key, months, shipping);
          const first = economics(r, key, months, shipping, true);
          return (
            <td key={key} className="w-[136px] px-2 py-3 text-right tabular-nums">
              {key === 'annual' && (
                <label className="mb-1 flex items-center justify-end gap-1.5 text-[12px] text-ink/65">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-ink" checked={r.twelveMonthPlan} onChange={(ev) => setR((x) => ({ ...x, twelveMonthPlan: ev.target.checked }))} />
                  Offer
                </label>
              )}
              <Dollar label={`${r.name}: ${label} price`} value={price ? String(price) : ''} disabled={off} onChange={(v) => setPrice(key, v.replace(/[^0-9]/g, ''))} />
              {!off && price > 0 && <div className="mt-1 text-[12px] text-ink/55">billed · ${Math.round(price / months)}/mo</div>}
              {e && (
                <div className={cn('text-[13px] font-semibold', e.profit < 0 ? 'text-red-700' : 'text-ink')}>
                  {usd(e.profit)} <span className="font-normal text-ink/55">{e.margin === null ? '' : `${Math.round(e.margin * 100)}%`}</span>
                </div>
              )}
              {first && <div className={cn('text-[12px]', first.profit < 0 ? 'text-red-700' : 'text-ink/50')}>first order {usd(first.profit)}</div>}
            </td>
          );
        })}
        <td className="min-w-[230px] px-2 py-3">
          <MarketCell comp={r.comp} />
        </td>
        <td className="w-12 px-2 py-3 pr-4" />
      </tr>
      <tr className="bg-butter/15">
        <td colSpan={8} className="px-4 pb-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {error && <span className="mr-auto text-[13px] text-red-700">{error}</span>}
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="inline-flex min-h-[36px] items-center rounded-thumb bg-white px-3.5 text-[14px] font-semibold text-ink ring-1 ring-ink/15 hover:bg-milk disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex min-h-[36px] items-center rounded-thumb bg-ink px-3.5 text-[14px] font-semibold text-white hover:bg-ink/85 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </td>
      </tr>
    </>
  );
}

function Dollar({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <span className="relative block">
      <span aria-hidden className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink/50">
        $
      </span>
      <input
        aria-label={label}
        className={cn(field, disabled && 'bg-milk text-ink/40')}
        inputMode="decimal"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}
