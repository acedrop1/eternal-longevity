import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { confirmEmailAction } from '@/lib/marketing-actions';

export const metadata: Metadata = {
  title: 'Confirm subscription',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The link in the confirmation email. One button rather than confirming on
 * load: mail scanners open links, and a GET that subscribed would prove nothing.
 */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ t?: string; invalid?: string }> }) {
  const { t = '', invalid } = await searchParams;

  async function confirm() {
    'use server';
    const res = await confirmEmailAction(t);
    redirect(res.ok ? `/marketing-preferences?t=${res.prefToken}&confirmed=1` : '/subscribe/confirm?invalid=1');
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white px-5 pb-16 pt-32 text-ink md:px-10 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-lg rounded-shell bg-milk p-6 md:p-8">
          <h1 className="mb-3 text-[32px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[40px]">
            {invalid || !t ? 'This link has expired or isn’t valid.' : 'Confirm your subscription.'}
          </h1>
          <p className="mb-6 text-[15px] leading-relaxed text-ink-soft">
            {invalid || !t
              ? 'It may already have been used. You can sign up again any time.'
              : 'Confirm you’d like marketing emails from Eternal Longevity. You can unsubscribe at any time.'}
          </p>
          {invalid || !t ? (
            <Link href="/subscribe" className="inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85">
              Subscribe
            </Link>
          ) : (
            <form action={confirm}>
              <button type="submit" className="inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85">
                Confirm subscription
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
