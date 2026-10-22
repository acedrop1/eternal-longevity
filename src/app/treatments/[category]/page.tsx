import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ArrowDot, ClosingBand, HomeFAQ, HowItWorks } from '@/components/home/HomeSections';
import { LineupCard } from '@/components/lineup/Lineup';
import { AudienceCount, AudienceFilter, AudienceShown } from '@/components/lineup/Audience';
import { getLiveProducts } from '@/lib/catalog';
import { CATEGORIES, audienceOf, getCategory, listedCategories } from '@/lib/lineup';
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
        <section className="px-5 pb-16 pt-36 md:px-10 md:pb-24 md:pt-52">
          <div className="mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-[36px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink md:text-[72px]">{c.name}</h1>
              <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-ink-soft md:mt-3 md:text-[17px]">{c.line}</p>
              {/* Only where the category has something for one audience only. */}
              {c.items.some((i) => audienceOf(i) !== 'all') && (
                <div className="mt-5">
                  <AudienceFilter />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Phones: the count drops so the products start on the first screen. */}
              <span className="hidden rounded-full bg-milk px-4 py-2 text-[13px] font-medium text-ink md:inline">
                <AudienceCount fors={c.items.map(audienceOf)} label /><span className="hidden md:inline"> · Nothing charged unless a physician approves</span>
              </span>
              <Link
                href={`/start?category=${c.slug}`}
                className="group flex min-h-[44px] items-center gap-2 rounded-full bg-butter py-1.5 pl-5 pr-1.5 text-[14px] font-semibold text-ink transition-transform hover:-translate-y-0.5 md:py-2 md:pr-2"
              >
                Start your assessment
                <ArrowDot className="bg-ink text-white ring-0" />
              </Link>
            </div>
          </div>


          {c.items.length ? (
            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
              {c.items.map((item) => (
                <AudienceShown key={item.slug} fors={[audienceOf(item)]}>
                  <LineupCard item={item} tint={c.tint} />
                </AudienceShown>
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

        <HowItWorks href={`/start?category=${c.slug}`} label="Start your assessment" />
        <HomeFAQ />
        <ClosingBand href={`/start?category=${c.slug}`} label="Start your assessment" />
      </main>
      <Footer />
    </>
  );
}
