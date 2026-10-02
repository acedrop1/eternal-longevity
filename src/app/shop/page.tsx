import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ArrowDot, ClosingBand, HomeFAQ, HowItWorks } from '@/components/home/HomeSections';
import { LineupCard } from '@/components/lineup/Lineup';
import { getLiveProducts } from '@/lib/catalog';
import { LIST_DRAFTS, countLabel, listedCategories, listedItems } from '@/lib/lineup';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta(
  '/shop',
  'Shop',
  'Longevity, sexual health, hormones, hair and skin treatments, prescribed by a licensed physician and made to order by a licensed 503A pharmacy.',
);

/** Shop all: what's listed (see LIST_DRAFTS), one section per category (Hims-style), then how it works and the FAQ. */
export default async function PublicShopPage() {
  const categories = listedCategories((await getLiveProducts()).map((p) => p.id)).filter((c) => c.items.length);
  const total = listedItems(categories).length;
  return (
    <>
      <Header categoryStrip />
      <main className="bg-white">
        <section className="px-5 pb-16 pt-44 md:px-10 md:pb-24 md:pt-52">
          <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink md:text-[80px]">Shop all</h1>
              <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-ink-soft">
                Made to order by a licensed 503A pharmacy, and prescribed only after a physician reviews your assessment.
              </p>
            </div>
            <p className="rounded-full bg-milk px-4 py-2 text-[13px] font-medium text-ink">
              {countLabel(total)} · Prescription required
            </p>
          </div>

          {/* Jump links to each category section. */}
          <nav aria-label="Categories" className="mb-12 flex flex-wrap gap-2 md:mb-16">
            {categories.map((c) => (
              <a key={c.slug} href={`#${c.slug}`} className="rounded-full bg-milk px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:bg-butter">
                {c.name} <span className="font-medium text-ink/60">{c.items.length}</span>
              </a>
            ))}
          </nav>

          <div className="flex flex-col gap-16 md:gap-24">
            {categories.map((c) => (
              <div key={c.slug} id={c.slug} className="scroll-mt-44">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
                  <div>
                    <h2 className="text-[34px] font-semibold leading-none tracking-[-0.05em] text-ink md:text-[48px]">{c.name}</h2>
                    <p className="mt-2 text-[15px] text-ink-soft">{c.line}</p>
                  </div>
                  <Link href={`/treatments/${c.slug}`} className="group flex items-center gap-2 rounded-full bg-milk py-1.5 pl-4 pr-1.5 text-[14px] font-semibold text-ink">
                    Shop {c.name.toLowerCase()}
                    <ArrowDot className="bg-butter ring-0" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
                  {c.items.map((item) => (
                    <LineupCard key={item.slug} item={item} tint={c.tint} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {!LIST_DRAFTS && <p className="mt-12 text-[15px] text-ink-soft md:mt-16">More treatments coming soon.</p>}
        </section>
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
