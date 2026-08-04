import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ProductPDP } from '@/components/shop/ProductPDP';
import { ProductPDPMobile } from '@/components/shop/ProductPDPMobile';
import { PUBLIC_PRODUCTS, getShopProduct } from '@/lib/shopProducts';

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Only the public (FDA-approved-active) products get a public product page. */
export async function generateStaticParams() {
  return PUBLIC_PRODUCTS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const p = getShopProduct(id);
  if (!p || !p.fdaApproved) return { title: 'Shop' };
  return {
    title: p.name,
    description: p.shortDescription,
  };
}

export default async function PublicProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = getShopProduct(id);

  // Member-only products are not reachable from the public storefront.
  if (!product || !product.fdaApproved) notFound();

  const related = PUBLIC_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <>
      <Header />
      <main className="bg-background pt-24 md:pt-28">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <nav className="mb-8 hidden md:flex items-center gap-2 text-[11px] tracking-widest text-foreground/55">
            <Link href="/shop" className="hover:text-foreground transition-colors">
              SHOP
            </Link>
            <span aria-hidden>/</span>
            <span className="text-foreground/85">{product.name.toUpperCase()}</span>
          </nav>

          {/* Mobile: sticky-gallery + slide-up info panel */}
          <ProductPDPMobile product={product} ctaHref={`/start?product=${product.id}`} />

          {/* Desktop */}
          <div className="hidden md:block pb-24 lg:pb-16">
            <ProductPDP
              product={product}
              related={related}
              basePath="/shop"
              ctaHref={`/start?product=${product.id}`}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
