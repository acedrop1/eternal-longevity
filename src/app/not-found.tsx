import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';

export const metadata = {
  title: 'Page not found',
  description: 'The page you are looking for does not exist.',
};

/** Branded 404, in the site's white editorial style. */
export default function NotFound() {
  return (
    <>
      <Header categoryStrip />
      <main>
        {/* Top padding clears the fixed header + product strip (126 / 134px). */}
        <section className="bg-white px-5 pb-24 pt-[158px] text-black md:px-8 md:pb-32 md:pt-[182px]">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[13px] text-black/55">404</p>
            <h1
              className="mt-4 max-w-4xl font-display font-normal [text-wrap:balance]"
              style={{ fontSize: 'clamp(3rem, 6vw + 1rem, 7rem)', fontStretch: '75%', lineHeight: 0.95 }}
            >
              This page went missing.
            </h1>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-black/70">
              The link may be broken, the page may have moved, or it never existed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full bg-black px-5 py-3 font-mono text-[14px] text-white transition-colors hover:bg-black/85"
              >
                Back to home
              </Link>
              <Link
                href="/shop"
                className="rounded-full bg-[#F2F2F0] px-5 py-3 font-mono text-[14px] text-black transition-colors hover:bg-black/10"
              >
                Shop all
              </Link>
            </div>
          </div>
        </section>
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}
