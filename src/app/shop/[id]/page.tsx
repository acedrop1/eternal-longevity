import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ArrowDot, Aura, ClosingBand, GLASS, HomeFAQ, HowItWorks, ProductTile } from '@/components/home/HomeSections';
import { ProductPDP } from '@/components/shop/ProductPDP';
import { ProductPDPMobile } from '@/components/shop/ProductPDPMobile';
import { getLiveProduct, getLiveProducts, toShopProduct } from '@/lib/catalog';
import { pageMeta } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { getSession } from '@/lib/auth-server';
import { intakeStateFor, latestIntakeAnswers } from '@/lib/intake-status';
import { intakeCovers } from '@/lib/purchase-rules';
import { heldProductsFor } from '@/lib/held-products';
import { supabaseAdminConfigured } from '@/lib/supabase/admin';

/**
 * The one shop, for visitors and members alike. The button fits who is
 * looking: a member who already has this product goes to that order or plan;
 * one assessed for it picks a plan and adds it to the cart; everyone else
 * starts the assessment (members only answer this product's questions).
 * Demo stores no intakes, so a demo member can add to cart to try checkout.
 */
async function ctaFor(productId: string): Promise<{ href?: string; label?: string }> {
  const start = { href: `/start?product=${productId}` };
  const user = await getSession();
  if (user?.role !== 'member') return start;
  if (!supabaseAdminConfigured()) return {};
  const [held, state, answers] = await Promise.all([
    heldProductsFor(user.id),
    intakeStateFor(user.id),
    latestIntakeAnswers(user.id),
  ]);
  const has = held.get(productId);
  if (has === 'plan') return { href: '/portal/subscriptions', label: 'Manage your plan' };
  if (has === 'order') return { href: '/portal/orders', label: 'View your order' };
  return state === 'submitted' && intakeCovers(answers, productId) ? {} : start;
}

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
  return pageMeta(`/shop/${p.id}`, p.name, p.shortDescription);
}

export default async function PublicProductPage({ params }: PageProps) {
  const { id } = await params;
  const live = await getLiveProduct(id);
  if (!live) notFound();
  const product = toShopProduct(live);
  const cta = await ctaFor(product.id);

  const relatedLive = (await getLiveProducts()).filter((p) => p.id !== product.id).slice(0, 3);
  const related = relatedLive.map(toShopProduct);

  return (
    <>
      <Header categoryStrip />
      {/* --pdp-sticky-top: the buy column sticks just under the fixed header + product strip (134px). */}
      <main className="bg-white text-ink" style={{ '--pdp-sticky-top': '158px', '--pdp-fit': '284px' } as React.CSSProperties}>
        <section className="px-5 pb-16 pt-44 md:px-10 md:pb-24 md:pt-52">
          <nav aria-label="Breadcrumb" className="mb-6 hidden items-center gap-2 text-[13px] font-medium text-ink/65 md:flex">
            <Link href="/shop" className="transition-colors hover:text-ink">
              Shop
            </Link>
            <span aria-hidden>/</span>
            <span className="text-ink">{product.name}</span>
          </nav>

          <ProductPDPMobile product={product} ctaHref={cta.href} ctaLabel={cta.label} />
          <div className="hidden md:block">
            <ProductPDP product={product} related={related} basePath="/shop" ctaHref={cta.href} ctaLabel={cta.label} />
          </div>
        </section>

        {relatedLive.length > 0 && (
          <section className="relative overflow-hidden bg-white px-5 pb-16 md:px-10 md:pb-24">
            <Aura mix="dusk" className="opacity-60" />
            <div className="relative">
              <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
                <h2 className="text-[36px] font-semibold leading-[1] tracking-[-0.05em] text-ink md:text-[56px]">Keep exploring.</h2>
                <Link href="/shop" className={cn('group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full py-1.5 pl-4 pr-1.5 text-[14px] font-medium text-ink', GLASS)}>
                  Shop all
                  <ArrowDot className="h-7 w-7 bg-white" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
                {relatedLive.map((p) => (
                  <ProductTile key={p.id} p={p} sizes="(max-width: 1024px) 50vw, 33vw" />
                ))}
              </div>
            </div>
          </section>
        )}

        <HowItWorks />
        <div className="pt-16 md:pt-24">
          <HomeFAQ />
        </div>
        <ClosingBand />
      </main>
      <Footer />
    </>
  );
}
