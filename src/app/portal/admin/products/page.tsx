import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV, PageHeader, SectionTitle, StatusChip, btnPrimary, inset, panel, type Tone } from '@/components/portal/ui';
import { getSession, loginUrl } from '@/lib/auth-server';
import { catalogStore, getCatalog, getPharmacyEntries, type CatalogProduct, type ProductStatus } from '@/lib/catalog';
import { SHOP_CATEGORIES } from '@/lib/shopProducts';
import { fromPrice } from '@/lib/lineup';

export const metadata: Metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

const GROUPS: { status: ProductStatus; title: string; note: string; tone: Tone; label: string }[] = [
  { status: 'live', title: 'Live', note: 'Listed on the site and orderable.', tone: 'success', label: 'Live' },
  { status: 'draft', title: 'Drafts', note: 'Being prepared. Not visible anywhere on the site.', tone: 'muted', label: 'Draft' },
  {
    status: 'withheld',
    title: 'Withheld',
    note: 'Pulled from sale (compliance or prescriber decision). No page, no link, cannot be ordered.',
    tone: 'warn',
    label: 'Withheld',
  },
];

const STORE_NOTE: Record<ReturnType<typeof catalogStore>, string | null> = {
  supabase: null,
  file: 'Local preview: changes save to .data/products.json on this computer and are not on the live site.',
  none: 'Connect Supabase to edit products. The site is showing the built-in catalogue.',
};

export default async function AdminProductsPage() {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const [products, pharmacy] = await Promise.all([getCatalog(), getPharmacyEntries()]);
  const note = STORE_NOTE[catalogStore()];

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageHeader
          title="Products."
          intro="Everything the shop sells: names, prices, photos and safety information. Only live products appear on the site."
        />
        {catalogStore() !== 'none' && (
          <Link href="/portal/admin/products/new" className={btnPrimary}>
            New product
          </Link>
        )}
      </div>

      {note && (
        <p className="mt-6 flex items-start gap-2 rounded-inner bg-milk px-4 py-3 text-[13px] leading-relaxed text-ink/70">
          <span aria-hidden className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-butter-deep" />
          {note}
        </p>
      )}

      <div className="mt-10 space-y-12">
        {GROUPS.map((g) => {
          const rows = products.filter((p) => p.status === g.status);
          return (
            <section key={g.status}>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <SectionTitle>
                  {g.title} <span className="text-[13px] text-ink/50">{rows.length}</span>
                </SectionTitle>
                <p className="text-[14px] text-ink/60">{g.note}</p>
              </div>
              {rows.length === 0 ? (
                <p className={`${panel} px-5 py-6 text-[14px] text-ink/60`}>None.</p>
              ) : (
                <ul className={`${panel} divide-y divide-ink/10 overflow-hidden`}>
                  {rows.map((p) => (
                    <ProductRow key={p.id} p={p} tone={g.tone} label={g.label} hasSku={Boolean(pharmacy[p.id]?.sku)} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </PortalShell>
  );
}

function ProductRow({ p, tone, label, hasSku }: { p: CatalogProduct; tone: Tone; label: string; hasSku: boolean }) {
  const category = SHOP_CATEGORIES.find((c) => c.key === p.category)?.label ?? p.category;
  return (
    <li>
      <Link
        href={`/portal/admin/products/${p.id}`}
        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-ink/[0.03] md:px-5"
      >
        <span className={`${inset} relative h-14 w-12 flex-none overflow-hidden`}>
          {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[16px] font-medium text-ink">{p.name}</span>
            <StatusChip tone={tone}>{label}</StatusChip>
            {/* Set: orders go to the pharmacy automatically. Missing: placed by hand. */}
            <StatusChip tone={hasSku ? 'neutral' : 'muted'}>{hasSku ? 'Pharmacy SKU set' : 'No pharmacy SKU'}</StatusChip>
          </span>
          <span className="mt-1 block truncate text-[12px] text-ink/55">
            /{p.id} · {category}
            {p.edited && p.updatedAt && (
              <>
                {' '}
                · edited {new Date(p.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {p.updatedBy ? ` by ${p.updatedBy}` : ''}
              </>
            )}
          </span>
        </span>
        <span className="hidden flex-none text-right tabular-nums sm:block">
          <span className="block text-[15px] text-ink">${p.pricing.monthly}/mo</span>
          <span className="block text-[12px] text-ink/55">
            ${fromPrice(p.pricing)}/mo from
          </span>
        </span>
        <span aria-hidden className="flex-none text-[13px] text-ink/40">
          Edit
        </span>
      </Link>
    </li>
  );
}
