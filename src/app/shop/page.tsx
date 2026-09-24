import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ProductCard } from '@/components/sections/ProductRail';
import { Process } from '@/components/sections/Process';
import { PriceChart } from '@/components/sections/PriceChart';
import { Reviews } from '@/components/sections/Reviews';
import { HomeFAQ } from '@/components/sections/HomeFAQ';
import { buildShowcase } from '@/lib/showcase';
import { getLiveProducts } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Compounded peptide protocols, prescribed by a New Jersey physician and dispensed by a licensed 503A pharmacy. Subscribe monthly or quarterly.',
};

/**
 * Shop all, in the homepage's language: every product as a tall photo card,
 * then the same how-it-works, price and FAQ sections. Products come from the
 * live catalogue (Admin → Products), plus local-preview cards in development.
 */
export default async function PublicShopPage() {
  const SHOWCASE = buildShowcase(await getLiveProducts());
  return (
    <>
      <Header categoryStrip />
      <main className="bg-white text-black">
        {/* Top padding clears the fixed header + product strip (126 / 134px). */}
        {/* Edge to edge, System Labs style: the grid runs the full width with
            a thin gutter. */}
        <section className="px-2 pb-16 pt-[158px] md:px-3 md:pb-24 md:pt-[182px]">
          <div>
            <div className="mb-8 flex px-3 md:px-5 flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
              <div>
                <h1
                  className="font-display font-normal"
                  style={{ fontSize: 'clamp(2.4rem, 3.4vw + 1rem, 4.5rem)', fontStretch: '75%', lineHeight: 1 }}
                >
                  Shop all.
                </h1>
                <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-black/70">
                  Compounded to order by a licensed 503A pharmacy, and prescribed only after a physician reviews your
                  assessment.
                </p>
              </div>
              <p className="font-mono text-[13px] text-black/55">
                {SHOWCASE.length} products · Prescription required
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-3">
              {SHOWCASE.map((item) => (
                <ProductCard key={item.id} item={item} variant="grid" className="w-full" />
              ))}
            </div>

            {/* Members see the rest of the catalog once signed in. */}
            <div className="mx-1 mt-12 flex flex-col gap-6 rounded-[4px] bg-black px-6 py-8 text-white md:mt-16 md:flex-row md:items-center md:justify-between md:px-10 md:py-10">
              <div>
                <h2
                  className="font-display font-normal"
                  style={{ fontSize: 'clamp(1.6rem, 1.4vw + 1rem, 2.4rem)', fontStretch: '75%', lineHeight: 1.05 }}
                >
                  The full catalog lives in your portal.
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">
                  Additional compounded formulations are available to members after a completed assessment.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href="/signup"
                  className="rounded-full bg-white px-4 py-2.5 font-mono text-[13px] text-black transition-colors hover:bg-white/85"
                >
                  Create an account
                </Link>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2.5 font-mono text-[13px] text-white ring-1 ring-white/30 transition-colors hover:bg-white/10"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <Process />
        <PriceChart />
        <Reviews /> {/* local preview only: renders nothing in production */}
        <HomeFAQ />
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}
