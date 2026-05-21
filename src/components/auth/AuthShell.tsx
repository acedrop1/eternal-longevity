import type { ReactNode } from 'react';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { LoopVideo } from '@/components/ui/LoopVideo';
import { FadeIn } from '@/components/ui/FadeIn';

/**
 * Shared chrome for the auth screens (/login, /signup, /forgot-password,
 * /auth/reset): video background, centered card column, heading.
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
      <main className="relative min-h-screen bg-background overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <LoopVideo
            src="/videos/3.mp4"
            className="absolute inset-0 w-full h-full"
          />
          <div aria-hidden className="absolute inset-0 bg-background/85" />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/4 left-1/2 h-[50vh] w-[80vh] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[120px]"
        />

        <section className="relative px-6 pt-32 pb-24 md:pt-40">
          <div className="mx-auto max-w-md">
            <FadeIn>
              <div className="text-center mb-10">
                <p className="mb-3 text-[11px] tracking-widest text-accent">
                  {eyebrow}
                </p>
                <h1
                  className="font-semibold tracking-tight text-foreground"
                  style={{
                    fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05,
                  }}
                >
                  {title}
                </h1>
              </div>
            </FadeIn>

            <FadeIn delay={120}>{children}</FadeIn>

            {footer && (
              <FadeIn delay={240}>
                <div className="mt-8 text-center text-xs text-foreground/55 leading-relaxed">
                  {footer}
                </div>
              </FadeIn>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/** Shared input styling for auth forms. */
export const authInputClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3.5 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

/** Shared field label. */
export function AuthLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] tracking-wider text-foreground/60"
    >
      {children}
    </label>
  );
}
