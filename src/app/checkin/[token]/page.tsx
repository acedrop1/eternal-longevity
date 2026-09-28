import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { CheckinForm } from '@/components/checkin/CheckinForm';
import { getCheckinByToken } from '@/lib/checkins-db';
import { GOOGLE_REVIEW_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'How’s it going?',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface CheckinPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ r?: string }>;
}

/**
 * The 30-day check-in link. The token is the credential, so it works straight
 * from the email without signing in, and takes one answer.
 */
export default async function CheckinPage({ params, searchParams }: CheckinPageProps) {
  const [{ token }, { r }] = await Promise.all([params, searchParams]);
  const checkin = await getCheckinByToken(token);
  const preset = Number(r);
  const initialRating = Number.isInteger(preset) && preset >= 1 && preset <= 5 ? preset : null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white px-5 pb-16 pt-32 text-ink md:px-10 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-lg">
          {!checkin ? (
            <div className="rounded-shell bg-milk p-6 md:p-8">
              <h1 className="mb-3 text-[32px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[40px]">
                This link has expired or isn’t valid.
              </h1>
              <p className="mb-6 text-[15px] leading-relaxed text-ink-soft">
                Check-in links last thirty days. If you’d still like to tell us
                how it’s going, we’d love to hear it.
              </p>
              <Link
                href="/portal/messages"
                className="inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85"
              >
                Message us
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-4 text-[44px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]">
                How’s it going, {checkin.firstName}?
              </h1>
              <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
                {checkin.kind === 'refill'
                  ? 'It’s been about a month since your refill arrived.'
                  : 'It’s been about a month since your treatment arrived.'}{' '}
                On a scale of 1 to 5, how are you finding it?
              </p>
              <CheckinForm
                token={checkin.token}
                initialRating={initialRating}
                answered={checkin.answered}
                googleReviewUrl={GOOGLE_REVIEW_URL}
              />
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
