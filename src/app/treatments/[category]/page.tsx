import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ArrowDot, ClosingBand, HomeFAQ, HowItWorks } from '@/components/home/HomeSections';
import { LineupCard } from '@/components/lineup/Lineup';
import { getLiveProducts } from '@/lib/catalog';
import { CATEGORIES, countLabel, getCategory, listedCategories } from '@/lib/lineup';
import { pageMeta } from '@/lib/seo';

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCategory((await params).category);
  return c ? pageMeta(`/treatments/${c.slug}`, c.name, `${c.line} Prescribed by a licensed physician, made to order by a 503A pharmacy.`) : {};
}

/** One category: a compact title band (the header strip switches category), then every listed treatment in it. */
export default async function CategoryPage({ params }: Props) {
  const slug = (await params).category;
  if (!getCategory(slug)) notFound();
  const c = listedCategories((await getLiveProducts()).map((p) => p.id)).find((x) => x.slug === slug)!;

  return (
    <>
      <Header categoryStrip />
      <main className="bg-white">
        {/* Compact header, no full-screen photo: the products are the point, so they start in the first screen. */}
        <section className="px-5 pb-16 pt-44 md:px-10 md:pb-24 md:pt-52">
          <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink md:text-[72px]">{c.name}</h1>
              <p className="mt-3 max-w-[520px] text-[16px] leading-relaxed text-ink-soft md:text-[17px]">{c.line}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-milk px-4 py-2 text-[13px] font-medium text-ink">
                {countLabel(c.items.length)}<span className="hidden md:inline"> · Nothing charged unless a physician approves</span>
              </span>
              <Link
                href="/start"
                className="group flex items-center gap-2 rounded-full bg-butter py-2 pl-5 pr-2 text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Start your assessment
                <ArrowDot className="bg-ink text-white ring-0" />
              </Link>
            </div>
          </div>


          {c.items.length ? (
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
              {c.items.map((item) => (
                <LineupCard key={item.slug} item={item} tint={c.tint} />
              ))}
            </div>
          ) : (
            <div className="rounded-shell bg-milk p-6 md:p-10">
              <p className="text-[24px] font-semibold leading-tight tracking-[-0.04em] text-ink md:text-[32px]">More treatments coming soon.</p>
              <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-ink-soft">
                Start an assessment and our physician can talk through what&apos;s available for you today.
              </p>
            </div>
          )}

          {c.slug === 'hair' && (
            <div className="mt-10 flex flex-col gap-3 rounded-shell bg-milk p-6 md:mt-14 md:flex-row md:items-center md:justify-between md:p-10">
              <p className="text-[24px] font-semibold leading-tight tracking-[-0.04em] text-ink md:text-[32px]">
                Part of the Eternal family, with Eternal Hair.
              </p>
              <p className="max-w-[420px] text-[15px] leading-relaxed text-ink-soft">
                Eternal Hair, our med spa, offers in-clinic care. Treatments here are prescribed online by our physician and shipped to you.
              </p>
            </div>
          )}
        </section>

        <HowItWorks />
        <HomeFAQ />
        <ClosingBand />
      </main>
      <Footer />
    </>
  );
}
