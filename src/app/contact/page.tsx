import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { pageMeta } from '@/lib/seo';
import { Footer } from '@/components/sections/Footer';
import { MessageForm } from '@/components/contact/MessageForm';
import { Aura, GLASS } from '@/components/home/HomeSections';
import { cn } from '@/lib/utils';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_HREF,
  SUPPORT_HOURS,
  STATEMENT_DESCRIPTOR,
} from '@/lib/site';

export const metadata: Metadata = pageMeta('/contact', 'Contact', 'Get in touch with our team. We answer everything within one business day.');

const linkClass = 'underline decoration-ink/30 underline-offset-[3px] transition-colors hover:decoration-ink';

const CONTACT_ROWS: { label: string; title: ReactNode; body: ReactNode }[] = [
  {
    label: 'Support',
    title: (
      <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
        {SUPPORT_EMAIL}
      </a>
    ),
    body: 'Orders, prescriptions, billing, press and partnerships. Replies within one business day.',
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
    body: 'We reply during business hours. This is not an emergency line: in an emergency, call 911.',
  },
  {
    label: 'Mailing address',
    title: BUSINESS_LEGAL_NAME,
    body: <address className="not-italic">{BUSINESS_ADDRESS}</address>,
  },
  {
    label: 'On your statement',
    title: STATEMENT_DESCRIPTOR,
    body: 'Charges from us appear under this name. No medication name ever appears on your statement.',
  },
];

export default function ContactPage() {
  return (
    <>
      <Header categoryStrip />
      <main className="bg-white">
        <section className="px-5 pb-12 pt-44 md:px-10 md:pb-16 md:pt-52">
          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
            <div>
              <h1 className="text-[48px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[80px]">
                Talk to us.
              </h1>
              <p className="mt-5 max-w-[480px] text-[16px] leading-relaxed text-ink-soft">
                Most answers are already in our{' '}
                <Link href="/faq" className={`text-ink ${linkClass}`}>
                  FAQ
                </Link>
                . For anything we missed, drop us a line here and a real human will reply within one business day. In an
                emergency, call 911.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-shell bg-milk">
              <Image src="/brand/life-telehealth.jpg" alt="" fill priority sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover" />
            </div>
          </div>
        </section>

        {/* Mobile order: form, then details. Desktop: details left, form right. */}
        <section className="px-3 pb-16 md:px-5 md:pb-24">
          <h2 className="sr-only">Ways to reach us</h2>
          <div className="relative overflow-hidden rounded-shell bg-milk p-3 md:p-5">
            <Aura mix="sunrise" className="opacity-70" />
            <div className="relative grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-5">
              <div className="rounded-inner bg-white p-6 md:p-10 lg:order-2">
                <MessageForm />
              </div>

              <dl className="grid content-start gap-3 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
                {CONTACT_ROWS.map((row) => (
                  <div key={row.label} className={cn('rounded-inner p-5 md:p-6', GLASS)}>
                    <dt className="text-[13px] font-medium text-ink/65">{row.label}</dt>
                    <dd className="mt-2">
                      <div className="text-[17px] font-semibold tracking-[-0.015em] text-ink [overflow-wrap:anywhere]">{row.title}</div>
                      <div className="mt-1 max-w-md text-[15px] leading-relaxed text-ink-soft">{row.body}</div>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
