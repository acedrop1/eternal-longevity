import type { ReactNode } from 'react';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';

/**
 * Shared chrome for the auth screens (/login, /signup, /forgot-password,
 * /auth/reset, /login/verify): white ground, the form column on the left and,
 * on desktop, a black brand panel on the right.
 */
export function AuthShell({
  eyebrow,
  title,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  /** The card — usually a <form>. */
  children: ReactNode;
  /** Optional small print rendered below the card. */
  footer?: ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="bg-white text-black">
        {/* Top padding clears the fixed header (80 / 88px). */}
        <section className="px-5 pb-16 pt-[112px] md:px-8 md:pb-24 md:pt-[136px]">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="mx-auto w-full max-w-md lg:mx-0 lg:py-8">
              <FadeIn>
                <p className="mb-3 font-mono text-[13px] text-black/55">{eyebrow}</p>
                <h1
                  className="font-display font-normal [text-wrap:balance]"
                  style={{ fontSize: 'clamp(2.2rem, 3vw + 1rem, 3.5rem)', fontStretch: '75%', lineHeight: 1 }}
                >
                  {title}
                </h1>
              </FadeIn>

              <FadeIn delay={120} className="mt-8">
                {children}
              </FadeIn>

              {footer && (
                <FadeIn delay={240}>
                  <div className="mt-8 font-mono text-[13px] leading-relaxed text-black/60">{footer}</div>
                </FadeIn>
              )}
            </div>

            <aside className="hidden min-h-[560px] flex-col justify-between rounded-[4px] bg-black p-10 text-white lg:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Eternal Longevity" className="h-9 w-auto self-start" />
              <div>
                <p
                  className="max-w-sm font-display font-normal [text-wrap:balance]"
                  style={{ fontSize: 'clamp(1.8rem, 1.4vw + 1rem, 2.6rem)', fontStretch: '75%', lineHeight: 1.05 }}
                >
                  Every protocol is compounded by a licensed 503A pharmacy against a prescription written for you.
                </p>
                <p className="mt-6 font-mono text-[12px] text-white/55">
                  NJ, NY, PA &amp; MI only · Prescription required · 18+
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}

/** Shared input styling for auth forms. */
export const authInputClass =
  'w-full rounded-[2px] bg-black/[0.04] px-4 py-3 text-[16px] text-black ring-1 ring-black/10 placeholder:text-black/35 transition-shadow focus:outline-none focus:ring-2 focus:ring-black';

/** Error message box (server-returned auth errors). */
export const authErrorClass =
  'rounded-[2px] bg-red-50 px-4 py-3 text-[15px] leading-relaxed text-red-800 ring-1 ring-red-700/20';

/** Neutral notice box (info, confirmations). */
export const authNoticeClass =
  'rounded-[2px] bg-[#F2F2F0] px-4 py-3 text-[15px] leading-relaxed text-black/80';

/** Inline text link. */
export const authLinkClass =
  'text-black underline decoration-black/50 underline-offset-[3px] transition-colors hover:decoration-black';

/** Secondary (outline) pill, full width. */
export const authSecondaryClass =
  'block w-full rounded-full px-5 py-3.5 text-center font-mono text-[14px] text-black ring-1 ring-black/20 transition-colors hover:bg-black/[0.04]';

/** Shared field label. */
export function AuthLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block font-mono text-[13px] text-black/70">
      {children}
    </label>
  );
}
