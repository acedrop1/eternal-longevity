import Image from 'next/image';
import Link from 'next/link';
import { Check, ClipboardList, MessageCircle, Package, Stethoscope } from 'lucide-react';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { Aura, Swipe } from '@/components/home/HomeSections';
import { notFound } from 'next/navigation';
import { LandingQuiz, QuizStickyBar } from '@/components/landing/LandingQuiz';
import { LANDINGS, getLanding, startHref } from '@/lib/landings';
import { getLandingStatus } from '@/lib/landing-status';
import { getSession } from '@/lib/auth-server';
import { FadeIn } from '@/components/ui/FadeIn';
import { getLiveProducts } from '@/lib/catalog';
import { fromPrice } from '@/lib/lineup';
import { cn } from '@/lib/utils';
import { pageMeta } from '@/lib/seo';
import { SERVICE_AREA_SHORT } from '@/lib/site';

/*
 * Landing pages built from the /hair template (lib/landings): same layout as
 * /hair (hero with the quiz, treatment options, what every plan includes,
 * how it works), each page's copy and products from its entry. /hair itself
 * is app/hair and is untouched. Unpublished pages are visible to admins only
 * (Admin → Landing pages), and never indexed.
 */

// Only the pages in lib/landings; any other top-level path is a 404 as before.
export const dynamicParams = false;
export const generateStaticParams = () => LANDINGS.map((l) => ({ landing: l.slug }));
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ landing: string }> };

/** The page, if this visitor may see it: published, or an admin previewing a draft. */
async function visible(slug: string) {
  const l = getLanding(slug);
  if (!l) return null;
  const published = (await getLandingStatus())[l.slug] === true;
  if (!published && (await getSession())?.role !== 'admin') return null;
  return { l, published };
}

export async function generateMetadata({ params }: Props) {
  // The check runs here too: metadata streams first, so a 404 decided only in the page would go out as 200.
  const v = await visible((await params).landing);
  if (!v) notFound();
  return { ...pageMeta(`/${v.l.slug}`, v.l.seo.title, v.l.seo.description), ...(v.published ? {} : { robots: { index: false, follow: false } }) };
}

const INCLUDED = [
  'A licensed physician reviews your answers',
  'Made to order by a licensed pharmacy',
  'Message your physician any time',
  'Nothing is charged unless you’re approved',
  'Pause or cancel before your next billing date',
];

const SIMPLE = [
  { icon: ClipboardList, title: 'Free online assessment', body: 'A few minutes, from your phone.' },
  { icon: Stethoscope, title: 'Reviewed by a physician', body: 'Dr. Bader Elder, DO decides every prescription.' },
  { icon: Package, title: 'Shipped to your door', body: 'Made to order and tracked to you.' },
  { icon: MessageCircle, title: 'Ongoing support', body: 'Questions go straight to your physician.' },
];

export default async function LandingPage({ params }: Props) {
  // Unpublished: admins only (to preview before publishing).
  const v = await visible((await params).landing);
  if (!v) notFound();
  const { l } = v;
  const CTA = startHref(l);
  const live = await getLiveProducts();
  const byId = new Map(live.map((p) => [p.id, p]));
  const hero = byId.get(l.heroProduct);

  // One card per option: its first live product's photo, and the cheapest "from $X/mo". No live product, no card.
  const formats = l.options.flatMap((o) => {
    const products = o.products.map((id) => byId.get(id)).filter((p) => p !== undefined);
    if (!products.length) return [];
    const href = products.length === 1 ? `/start?product=${encodeURIComponent(products[0].id)}` : CTA;
    return [{ title: o.title, body: o.body, image: products[0].image, price: Math.min(...products.map(fromPrice)), href }];
  });

  return (
    <>
      <Header />
      <main className="bg-white">
        {/* Hero, as on Hims: the promise and the photo on one side, the quiz on the other. */}
        <section className="px-3 pt-24 md:px-5 md:pt-28">
          <div className="mx-auto grid max-w-[1400px] gap-3 md:grid-cols-2 md:gap-5">
            <div className="anim-hero relative overflow-hidden rounded-shell bg-milk px-5 pb-5 pt-6 md:px-10 md:pb-10 md:pt-12">
              <Aura mix="sunrise" />
              <div className="relative">
                <p className="text-[13px] font-medium text-ink-soft">Prescribed by a licensed physician · {SERVICE_AREA_SHORT}</p>
                <h1 className="mt-3 text-[34px] font-semibold leading-[1.02] tracking-[-0.05em] text-ink md:text-[48px] lg:text-[60px]">
                  {l.headline.lead}{' '}
                  {/* The /hair swipe can't wrap; these phrases are longer, so the highlight wraps line by line. */}
                  <span className="bg-[linear-gradient(transparent_52%,#FFEC9F_52%,#FFEC9F_94%,transparent_94%)] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
                    {l.headline.swipe}
                  </span>
                  {l.headline.footnote && <sup className="ml-0.5 align-super text-[0.35em] font-medium">1</sup>}
                </h1>
                <p className="mt-3 max-w-[440px] text-[15px] leading-relaxed text-ink-soft md:text-[17px]">{l.subline}</p>
                {hero?.image && (
                  <div className="relative mx-auto mt-5 aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-inner bg-milk-deep md:mt-8 md:max-w-[440px]">
                    <Image src={hero.image} alt={hero.name} fill priority sizes="(max-width: 768px) 280px, 440px" className="object-contain" />
                  </div>
                )}
              </div>
            </div>
            <div className="anim-hero flex flex-col items-center justify-center gap-4 px-1 py-2 [animation-delay:150ms] md:px-6">
              <LandingQuiz questions={l.quiz} href={CTA} />
              {/* Small print, as on Hims: the compounded notice and required disclaimers. */}
              <div className="max-w-[480px] space-y-2 text-center text-[12px] leading-relaxed text-ink-soft">
                {l.smallPrint.map((t) => (
                  <p key={t}>{t}</p>
                ))}
                {l.headline.footnote && <p>1. {l.headline.footnote}</p>}
              </div>
            </div>
          </div>
        </section>

        {/* The two formats, priced from the live catalogue. */}
        {formats.length > 0 && (
          <FadeIn as="section" className="mx-auto max-w-4xl px-5 pt-20 md:px-10 md:pt-28">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-[30px] font-semibold leading-none tracking-[-0.045em] text-ink md:text-[40px]">Treatment options</h2>
              <p className="max-w-[340px] text-[15px] text-ink-soft">Pick what fits your routine. Your physician confirms what&apos;s right for you.</p>
            </div>
            <div className={cn('grid gap-3 md:gap-5', formats.length > 1 ? 'grid-cols-2' : 'max-w-sm grid-cols-1')}>
              {formats.map((f) => (
                <Link key={f.title} href={f.href} className="group flex flex-col overflow-hidden rounded-shell bg-milk transition-transform hover:-translate-y-0.5">
                  <div className="relative aspect-[4/5]">
                    <Image src={f.image} alt={f.title} fill sizes="(max-width: 768px) 50vw, 420px" className="object-contain" />
                  </div>
                  <div className="p-4 md:p-6">
                    <p className="text-[18px] font-semibold tracking-[-0.02em] text-ink md:text-[22px]">{f.title}</p>
                    <p className="mt-1 hidden text-[14px] text-ink-soft md:block">{f.body}</p>
                    <p className="mt-2 text-[14px] text-ink">
                      from <span className="font-semibold">${f.price}</span>/mo
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </FadeIn>
        )}

        {/* What every plan includes (Hims: "Choose our chews and get"). */}
        <FadeIn as="section" className="mx-auto max-w-xl px-5 pt-20 md:pt-28">
          <h2 className="text-center text-[30px] font-semibold leading-none tracking-[-0.045em] text-ink md:text-[40px]">Every plan includes</h2>
          <ul className="mt-8 divide-y divide-ink/10 rounded-shell bg-milk px-5">
            {INCLUDED.map((x) => (
              <li key={x} className="flex items-center justify-between gap-4 py-4 text-[15px] text-ink">
                {x}
                <Check className="h-4 w-4 flex-none text-ink" strokeWidth={2.5} aria-hidden />
              </li>
            ))}
          </ul>
          <div className="mt-8 flex justify-center">
            <Link href={CTA} className="inline-flex min-h-[48px] items-center rounded-full bg-ink px-7 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5">
              Get started
            </Link>
          </div>
        </FadeIn>

        {/* How it works, in one row (Hims: "Hims makes it simple"). */}
        <FadeIn as="section" className="mx-auto max-w-5xl px-5 pb-20 pt-20 md:px-10 md:pb-28 md:pt-28">
          <h2 className="text-[30px] font-semibold leading-none tracking-[-0.045em] text-ink md:text-[40px]">
            Simple from <Swipe>start to finish.</Swipe>
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
            {SIMPLE.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-butter text-ink">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
                </span>
                <p className="mt-3 text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
                <p className="mt-1 text-[14px] leading-snug text-ink-soft">{body}</p>
              </li>
            ))}
          </ul>
        </FadeIn>

        <QuizStickyBar label={l.stickyLabel} />
      </main>
      <Footer />
    </>
  );
}
