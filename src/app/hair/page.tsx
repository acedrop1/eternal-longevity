import Image from 'next/image';
import Link from 'next/link';
import { Check, ClipboardList, MessageCircle, Package, Stethoscope } from 'lucide-react';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { Aura, Swipe } from '@/components/home/HomeSections';
import { HairQuiz, QuizStickyBar } from '@/components/hair/HairQuiz';
import { FadeIn } from '@/components/ui/FadeIn';
import { getLiveProducts } from '@/lib/catalog';
import { fromPrice, listedCategories, type Form } from '@/lib/lineup';
import { pageMeta } from '@/lib/seo';
import { SERVICE_AREA_SHORT } from '@/lib/site';

/*
 * /hair: the ad landing page for hair, laid out like Hims' hair page and kept
 * as short: hero with the quiz, the two formats, what every plan includes,
 * how it works, footer. Prices come from the live catalogue. Wording stays
 * inside the claims Dr. Elder has signed off on: no outcome promises, no
 * reviews or before/afters until we have real patients' results.
 */

export const metadata = pageMeta(
  '/hair',
  'Hair loss treatment, prescribed online',
  'Physician-prescribed treatment for thinning hair: a daily pill or a scalp foam, made to order by a licensed pharmacy and shipped to your door.',
);

const CTA = '/start?category=hair';
const PILL: Form[] = ['capsule', 'tablet'];

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

export default async function HairPage() {
  const live = await getLiveProducts();
  const byId = new Map(live.map((p) => [p.id, p]));
  const hair = listedCategories(byId.keys()).find((c) => c.slug === 'hair')!;

  // One card per format: its first live product's photo, and the cheapest "from $X/mo".
  const card = (title: string, body: string, forms: Form[], format: string) => {
    const products = hair.items.filter((i) => forms.includes(i.form)).map((i) => byId.get(i.live!)).filter((p) => p !== undefined);
    if (!products.length) return null;
    return { title, body, image: products[0].image, price: Math.min(...products.map(fromPrice)), href: `${CTA}&format=${format}` };
  };
  const formats = [
    card('Daily pill', 'Taken by mouth. Nothing to apply.', PILL, 'pill'),
    card('Scalp foam', 'Applied to the scalp. No pill to take.', ['foam'], 'foam'),
  ].filter((f) => f !== null);

  return (
    <>
      <Header />
      <main className="bg-white">
        {/* Hero, as on Hims: the promise and the photo on one side, the quiz on the other. */}
        <section className="px-3 pt-24 md:px-5 md:pt-28">
          <div className="mx-auto grid gap-3 md:grid-cols-2 md:gap-5">
            <div className="anim-hero relative overflow-hidden rounded-shell bg-milk px-5 pb-5 pt-6 md:px-10 md:pb-10 md:pt-12">
              <Aura mix="sunrise" />
              <div className="relative">
                <p className="text-[13px] font-medium text-ink-soft">Prescribed by a licensed physician · {SERVICE_AREA_SHORT}</p>
                {/* Sign-off sheet line 3 (pending Dr. Bader): Hims' "Thicker, fuller hair in 3-6 months" pattern. */}
                <h1 className="mt-3 text-[34px] font-semibold leading-[0.98] tracking-[-0.05em] text-ink md:text-[60px]">
                  Regrow hair in as{' '}
                  <span className="whitespace-nowrap">
                    few as <Swipe>3–6 months.</Swipe>
                    <sup className="ml-0.5 align-super text-[0.35em] font-medium">1</sup>
                  </span>
                </h1>
                <p className="mt-3 max-w-[440px] text-[15px] leading-relaxed text-ink-soft md:text-[17px]">
                  Finasteride and minoxidil, prescribed by a licensed physician. A daily pill or a scalp foam.
                </p>
                {/* A real patient's before/after (Hims-style). Shown only with the patient's written permission. */}
                <div className="mt-5 grid grid-cols-2 gap-2 md:mt-8 md:gap-3">
                  {[
                    { src: '/brand/hair-before.jpg', label: 'Before' },
                    { src: '/brand/hair-after.jpg', label: 'After' },
                  ].map((x) => (
                    <div key={x.label} className="relative aspect-[4/5] overflow-hidden rounded-inner bg-milk-deep">
                      <Image src={x.src} alt={`Top of a patient's head, ${x.label.toLowerCase()} treatment`} fill priority sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-3 py-1 text-[12px] font-semibold text-ink md:left-3 md:top-3 md:text-[13px]">
                        {x.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="anim-hero flex flex-col items-center justify-center gap-4 px-1 py-2 [animation-delay:150ms] md:px-6">
              <HairQuiz />
              {/* Small print, as on Hims: compounded notice, the claim's footnote, the before/after note (sheet lines 2, 3, 11). */}
              <div className="max-w-[480px] space-y-2 text-center text-[12px] leading-relaxed text-ink-soft">
                <p>
                  Our hair treatments are compounded drug products. The FDA does not approve or verify compounded drugs for safety, effectiveness or quality. Prescription required; a physician decides if treatment is right for you.
                </p>
                <p>1. Based on separate studies of oral and topical minoxidil and finasteride. Individual results may vary.</p>
                <p>Before and after images shared by a patient. Results have not been independently verified. Individual results may vary.</p>
              </div>
            </div>
          </div>
        </section>

        {/* The two formats, priced from the live catalogue. */}
        {formats.length > 0 && (
          <FadeIn as="section" className="mx-auto max-w-5xl px-5 pt-20 md:px-10 md:pt-28">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-[30px] font-semibold leading-none tracking-[-0.045em] text-ink md:text-[40px]">Treatment options</h2>
              <p className="max-w-[340px] text-[15px] text-ink-soft">Pick what fits your routine. Your physician confirms what&apos;s right for you.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-5">
              {formats.map((f) => (
                <Link key={f.title} href={f.href} className="group flex flex-col overflow-hidden rounded-shell bg-milk transition-transform hover:-translate-y-0.5">
                  <div className="relative aspect-[4/5]">
                    <Image src={f.image} alt={f.title} fill sizes="(max-width: 768px) 50vw, 400px" className="object-contain" />
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

        <QuizStickyBar />
      </main>
      <Footer />
    </>
  );
}
