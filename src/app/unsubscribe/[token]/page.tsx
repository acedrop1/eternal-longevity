import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { unsubscribeAction, unsubscribeStatus } from '@/lib/lead-actions';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The unsubscribe link in reminder email. The token is the credential, so it
 * works without signing in. One button, not an automatic opt-out on load: mail
 * scanners open links, and a GET that unsubscribes would fire on their visit.
 */
export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const status = await unsubscribeStatus(token);

  async function confirm() {
    'use server';
    await unsubscribeAction(token);
    redirect(`/unsubscribe/${token}`);
  }

  const heading =
    status === 'invalid'
      ? 'This link has expired or isn’t valid.'
      : status === 'unsubscribed'
        ? 'You’re unsubscribed.'
        : 'Stop reminder emails?';
  const body =
    status === 'invalid'
      ? 'If you’d like us to stop emailing you, reply to any of our emails or write to us and we’ll take care of it.'
      : status === 'unsubscribed'
        ? 'We won’t send you any more reminders or offers. Emails about an order you place — shipping, payment, messages from your physician — still arrive.'
        : 'We’ll stop sending reminders about your assessment and plan. Emails about an order you place still arrive.';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white px-5 pb-16 pt-32 text-ink md:px-10 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-lg rounded-shell bg-milk p-6 md:p-8">
          <h1 className="mb-3 text-[32px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[40px]">
            {heading}
          </h1>
          <p className="mb-6 text-[15px] leading-relaxed text-ink-soft">{body}</p>
          {status === 'subscribed' ? (
            <form action={confirm}>
              <button
                type="submit"
                className="inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85"
              >
                Unsubscribe
              </button>
            </form>
          ) : (
            <Link
              href={status === 'invalid' ? '/contact' : '/'}
              className="inline-flex rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85"
            >
              {status === 'invalid' ? 'Contact us' : 'Back to home'}
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
