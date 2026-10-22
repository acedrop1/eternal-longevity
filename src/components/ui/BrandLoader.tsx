import { Wordmark } from '@/components/nav/Wordmark';

/**
 * The portal's loading screen: the butter wordmark centred on white with a
 * spinner under it. Shown by every portal loading.tsx while the server builds
 * the page.
 */
export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[100dvh] place-items-center bg-white px-6">
      <div className="flex flex-col items-center gap-6">
        <Wordmark href={null} className="text-[44px] text-[#F2D060] md:text-[52px]" />
        <span
          aria-hidden
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-butter/35 border-t-butter-deep motion-reduce:animate-none"
        />
        <span className="sr-only">{label}…</span>
      </div>
    </div>
  );
}
