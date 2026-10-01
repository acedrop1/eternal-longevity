import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FAQBrowser } from '@/components/faq/FAQBrowser';
import { ArrowDot, Aura, GLASS, Swipe } from '@/components/home/HomeSections';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Questions, Answered',
  description:
    'How Eternal Longevity works. Eligibility, treatments, pricing, and safety questions answered.',
};

const QUICK_LINKS = [
  {
    title: 'How it works',
    body:
      'A short intake, a physician’s decision, then the pharmacy prepares and ships your order, tracked.',
    href: '/shop',
    cta: 'Browse the shop',
  },
  {
    title: 'Start your assessment',
    body:
      'A physician usually reviews your intake within 1 business day. After approval, the pharmacy typically prepares and ships within a few business days.',
    href: '/start',
    cta: 'Begin now',
  },
  {
    title: 'Talk to our team',
    body:
      'Anything not answered below? Our team replies within one business day.',
    href: '/contact',
    cta: 'Send a message',
  },
];

const H2 = 'text-[36px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]';

export default function FAQPage() {
  return (
    <>
      <Header categoryStrip />
      <main className="bg-white">
        {/* Questions */}
        <section className="relative overflow-hidden px-5 pb-16 pt-44 md:px-10 md:pb-24 md:pt-52">
          <Aura mix="dusk" className="opacity-60" />
          <div className="relative">
            <FAQBrowser>
              <h1 className="text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[80px]">
                Questions, <Swipe>answered.</Swipe>
              </h1>
              <p className="mt-5 max-w-[440px] text-[16px] leading-relaxed text-ink-soft">
                The most common things members ask before, during, and after treatment. If your question isn&apos;t
                here, send us a note. We answer everything that comes in.
              </p>
            </FAQBrowser>
          </div>
        </section>

        {/* Next steps */}
        <section className="px-3 md:px-5">
          <div className="relative overflow-hidden rounded-shell bg-milk px-5 py-16 md:px-10 md:py-24">
            <Aura mix="sunrise" />
            <div className="relative">
              <h2 className={cn(H2, 'mb-10 md:mb-14')}>Three doors forward.</h2>
              <ul className="grid gap-3 md:grid-cols-3 md:gap-5">
                {QUICK_LINKS.map((q) => (
                  <li key={q.title} className={cn('flex flex-col rounded-inner p-6 md:p-8', GLASS)}>
                    <p className="text-[22px] font-semibold tracking-[-0.03em] text-ink md:text-[26px]">{q.title}</p>
                    <p className="mt-2 max-w-sm flex-1 text-[15px] leading-relaxed text-ink-soft">{q.body}</p>
                    <Link
                      href={q.href}
                      className="group mt-6 flex w-fit items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 text-[14px] font-medium text-ink"
                    >
                      {q.cta}
                      <ArrowDot className="h-7 w-7 bg-milk ring-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Start */}
        <section className="px-5 py-16 md:px-10 md:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
            <div>
              <h2 className={H2}>The shortest path is to start the assessment.</h2>
              <p className="mt-5 max-w-[440px] text-[16px] leading-relaxed text-ink-soft">
                Three minutes. Answer a few questions and a licensed physician decides whether to prescribe.
              </p>
              <Link
                href="/start"
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-butter py-2 pl-6 pr-2 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Start your assessment
                <ArrowDot className="bg-ink text-white ring-0" />
              </Link>
            </div>

            <figure>
              <div className="relative aspect-[4/3] overflow-hidden rounded-shell bg-milk">
                <Image
                  src="/brand/vial-nad.jpg"
                  alt="NAD+ vial"
                  fill
                  sizes="(max-width: 1024px) 100vw, 44rem"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-4 max-w-[440px] text-[14px] leading-relaxed text-ink-soft">
                Compounded for you by a licensed pharmacy, and shipped to your door.
              </figcaption>
            </figure>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
