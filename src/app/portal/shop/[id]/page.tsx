import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ProductPDP } from '@/components/shop/ProductPDP';
import { ProductPDPMobile } from '@/components/shop/ProductPDPMobile';
import { getSession } from '@/lib/auth-server';
import {
  SHOP_PRODUCTS,
  getRelatedProducts,
  getShopProduct,
} from '@/lib/shopProducts';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return SHOP_PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const p = getShopProduct(id);
  if (!p) return { title: 'Shop | Eternal Longevity' };
  return {
    title: `${p.name}. Eternal Longevity`,
    description: p.shortDescription,
  };
}

export default async function ShopProductPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  const { id } = await params;
  const product = getShopProduct(id);
  if (!product) notFound();

  const related = getRelatedProducts(product, 3);

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Dashboard', href: '/portal' },
        { label: 'Shop', href: '/portal/shop' },
        { label: 'Orders', href: '/portal/orders' },
      ]}
    >
      {/* Breadcrumb. Hidden on mobile where the new PDP takes over full-bleed */}
      <nav className="mb-8 hidden md:flex items-center gap-2 text-[11px] tracking-widest text-foreground/55">
        <Link href="/portal/shop" className="hover:text-foreground transition-colors">
          SHOP
        </Link>
        <span aria-hidden>/</span>
        <span className="text-foreground/85">{product.name.toUpperCase()}</span>
      </nav>

      {/* Mobile: sticky-gallery + slide-up info panel */}
      <ProductPDPMobile product={product} />

      {/* Desktop: original PDP layout */}
      <div className="hidden md:block pb-24 lg:pb-0">
        <ProductPDP product={product} related={related} />
      </div>
    </PortalShell>
  );
}
