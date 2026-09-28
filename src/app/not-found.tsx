import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ArrowDot, Aura } from '@/components/home/HomeSections';

export const metadata = {
  title: 'Page not found',
  description: 'The page you are looking for does not exist.',
};

/** Branded 404: quiet, centred, two ways out. */
export default function NotFound() {
  return (
    <>
      <Header categoryStrip />
      <main className="bg-white">
        <section className="relative overflow-hidden px-5 pb-24 pt-44 md:px-10 md:pb-32 md:pt-52">
          <Aura mix="sunrise" className="opacity-70" />
          <div className="relative mx-auto flex max-w-[720px] flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-milk px-3.5 py-1.5 text-[13px] font-medium text-ink">
              <span aria-hidden className="h-2 w-2 rounded-full bg-butter-deep" />
              404
            </span>
            <h1 className="mt-6 text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[80px]">
              This page went missing.
            </h1>
            <p className="mt-5 max-w-[440px] text-[16px] leading-relaxed text-ink-soft">
              The link may be broken, the page may have moved, or it never existed.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="group flex items-center gap-2 rounded-full bg-butter py-2 pl-6 pr-2 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
              >
                Back to home
                <ArrowDot className="bg-ink text-white ring-0" />
              </Link>
              <Link href="/shop" className="rounded-full bg-milk px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-milk-deep">
                Shop all
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
