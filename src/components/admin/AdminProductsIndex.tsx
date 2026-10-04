'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ProductStatus } from '@/lib/catalog';
import {
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  StatusBadge,
  fromControl,
  indexCard,
  row as rowClass,
  table,
  tbody,
  td,
  th,
  thead,
  type BadgeTone,
} from '@/components/admin/IndexTable';

export interface ProductRowView {
  id: string;
  name: string;
  image: string;
  status: ProductStatus;
  category: string;
  monthly: number;
  from: number;
  /** Set: orders go to the pharmacy automatically. Missing: placed by hand. */
  hasSku: boolean;
  /** Admin only: profit and margin per plan (monthly first); empty when no cost is set. */
  plans: { label: string; profit: number; margin: number | null }[];
  /** "edited Oct 2 by Ops Admin", or null for the built-in copy. */
  edited: string | null;
}

export const PRODUCT_STATUS: Record<ProductStatus, [string, BadgeTone, string]> = {
  live: ['Live', 'success', 'Listed on the site and orderable.'],
  draft: ['Draft', 'info', 'Being prepared. Not visible anywhere on the site.'],
  withheld: ['Withheld', 'attention', 'Pulled from sale (compliance or prescriber decision). No page, no link, cannot be ordered.'],
};

type Tab = 'all' | ProductStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'draft', label: 'Draft' },
  { key: 'withheld', label: 'Withheld' },
];

const href = (id: string) => `/portal/admin/products/${id}`;
const pct = (m: number | null) => (m === null ? '—' : `${Math.round(m * 100)}%`);
const dollars = (cents: number) => `${cents < 0 ? '−' : ''}$${Math.round(Math.abs(cents) / 100)}`;

export function AdminProductsIndex({ products }: { products: ProductRowView[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (tab === 'all' || p.status === tab) &&
        (!q || p.name.toLowerCase().includes(q) || p.id.includes(q) || p.category.toLowerCase().includes(q)),
    );
  }, [products, tab, query]);

  return (
    <div className={indexCard}>
      <IndexTabs
        label="Product status"
        tabs={TABS.map((t) => ({
          ...t,
          count: t.key === 'all' ? products.length : products.filter((p) => p.status === t.key).length,
        }))}
        value={tab}
        onChange={setTab}
      />
      {tab !== 'all' && (
        <p className="border-b border-ink/10 bg-milk/40 px-4 py-2 text-[13px] text-ink/65">{PRODUCT_STATUS[tab][2]}</p>
      )}
      <IndexToolbar query={query} onQuery={setQuery} placeholder="Search products" />

      <div className="md:overflow-x-auto">
        <table className={table}>
          <thead className={thead}>
            <tr>
              <th className={th}>
                <span className="sr-only">Photo</span>
              </th>
              <th className={th}>Product</th>
              <th className={th}>Status</th>
              <th className={th}>Category</th>
              <th className={cn(th, 'text-right')}>Price</th>
              <th className={cn(th, 'text-right')}>Monthly margin</th>
              <th className={th}>Pharmacy SKU</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {visible.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={7} className="block px-4 py-10 text-center text-[14px] text-ink/65 md:table-cell">
                  {products.length === 0 ? 'No products yet.' : 'No products match.'}
                </td>
              </tr>
            ) : (
              visible.map((p) => {
                const [label, tone] = PRODUCT_STATUS[p.status];
                return (
                  <tr
                    key={p.id}
                    className={cn(rowClass, 'flex-nowrap items-start pr-4 md:items-center')}
                    onClick={(e) => {
                      if (!fromControl(e.target)) router.push(href(p.id));
                    }}
                  >
                    <td className={cn(td, 'flex-none md:w-14 md:pr-0')}>
                      <span className="relative block h-10 w-10 overflow-hidden rounded-thumb bg-milk ring-1 ring-ink/10">
                        {p.image && <Image src={p.image} alt="" fill sizes="40px" className="object-cover" />}
                      </span>
                    </td>
                    <td className={cn(td, 'min-w-0 flex-1')}>
                      <Link href={href(p.id)} className="block truncate font-medium text-ink hover:underline md:max-w-[260px]">
                        {p.name}
                      </Link>
                      <span className="block truncate text-[13px] text-ink/60 md:max-w-[260px]">
                        /{p.id}
                        {p.edited && ` · ${p.edited}`}
                      </span>
                      {/* Mobile: the other columns as one wrapped line. */}
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] text-ink/65 md:hidden">
                        <StatusBadge tone={tone}>{label}</StatusBadge>
                        <span>{p.category}</span>
                        <span className="tabular-nums">· from ${p.from}/mo</span>
                        {!p.hasSku && <span className="text-amber-800">· No SKU</span>}
                        {p.plans[0] && (
                          <span className={cn('tabular-nums', p.plans[0].profit < 0 && 'text-red-700')}>
                            · {pct(p.plans[0].margin)} margin monthly
                          </span>
                        )}
                      </span>
                    </td>
                    <td className={cn(td, 'hidden')}>
                      <StatusBadge tone={tone}>{label}</StatusBadge>
                    </td>
                    <td className={cn(td, 'hidden text-ink/80')}>{p.category}</td>
                    <td className={cn(td, 'hidden whitespace-nowrap text-right tabular-nums')}>
                      <span className="text-ink">from ${p.from}/mo</span>
                      <span className="block text-[13px] text-ink/60">${p.monthly}/mo monthly</span>
                    </td>
                    <td className={cn(td, 'hidden whitespace-nowrap text-right tabular-nums')}>
                      {p.plans[0] ? (
                        <>
                          <span className={cn(p.plans[0].profit < 0 ? 'text-red-700' : 'text-ink')}>
                            {dollars(p.plans[0].profit)} · {pct(p.plans[0].margin)}
                          </span>
                          <span className="block text-[13px] text-ink/60">
                            {p.plans
                              .slice(1)
                              .map((x) => `${x.label} ${pct(x.margin)}`)
                              .join(' · ') || 'monthly'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[13px] text-ink/55">No cost set</span>
                      )}
                    </td>
                    <td className={cn(td, 'hidden')}>
                      {p.hasSku ? (
                        <StatusBadge tone="neutral">Set</StatusBadge>
                      ) : (
                        <StatusBadge tone="attention">Missing</StatusBadge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <IndexFooter shown={visible.length} total={products.length} noun="products" />
    </div>
  );
}
