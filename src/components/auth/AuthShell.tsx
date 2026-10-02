import type { ReactNode } from 'react';
import Image from 'next/image';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { FadeIn } from '@/components/ui/FadeIn';
import { SERVICE_AREA_SHORT } from '@/lib/site';

// Same value as GLASS_DARK in HomeSections. Inlined because PasswordField (a client
// component) imports this module, and HomeSections pulls in server-only catalogue code.
const GLASS_DARK = 'bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-xl backdrop-saturate-150';

/**
 * Shared chrome for the auth screens (/login, /signup, /forgot-password,
 * /auth/reset, /login/verify): a split layout. Desktop gets a large rounded
 * brand photo with a frosted caption on one side and the form on white on the
 * other; phones get the form alone under the header wordmark.
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
      <main className="bg-white text-ink">
        {/* Top padding clears the fixed header. */}
        <section className="px-3 pb-10 pt-24 md:px-5 md:pb-16 md:pt-28">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex items-center justify-center px-2 py-8 md:px-5 lg:py-16">
              <div className="w-full max-w-[440px]">
                <FadeIn>
                  <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-milk px-3.5 py-1.5 text-[13px] font-medium text-ink/70">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-butter-deep" />
                    {eyebrow}
                  </span>
                  <h1 className="text-[44px] font-semibold leading-[0.95] tracking-[-0.05em] text-ink [text-wrap:balance] md:text-[56px]">
                    {title}
                  </h1>
                </FadeIn>

                <FadeIn delay={120} className="mt-8">
                  {/* Keeps the outline H1 → H2 before the footer's column headings. */}
                  <h2 className="sr-only">Your account</h2>
                  {children}
                </FadeIn>

                {footer && (
                  <FadeIn delay={240}>
                    <div className="mt-8 text-[14px] leading-relaxed text-ink-soft">{footer}</div>
                  </FadeIn>
                )}
              </div>
            </div>

            <aside className="relative hidden overflow-hidden rounded-shell bg-milk lg:sticky lg:top-24 lg:order-first lg:block lg:h-[calc(100svh-7.5rem)] lg:min-h-[600px] lg:self-start">
              {/* SoHo loft, morning: our vials on the island. */}
              <Image src="/brand/hero-home.jpg" alt="" fill priority sizes="50vw" className="object-cover object-[66%_center]" />
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
              <div className={`absolute inset-x-6 bottom-6 rounded-inner p-7 xl:inset-x-8 xl:bottom-8 xl:p-8 ${GLASS_DARK}`}>
                <p className="max-w-md text-[24px] font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance] xl:text-[28px]">
                  Every order is prepared by a licensed 503A pharmacy against a prescription written for you.
                </p>
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-medium text-white/90 ring-1 ring-white/25">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-butter" />
                  {SERVICE_AREA_SHORT} only · Prescription required · 18+
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/** Shared input styling for auth forms. */
export const authInputClass =
  'w-full rounded-inner bg-milk px-4 py-3.5 text-[16px] text-ink ring-1 ring-transparent placeholder:text-ink/55 transition-[background-color,box-shadow] focus:bg-white focus:outline-none focus:ring-ink/20';

/** Error message box (server-returned auth errors). */
export const authErrorClass =
  'rounded-inner bg-red-50 px-4 py-3 text-[14px] leading-relaxed text-red-700 ring-1 ring-red-600/15';

/** Neutral notice box (info, confirmations). */
export const authNoticeClass =
  'rounded-inner bg-butter-soft px-4 py-3 text-[14px] leading-relaxed text-ink/80';

/** Inline text link. */
export const authLinkClass =
  'font-medium text-ink underline decoration-ink/30 underline-offset-[3px] transition-colors hover:decoration-ink';

/** Secondary pill, full width. */
export const authSecondaryClass =
  'block w-full rounded-full bg-milk px-5 py-3.5 text-center text-[15px] font-semibold text-ink transition-colors hover:bg-milk-deep';

/** Shared field label. */
export function AuthLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[13px] font-medium text-ink/70">
      {children}
    </label>
  );
}
