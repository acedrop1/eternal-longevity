import type { Metadata } from 'next';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { SubscribeForm } from '@/components/privacy/SubscribeForm';
import { smsMarketingEnabled } from '@/lib/marketing-consent';

export const metadata: Metadata = {
  title: 'Subscribe',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Optional marketing sign-up. Care, the assessment and checkout never depend on it. */
export default function SubscribePage() {
  const sms = smsMarketingEnabled();
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white px-5 pb-16 pt-32 text-ink md:px-10 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-xl">
          <h1 className="mb-3 text-[40px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]">
            Hear from us.
          </h1>
          <p className="mb-8 text-[15px] leading-relaxed text-ink-soft">
            Updates and offers from Eternal Longevity{sms ? ', by email, text or both' : ' by email'}. Optional, and
            never required for an assessment or treatment.
          </p>
          <div className="rounded-shell bg-milk p-6 md:p-8">
            <SubscribeForm smsEnabled={sms} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
