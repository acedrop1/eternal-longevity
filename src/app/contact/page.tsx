import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { MessageForm } from '@/components/contact/MessageForm';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_HREF,
  SUPPORT_HOURS,
  STATEMENT_DESCRIPTOR,
} from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with our team. We answer everything within one business day.',
};

const linkClass = 'underline decoration-black/40 underline-offset-[3px] transition-colors hover:decoration-black';

const CONTACT_ROWS: { label: string; title: ReactNode; body: ReactNode }[] = [
  {
    label: 'Support',
    title: (
      <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
        {SUPPORT_EMAIL}
      </a>
    ),
    body: 'Orders, protocols, billing, press and partnerships. Replies within one business day.',
  },
  // Only rendered when a real number is configured — see SUPPORT_PHONE.
  ...(SUPPORT_PHONE
    ? [
        {
          label: 'Phone',
          title: (
            <a href={SUPPORT_PHONE_HREF} className={linkClass}>
              {SUPPORT_PHONE}
            </a>
          ),
          body: `Speak to our team ${SUPPORT_HOURS}. For billing questions, have your order number ready.`,
        },
      ]
    : []),
  {
    label: 'Hours',
    title: SUPPORT_HOURS,
    body: "Support team responses happen during business hours. We'll triage urgent items first.",
  },
  {
    label: 'Mailing address',
    title: BUSINESS_LEGAL_NAME,
    body: <address className="not-italic">{BUSINESS_ADDRESS}</address>,
  },
  {
    label: 'On your statement',
    title: <span className="font-mono text-[15px]">{STATEMENT_DESCRIPTOR}</span>,
    body: 'Charges from us appear under this name. No medication name ever appears on your statement.',
  },
];

export default function ContactPage() {
  return (
    <>
      <Header categoryStrip />
      <main>
        {/* Top padding clears the fixed header + product strip (126 / 134px). */}
        <section className="bg-white px-5 pb-16 pt-[158px] text-black md:px-8 md:pb-24 md:pt-[182px]">
          {/* Mobile order: heading, form, details. Desktop: heading + details left, form right. */}
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-12">
            <div>
              <h1
                className="font-display font-normal [text-wrap:balance]"
                style={{ fontSize: 'clamp(2.4rem, 3.4vw + 1rem, 4.5rem)', fontStretch: '75%', lineHeight: 1 }}
              >
                Talk to us.
              </h1>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-black/70">
                Most answers are already in our{' '}
                <Link href="/faq" className={`text-black ${linkClass}`}>
                  FAQ
                </Link>
                . For anything we missed, drop us a line here and a real human will reply within one business day.
              </p>
            </div>

            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-2">
              <MessageForm />
            </div>

            <dl className="border-t border-black/15 lg:col-start-1">
              {CONTACT_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="border-b border-black/15 py-5 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6"
                >
                  <dt className="font-mono text-[13px] text-black/55 sm:pt-1">{row.label}</dt>
                  <dd className="mt-1 sm:mt-0">
                    <div className="text-[17px]">{row.title}</div>
                    <div className="mt-1 max-w-md text-[15px] leading-relaxed text-black/70">{row.body}</div>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}
