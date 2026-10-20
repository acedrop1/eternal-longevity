'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { RxHereCatalogItem } from '@/lib/rxhere-rules';

const th = 'px-4 py-2 text-left text-[13px] font-semibold text-ink/70';
const td = 'border-t border-ink/10 px-4 py-2 align-top text-[13px]';
const strengths = (s: unknown) => (Array.isArray(s) ? s.join(', ') : s ? String(s) : '');

/** The whole RxHere catalog, searchable; "Add to site" opens a new draft product filled in from the row. */
export function PharmacyCatalogTable({ items, used }: { items: RxHereCatalogItem[]; used: Record<string, string> }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? items.filter((i) => `${i.name} ${strengths(i.strengths)} ${i.dosage_form ?? ''} ${i.category ?? ''}`.toLowerCase().includes(n)) : items;
  }, [items, q]);

  return (
    <div>
      <div className="px-4 py-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: name, strength, form…"
          aria-label="Search the RxHere catalog"
          className="w-full max-w-md rounded-inner bg-white px-4 py-2.5 text-[15px] text-ink ring-1 ring-ink/15 focus:outline-none focus:ring-ink/30"
        />
        <span className="ml-3 text-[13px] text-ink/60">{shown.length} shown</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-milk">
            <tr>
              {['Product', 'Form', 'Our price', 'Controlled', ''].map((h) => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id}>
                <td className={td}>
                  <span className="font-medium text-ink">{c.name}</span>
                  {strengths(c.strengths) && <div className="text-ink/60">{strengths(c.strengths)}</div>}
                </td>
                <td className={td}>{c.dosage_form ?? '—'}</td>
                <td className={`${td} tabular-nums`}>{typeof c.price_cents === 'number' ? `$${(c.price_cents / 100).toFixed(2)}` : '—'}</td>
                <td className={td}>{c.controlled_substance ? 'Yes · needs DEA' : 'No'}</td>
                <td className={`${td} text-right`}>
                  {used[c.id] ? (
                    <Link href={`/portal/admin/products/${used[c.id]}`} className="text-ink/70 underline underline-offset-2">
                      On site ({used[c.id]})
                    </Link>
                  ) : c.controlled_substance ? (
                    <span className="text-ink/50">Controlled: not offered</span>
                  ) : (
                    <Link
                      href={`/portal/admin/products/new?rx=${encodeURIComponent(c.id)}`}
                      className="inline-flex rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-ink/85"
                    >
                      Add to site
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
