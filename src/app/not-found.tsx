import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';

export const metadata = {
  title: 'Page not found',
  description: 'The page you are looking for does not exist.',
};

/**
 * Branded 404. Replaces the unstyled Next.js default with a centered hero
 * pattern that matches the rest of the site (dark + gold accent).
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="relative min-h-screen bg-background overflow-hidden">
        {/* Soft halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/4 left-1/2 h-[60vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[120px]"
        />

        <section className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center pt-28 pb-16">
          <p className="mb-6 text-[11px] tracking-widest text-accent">
            404 / PAGE NOT FOUND
          </p>
          <h1
            className="mb-6 font-semibold tracking-tight text-foreground"
            style={{
              fontSize: 'clamp(3rem, 9vw, 6.5rem)',
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
            }}
          >
            This page
            <br />
            <span className="text-foreground/40">went missing.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-md text-foreground/65 leading-relaxed">
            The link may be broken, the page may have moved, or it never
            existed. Try one of the routes below.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/"
              className="pill bg-accent text-black font-semibold px-7 py-3 hover:bg-accent-soft transition-colors"
            >
              Back to home
            </Link>
            <Link
              href="/protocols"
              className="pill glass text-foreground/85 hover:text-foreground px-7 py-3"
            >
              See the protocols
            </Link>
            <Link
              href="/contact"
              className="pill text-foreground/55 hover:text-foreground transition-colors px-5 py-3"
            >
              Contact support
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
