import { Shimmer } from '@/components/skeletons/Shimmer';

export default function LoginLoading() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-10 w-auto opacity-80" />
        </div>
        {/* Headline */}
        <Shimmer className="mx-auto mb-2 h-8 w-2/3" />
        <Shimmer className="mx-auto mb-10 h-4 w-1/2" />
        {/* Form */}
        <div className="space-y-4">
          <Shimmer className="h-12 w-full rounded-2xl" />
          <Shimmer className="h-12 w-full rounded-2xl" />
          <Shimmer className="h-14 w-full rounded-full" />
        </div>
        {/* Footer links */}
        <div className="mt-8 flex justify-center gap-4">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-4 w-20" />
        </div>
      </div>
    </main>
  );
}
