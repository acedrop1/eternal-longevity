import { Wordmark } from '@/components/nav/Wordmark';
import { LoadingDots } from '@/components/ui/LoadingDots';

/**
 * Any page still on its way (routes with their own loading.tsx use that
 * instead): the logo and three breathing dots, faded in after a beat so a
 * quick load never flashes it.
 */
export default function Loading() {
  return (
    <main aria-busy="true" className="anim-loading grid min-h-[100svh] place-items-center bg-white">
      <div className="flex flex-col items-center gap-5">
        <Wordmark href={null} className="text-[34px] text-ink" />
        <LoadingDots />
      </div>
    </main>
  );
}
