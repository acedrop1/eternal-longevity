import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { LoopVideo } from '@/components/ui/LoopVideo';
import { FadeIn } from '@/components/ui/FadeIn';
import { DemoCredentials } from '@/components/auth/DemoCredentials';
import { loginAction } from '@/lib/auth-actions';

export const metadata: Metadata = {
  title: 'Log in | Eternal Longevity',
  description: 'Access your portal. Member, doctor, or admin.',
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <>
      <Header />
      <main className="relative min-h-screen bg-background overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <LoopVideo src="/videos/3.mp4" className="absolute inset-0 w-full h-full" />
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
                  MEMBER · DOCTOR · ADMIN
                </p>
                <h1
                  className="font-semibold tracking-tight text-foreground"
                  style={{
                    fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05,
                  }}
                >
                  Welcome back.
                </h1>
              </div>
            </FadeIn>

            <FadeIn delay={120}>
              <form
                action={loginAction}
                className="rounded-3xl border border-line bg-surface/85 backdrop-blur p-6 md:p-8 space-y-5"
              >
                {error === 'invalid' && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    Invalid email or password. Tap a demo card below to fill the form.
                  </div>
                )}

                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1.5 block text-[11px] tracking-wider text-foreground/60"
                  >
                    EMAIL
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full rounded-2xl border border-line bg-background px-4 py-3.5 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-[11px] tracking-wider text-foreground/60"
                    >
                      PASSWORD
                    </label>
                    <Link
                      href="/contact"
                      className="text-[11px] tracking-wider text-accent hover:text-accent-soft"
                    >
                      FORGOT?
                    </Link>
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-2xl border border-line bg-background px-4 py-3.5 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-accent text-black font-semibold py-3.5 text-base hover:bg-accent-soft transition-colors"
                >
                  Log in →
                </button>

                <DemoCredentials />

                <Link
                  href="/start"
                  className="block w-full rounded-full glass text-foreground/85 font-semibold py-3.5 text-base text-center hover:text-foreground transition-colors"
                >
                  Start a new assessment
                </Link>
              </form>
            </FadeIn>

            <FadeIn delay={240}>
              <p className="mt-8 text-center text-xs text-foreground/55 leading-relaxed">
                Trouble signing in?{' '}
                <Link
                  href="/contact"
                  className="text-foreground/85 hover:text-foreground underline-offset-4 hover:underline"
                >
                  Contact our care team
                </Link>
                .
              </p>
            </FadeIn>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
