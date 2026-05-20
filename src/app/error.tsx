'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Branded server / runtime error boundary. Replaces the unstyled Next.js
 * default red overlay with a calm, on-brand page that lets the user retry
 * or get back to safety.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the error so it shows up in Vercel runtime logs.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Caught by app/error.tsx:', error);
  }, [error]);

  return (
    <main className="relative min-h-screen bg-background overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/4 left-1/2 h-[60vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[120px]"
      />

      <section className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center pt-20 pb-16">
        <p className="mb-6 text-[11px] tracking-widest text-accent">
          500 / SOMETHING WENT WRONG
        </p>
        <h1
          className="mb-6 font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 5.5rem)',
            letterSpacing: '-0.03em',
            lineHeight: 0.98,
          }}
        >
          We hit a snag.
        </h1>
        <p className="mx-auto mb-10 max-w-md text-foreground/65 leading-relaxed">
          Our team has been notified. Try again, or if it keeps happening,
          drop us a note and we&apos;ll sort it out.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="pill bg-accent text-black font-semibold px-7 py-3 hover:bg-accent-soft transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="pill glass text-foreground/85 hover:text-foreground px-7 py-3"
          >
            Back to home
          </Link>
          <Link
            href="/contact"
            className="pill text-foreground/55 hover:text-foreground transition-colors px-5 py-3"
          >
            Contact support
          </Link>
        </div>

        {error?.digest && (
          <p className="mt-10 text-[11px] tracking-wider text-foreground/35">
            Error ID: {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
