import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { PrivacyRequestForm } from '@/components/privacy/PrivacyRequestForm';
import { SUPPORT_EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy request',
  robots: { index: false, follow: false },
};

const linkClass = 'underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink';

/** Access, correction, deletion, copy, consent withdrawal, ad opt-out, appeals and agents. */
export default function PrivacyRequestPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white px-5 pb-16 pt-32 text-ink md:px-10 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-xl">
          <h1 className="mb-3 text-[40px] font-semibold leading-[1] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]">
            Privacy request
          </h1>
          <p className="mb-8 text-[15px] leading-relaxed text-ink-soft">
            Ask to see, correct, delete or get a copy of your information, withdraw consent, opt out of advertising, or
            appeal a decision. We respond within 45 days and may ask you to confirm who you are, except for an
            advertising opt-out. You can also email{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
              {SUPPORT_EMAIL}
            </a>
            . To stop marketing email or texts, use{' '}
            <Link href="/marketing-preferences" className={linkClass}>
              Marketing preferences
            </Link>
            .
          </p>
          <div className="rounded-shell bg-milk p-6 md:p-8">
            <PrivacyRequestForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
