import { Shimmer } from '@/components/skeletons/Shimmer';

/** Same shape as AuthShell: form column, black brand panel on desktop. */
export default function LoginLoading() {
  const bar = 'bg-black/[0.07]';
  return (
    <main className="min-h-screen bg-white px-5 pb-16 pt-[112px] text-black md:px-8 md:pt-[136px]">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="mx-auto w-full max-w-md lg:mx-0 lg:py-8">
          <Shimmer className={`mb-4 h-4 w-28 rounded-[2px] ${bar}`} />
          <Shimmer className={`mb-10 h-12 w-2/3 rounded-[2px] ${bar}`} />
          <div className="space-y-6">
            <Shimmer className={`h-12 w-full rounded-[2px] ${bar}`} />
            <Shimmer className={`h-12 w-full rounded-[2px] ${bar}`} />
            <Shimmer className={`h-[50px] w-full rounded-full ${bar}`} />
          </div>
        </div>
        <div className="hidden min-h-[560px] rounded-[4px] bg-black p-10 lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-9 w-auto opacity-80" />
        </div>
      </div>
    </main>
  );
}
