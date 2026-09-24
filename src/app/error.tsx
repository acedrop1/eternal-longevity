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
    <main className="flex min-h-screen items-center bg-white px-5 py-24 text-black md:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <p className="font-mono text-[13px] text-black/55">500</p>
        <h1
          className="mt-4 max-w-4xl font-display font-normal [text-wrap:balance]"
          style={{ fontSize: 'clamp(3rem, 6vw + 1rem, 7rem)', fontStretch: '75%', lineHeight: 0.95 }}
        >
          We hit a snag.
        </h1>
        <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-black/70">
          Try again, or if it keeps happening,{' '}
          <Link href="/contact" className="text-black underline decoration-black/40 underline-offset-[3px] hover:decoration-black">
            drop us a note
          </Link>{' '}
          and we&apos;ll sort it out.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-black px-5 py-3 font-mono text-[14px] text-white transition-colors hover:bg-black/85"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full bg-[#F2F2F0] px-5 py-3 font-mono text-[14px] text-black transition-colors hover:bg-black/10"
          >
            Back to home
          </Link>
          <Link
            href="/shop"
            className="rounded-full px-5 py-3 font-mono text-[14px] text-black/60 transition-colors hover:text-black"
          >
            Shop all
          </Link>
        </div>

        {error?.digest && (
          <p className="mt-10 font-mono text-[13px] text-black/40">Error ID: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
