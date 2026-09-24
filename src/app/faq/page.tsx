import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FAQBrowser } from '@/components/faq/FAQBrowser';

export const metadata: Metadata = {
  title: 'Questions, Answered',
  description:
    'How Eternal Longevity works. Eligibility, protocols, pricing, and safety questions answered.',
};

const QUICK_LINKS = [
  {
    title: 'How it works',
    body:
      'Three-minute profile, a matched protocol, compounded shipment. Three to five days end to end.',
    href: '/shop',
    cta: 'Browse the shop',
  },
  {
    title: 'Start your assessment',
    body:
      'Most members complete intake in under three minutes. You hear back within 48 hours.',
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

const H2 = { fontSize: 'clamp(2rem, 3vw + 1rem, 3.75rem)', fontStretch: '75%', lineHeight: 1 } as const;

export default function FAQPage() {
  return (
    <>
      <Header categoryStrip />
      <main>
        {/* Questions. Top padding clears the fixed header + product strip (126 / 134px). */}
        <section className="bg-white px-5 pb-16 pt-[158px] text-black md:px-8 md:pb-24 md:pt-[182px]">
          <FAQBrowser>
            <h1
              className="font-display font-normal [text-wrap:balance]"
              style={{ fontSize: 'clamp(2.4rem, 3.4vw + 1rem, 4.5rem)', fontStretch: '75%', lineHeight: 1 }}
            >
              Questions, answered.
            </h1>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-black/70">
              The most common things members ask before, during, and after a protocol. If your question isn&apos;t
              here, send us a note. We answer everything that comes in.
            </p>
          </FAQBrowser>
        </section>

        {/* Next steps */}
        <section className="bg-black px-5 py-16 text-white md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-10 font-display font-normal [text-wrap:balance] md:mb-14" style={H2}>
              Three doors forward.
            </h2>
            <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
              {QUICK_LINKS.map((q) => (
                <li key={q.title} className="flex flex-col border-t border-white/15 pt-5">
                  <p className="font-display text-[1.5rem] leading-tight" style={{ fontStretch: '75%' }}>
                    {q.title}
                  </p>
                  <p className="mt-2 max-w-sm flex-1 text-[15px] leading-relaxed text-white/70">{q.body}</p>
                  <Link
                    href={q.href}
                    className="mt-5 self-start font-mono text-[13px] underline decoration-white/50 underline-offset-[3px] transition-colors hover:decoration-white"
                  >
                    {q.cta}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Start */}
        <section className="bg-[#F2F2F0] px-5 py-16 text-black md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
            <div>
              <h2 className="font-display font-normal [text-wrap:balance]" style={H2}>
                The shortest path is to start the assessment.
              </h2>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-black/70">
                Three minutes. Answer a few questions and a licensed physician decides whether to prescribe.
              </p>
              <Link
                href="/start"
                className="mt-8 inline-block rounded-full bg-black px-4 py-2.5 font-mono text-[13px] text-white transition-colors hover:bg-black/85"
              >
                Start your assessment
              </Link>
            </div>

            <figure>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-neutral-300">
                <Image
                  src="/images/9.jpg"
                  alt="Lab moment"
                  fill
                  sizes="(max-width: 1024px) 100vw, 44rem"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-4 max-w-md text-[15px] leading-relaxed text-black/70">
                Every vial: compounded, tested, cold-shipped. Three steps you don&apos;t have to think about.
              </figcaption>
            </figure>
          </div>
        </section>
      </main>
      <div className="bg-[#F2F2F0]">
        <Footer />
      </div>
    </>
  );
}
