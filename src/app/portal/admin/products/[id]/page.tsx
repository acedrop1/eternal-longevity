import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { AdminProductEditor } from '@/components/admin/AdminProductEditor';
import { getSession } from '@/lib/auth-server';
import { catalogStore, getCatalogProduct } from '@/lib/catalog';
import type { ProductInput } from '@/lib/product-actions';

export const metadata: Metadata = { title: 'Edit product' };
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

// A new product starts as a draft: nothing reaches the site until an admin
// fills it in and deliberately sets it live.
const BLANK: ProductInput = {
  id: '',
  isNew: true,
  status: 'draft',
  name: '',
  tagline: '',
  category: 'longevity',
  delivery: 'sq',
  cycleLength: '12-week cycle',
  shortDescription: '',
  longDescription: '',
  bestFor: '',
  benefits: [],
  whatsIncluded: [],
  sideEffects: [],
  contraindications: [],
  pricing: { monthly: 199, quarterly: 540, annual: 1910 },
  image: '',
  popular: false,
  fdaApproved: false,
};

export default async function AdminProductPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect(user.redirectTo);

  const { id } = await params;
  let initial: ProductInput = BLANK;
  if (id !== 'new') {
    const p = await getCatalogProduct(id);
    if (!p) notFound();
    initial = {
      id: p.id,
      isNew: false,
      status: p.status,
      name: p.name,
      tagline: p.tagline,
      category: p.category,
      delivery: p.delivery,
      cycleLength: p.cycleLength,
      shortDescription: p.shortDescription,
      longDescription: p.longDescription,
      bestFor: p.bestFor,
      benefits: p.benefits,
      whatsIncluded: p.whatsIncluded,
      sideEffects: p.sideEffects,
      contraindications: p.contraindications,
      pricing: p.pricing,
      image: p.image,
      popular: Boolean(p.popular),
      fdaApproved: Boolean(p.fdaApproved),
    };
  }

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 font-mono text-[13px] text-black/55">
        <Link href="/portal/admin/products" className="transition-colors hover:text-black">
          Products
        </Link>
        <span aria-hidden>/</span>
        <span className="text-black/85">{initial.isNew ? 'New product' : initial.name}</span>
      </nav>
      <AdminProductEditor initial={initial} canSave={catalogStore() !== 'none'} />
    </PortalShell>
  );
}
