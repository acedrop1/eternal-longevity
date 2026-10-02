'use client';

import { startTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wordmark } from '@/components/nav/Wordmark';
import { btnCta, btnSecondary, panel } from '@/components/portal/ui';

/** Same frosted bar as PortalShell. */
const GLASS_BAR =
  'rounded-inner bg-white/70 text-ink shadow-[0_10px_40px_-16px_rgba(17,17,17,0.22)] ring-1 ring-white/70 backdrop-blur-2xl backdrop-saturate-150';

/**
 * A portal page that threw. Without this the root boundary takes over the
 * whole screen with the public site's 500, which reads as "the portal is
 * gone". Kept inside the portal's look, with a way to retry, a way home and a
 * person to ask. PortalShell is not used: it is a server component, and it
 * may be what failed.
 */
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  // reset() alone only re-renders the client; a server page needs refetching.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  // Log the error so it shows up in Vercel runtime logs.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Caught by app/portal/error.tsx:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-40 px-3 pt-3 md:px-5">
        <div className={GLASS_BAR}>
          <div className="flex h-14 items-center gap-2.5 px-3 md:px-4">
            <Link href="/portal" className="flex min-h-[44px] items-center gap-2.5 rounded-full px-1 transition-opacity hover:opacity-80">
              <Wordmark href={null} className="text-[26px] text-[#F2D060] md:text-[30px]" />
              <span className="hidden text-[13px] font-medium text-ink/65 sm:inline">Portal</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-5 py-12 md:px-10 md:py-16">
        <div className={`${panel} max-w-2xl px-6 py-10 md:px-10`}>
          <h1 className="text-[32px] font-semibold leading-[1] tracking-[-0.04em] [text-wrap:balance] md:text-[44px]">
            This page didn&apos;t load.
          </h1>
          <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-soft">
            Something went wrong on our side. Try again, or message us if it keeps
            happening.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={retry} className={btnCta}>
              Try again
            </button>
            <Link href="/portal" className={btnSecondary}>
              Back to dashboard
            </Link>
            <Link href="/portal/messages" className={btnSecondary}>
              Message us
            </Link>
          </div>
          {error?.digest && <p className="mt-8 text-[13px] text-ink/55">Error ID: {error.digest}</p>}
        </div>
      </main>
    </div>
  );
}
