import { Shimmer } from '@/components/skeletons/Shimmer';

/** Same shape as AuthShell: form column, brand photo panel on desktop. */
export default function LoginLoading() {
  const bar = 'bg-ink/[0.06]';
  return (
    <main className="min-h-screen bg-white px-5 pb-16 pt-[112px] text-ink md:px-8 md:pt-[136px]">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="mx-auto w-full max-w-md lg:mx-0 lg:py-8">
          <Shimmer className={`mb-4 h-4 w-28 rounded-thumb ${bar}`} />
          <Shimmer className={`mb-10 h-12 w-2/3 rounded-thumb ${bar}`} />
          <div className="space-y-6">
            <Shimmer className={`h-12 w-full rounded-thumb ${bar}`} />
            <Shimmer className={`h-12 w-full rounded-thumb ${bar}`} />
            <Shimmer className={`h-[50px] w-full rounded-full ${bar}`} />
          </div>
        </div>
        <div className="hidden min-h-[560px] rounded-shell bg-milk lg:block" />
      </div>
    </main>
  );
}
