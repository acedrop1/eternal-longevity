import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { SITE_LOCKED } from '@/lib/site-lock';
import { Wordmark } from '@/components/nav/Wordmark';
import { SERVICE_AREA_SHORT } from '@/lib/site';
import { TeamAccess, WaitlistForm } from './ComingSoonForms';

export const metadata: Metadata = {
  title: 'Opening soon',
  description: 'Physician-prescribed longevity, sexual health, hormones, hair and skin. Opening soon.',
  robots: { index: false, follow: false },
};

/** Pre-launch page: the only public page while the site is locked (see lib/site-lock.ts). */
export default function ComingSoonPage() {
  // Only reachable while the pre-launch lock is on; after launch it's a dead end.
  if (!SITE_LOCKED) redirect('/');
  return (
    <main className="bg-white p-3 md:p-5">
      <div className="relative h-[calc(100svh-24px)] min-h-[600px] overflow-hidden rounded-shell bg-milk md:h-[calc(100svh-40px)]">
        <Image src="/brand/hero-home-mobile.jpg" alt="" fill priority sizes="100vw" className="object-cover object-[52%_100%] md:hidden" />
        <Image src="/brand/hero-home.jpg" alt="" fill priority sizes="100vw" className="hidden object-cover md:block" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/55 md:bg-gradient-to-r md:from-black/60 md:via-black/25 md:to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-between p-6 text-white md:p-12">
          <Wordmark className="text-[34px] md:text-[40px]" />
          <div className="flex max-w-[640px] flex-col gap-6">
            <p className="text-[13px] font-medium text-white/85">Licensed physician · {SERVICE_AREA_SHORT}</p>
            <h1 className="text-[52px] font-semibold leading-[0.95] tracking-[-0.05em] md:text-[88px]">Opening soon.</h1>
            <p className="max-w-[460px] text-[17px] leading-relaxed text-white/90">
              Longevity, sexual health, hormones, hair and skin, prescribed by a licensed physician. Leave your email and we&apos;ll tell you the moment we open.
            </p>
            <WaitlistForm />
            <TeamAccess />
          </div>
        </div>
      </div>
    </main>
  );
}
