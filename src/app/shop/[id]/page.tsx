import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { Process } from '@/components/sections/Process';
import { HomeFAQ } from '@/components/sections/HomeFAQ';
import { ProductPDP, RelatedProducts } from '@/components/shop/ProductPDP';
import { ProductPDPMobile } from '@/components/shop/ProductPDPMobile';
import { getLiveProduct, getLiveProducts, toShopProduct } from '@/lib/catalog';

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Only live products (Admin → Products) get a public product page. */
/*
 * A withheld or draft product must 404, not render a not-found page with a
 * 200. A statically generated on-demand page calls notFound() and the edge
 * caches that render with a success status. Rendering per request keeps the
 * real 404 status and lets a product made live in admin appear immediately.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const p = await getLiveProduct(id);
  if (!p) return { title: 'Shop' };
  return {
    title: p.name,
    description: p.shortDescription,
  };
}

export default async function PublicProductPage({ params }: PageProps) {
  const { id } = await params;
  const live = await getLiveProduct(id);
  if (!live) notFound();
  const product = toShopProduct(live);

  const related = (await getLiveProducts())
    .filter((p) => p.id !== product.id)
    .slice(0, 3)
    .map(toShopProduct);

  return (
    <>
      <Header categoryStrip />
      {/* --pdp-sticky-top: the buy column sticks just under the fixed header + product strip (134px). */}
      <main className="bg-white text-black" style={{ '--pdp-sticky-top': '158px' } as React.CSSProperties}>
        {/* Top padding clears the fixed header + product strip (126 / 134px). */}
        <section className="px-5 pb-16 pt-[142px] md:px-8 md:pb-24 md:pt-[182px]">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb" className="mb-6 hidden items-center gap-2 font-mono text-[13px] text-black/55 md:flex">
              <Link href="/shop" className="transition-colors hover:text-black">
                Shop
              </Link>
              <span aria-hidden>/</span>
              <span className="text-black/85">{product.name}</span>
            </nav>

            <ProductPDPMobile product={product} ctaHref={`/start?product=${product.id}`} />
            <div className="hidden md:block">
              <ProductPDP product={product} related={related} basePath="/shop" ctaHref={`/start?product=${product.id}`} />
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="bg-[#F2F2F0] px-5 py-16 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl">
              <RelatedProducts related={related} basePath="/shop" />
            </div>
          </section>
        )}

        <Process />
        <HomeFAQ />
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}
