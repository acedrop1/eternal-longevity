'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Branded server / runtime error boundary. Lets the user retry or get back to
 * safety. No Header/Footer here: they may be what threw.
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
    <main className="flex min-h-screen items-center bg-white px-5 py-24 text-ink md:px-10">
      <div className="w-full">
        <p className="inline-flex items-center gap-2 rounded-full bg-milk px-3.5 py-1.5 text-[13px] font-medium text-ink">
          <span aria-hidden className="h-2 w-2 rounded-full bg-butter-deep" />
          500
        </p>
        <h1 className="mt-5 max-w-4xl text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[80px]">
          We hit a snag.
        </h1>
        <p className="mt-6 max-w-[560px] text-[16px] leading-relaxed text-ink-soft">
          Try again, or if it keeps happening,{' '}
          <Link href="/contact" className="text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink">
            drop us a note
          </Link>{' '}
          and we&apos;ll sort it out.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-butter px-6 py-3 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full bg-milk px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-milk-deep"
          >
            Back to home
          </Link>
          <Link
            href="/shop"
            className="rounded-full px-5 py-3 text-[14px] font-semibold text-ink/60 transition-colors hover:text-ink"
          >
            Shop all
          </Link>
        </div>

        {error?.digest && (
          <p className="mt-10 text-[13px] text-ink/55">Error ID: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
