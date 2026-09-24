import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ProductPDP, RelatedProducts } from '@/components/shop/ProductPDP';
import { ProductPDPMobile } from '@/components/shop/ProductPDPMobile';
import { getSession } from '@/lib/auth-server';
import { MEMBER_NAV } from '@/components/portal/ui';
import { getLiveProduct, getLiveProducts, toShopProduct } from '@/lib/catalog';

interface PageProps {
  params: Promise<{ id: string }>;
}

/*
 * Only live products (Admin → Products) resolve, in the portal as much as on
 * the public shop: a signed-in member is not a different legal posture.
 * Rendered per request so a withheld or draft product returns a real 404 and
 * a product made live in admin appears immediately.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const p = await getLiveProduct(id);
  if (!p) return { title: 'Shop' };
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
  const live = await getLiveProduct(id);
  if (!live) notFound();
  const product = toShopProduct(live);

  // Same category first, then the rest, three in all.
  const others = (await getLiveProducts()).filter((p) => p.id !== product.id).map(toShopProduct);
  const related = [
    ...others.filter((p) => p.category === product.category),
    ...others.filter((p) => p.category !== product.category),
  ].slice(0, 3);

  return (
    <PortalShell user={user} nav={MEMBER_NAV}>
      {/* Breadcrumb. Hidden on mobile, where the PDP opens on the photo */}
      <nav
        aria-label="Breadcrumb"
        className="hidden items-center gap-2 font-mono text-[13px] text-black/55 md:flex"
      >
        <Link href="/portal/shop" className="transition-colors hover:text-black">
          Shop
        </Link>
        <span aria-hidden>/</span>
        <span aria-current="page" className="text-black">{product.name}</span>
      </nav>

      {/* Mobile: photo + plan picker, with the floating buy bar */}
      <ProductPDPMobile product={product} />

      {/* Desktop: two-column PDP */}
      <div className="hidden pb-16 md:block lg:pb-0">
        <ProductPDP product={product} related={related} />
        <div className="mt-16">
          <RelatedProducts related={related} basePath="/portal/shop" />
        </div>
      </div>
    </PortalShell>
  );
}
