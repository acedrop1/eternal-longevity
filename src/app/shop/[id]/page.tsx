import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ProductPDP, RelatedProducts } from '@/components/shop/ProductPDP';
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
  if (!p) return { title: 'Shop' };
  return {
    title: p.name,
    description: p.shortDescription,
  };
}

export default async function PublicProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = getShopProduct(id);

  if (!product) notFound();

  const related = PUBLIC_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

  return (
    <>
      {/* Light where the product is read and bought; dark again below,
          the way The Protocole drops into its dark step-by-step section. */}
      <div className="theme-light bg-background text-foreground">
      <Header />
      <main className="bg-background pb-12 pt-24 text-foreground md:pb-16 md:pt-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-[88rem] xl:px-10 2xl:max-w-[104rem] 2xl:px-14">
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
          <div className="hidden md:block">
            <ProductPDP
              product={product}
              related={related}
              basePath="/shop"
              ctaHref={`/start?product=${product.id}`}
            />
          </div>
        </div>
      </main>
      </div>

      {related.length > 0 && (
        <section className="bg-background py-14 text-foreground md:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-[88rem] xl:px-10 2xl:max-w-[104rem] 2xl:px-14">
            <RelatedProducts related={related} basePath="/shop" />
          </div>
        </section>
      )}
      <Footer />
    </>
  );
}
