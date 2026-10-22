import type { Metadata } from 'next';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ArrowDot, ClosingBand, HomeFAQ, HowItWorks } from '@/components/home/HomeSections';
import { LineupCard } from '@/components/lineup/Lineup';
import { AudienceCount, AudienceFilter, AudienceLink, AudienceShown } from '@/components/lineup/Audience';
import { getLiveProducts } from '@/lib/catalog';
import { LIST_DRAFTS, audienceOf, countLabel, listedCategories, listedItems } from '@/lib/lineup';
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
        {/* Phones: a short intro so the first products show on the first screen; the header strip already lists the categories. */}
        <section className="px-5 pb-16 pt-36 md:px-10 md:pb-24 md:pt-52">
          <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[36px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink md:text-[80px]">Shop all</h1>
              <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-ink-soft md:mt-4 md:text-[16px]">
                Made to order by a licensed 503A pharmacy, and prescribed only after a physician reviews your assessment.
              </p>
              <div className="mt-5">
                <AudienceFilter />
              </div>
            </div>
            <p className="hidden rounded-full bg-milk px-4 py-2 text-[13px] font-medium text-ink md:block">
              {countLabel(total)} · Prescription required
            </p>
          </div>

          {/* Jump links to each category section. */}
          <nav aria-label="Categories" className="mb-16 hidden flex-wrap gap-2 md:flex">
            {categories.map((c) => (
              <AudienceShown key={c.slug} fors={c.items.map(audienceOf)}>
                <a href={`#${c.slug}`} className="rounded-full bg-milk px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:bg-butter">
                  {c.name} <span className="font-medium text-ink/60"><AudienceCount fors={c.items.map(audienceOf)} /></span>
                </a>
              </AudienceShown>
            ))}
          </nav>

          <div className="flex flex-col gap-12 md:gap-24">
            {categories.map((c) => (
              <AudienceShown key={c.slug} fors={c.items.map(audienceOf)}>
              <div id={c.slug} className="scroll-mt-44">
                <div className="mb-4 flex items-end justify-between gap-4 md:mb-8">
                  <div>
                    <h2 className="text-[28px] font-semibold leading-none tracking-[-0.05em] text-ink md:text-[48px]">{c.name}</h2>
                    <p className="mt-2 text-[14px] text-ink-soft md:text-[15px]">{c.line}</p>
                  </div>
                  {/* Phones: a plain "See all" beside the title; desktop: the pill. */}
                  <AudienceLink href={`/treatments/${c.slug}`} className="flex min-h-[44px] shrink-0 items-center text-[15px] font-semibold text-ink underline decoration-ink/30 underline-offset-4 md:hidden">
                    See all
                  </AudienceLink>
                  <AudienceLink href={`/treatments/${c.slug}`} className="group hidden items-center gap-2 rounded-full bg-milk py-1.5 pl-4 pr-1.5 text-[14px] font-semibold text-ink md:flex">
                    Shop {c.name.toLowerCase()}
                    <ArrowDot className="bg-butter ring-0" />
                  </AudienceLink>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
                  {c.items.map((item) => (
                    <AudienceShown key={item.slug} fors={[audienceOf(item)]}>
                      <LineupCard item={item} tint={c.tint} />
                    </AudienceShown>
                  ))}
                </div>
              </div>
              </AudienceShown>
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
