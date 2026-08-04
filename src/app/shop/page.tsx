import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { ShopCatalog } from '@/components/shop/ShopCatalog';
import { FadeIn } from '@/components/ui/FadeIn';
import { PUBLIC_PRODUCTS, PUBLIC_CATEGORIES } from '@/lib/shopProducts';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Compounded peptide protocols, third-party tested and shipped from a licensed 503A pharmacy. Subscribe monthly, quarterly, or annually.',
};

export default function PublicShopPage() {
  return (
    <>
      <Header />
      <main className="bg-background">
        {/* HERO */}
        <section className="relative isolate overflow-hidden pt-32 pb-12 md:pt-40 md:pb-16 px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/3 left-1/2 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-accent/[0.10] blur-[120px]"
          />
          <div className="relative mx-auto max-w-5xl text-center">
            <FadeIn>
              <p className="mb-4 text-[11px] tracking-widest text-accent">
                SHOP · SUBSCRIPTION-ONLY
              </p>
            </FadeIn>
            <FadeIn delay={100}>
              <h1
                className="font-semibold tracking-tight text-foreground"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                Compounded to order.
              </h1>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="mx-auto mt-5 max-w-2xl text-foreground/65 leading-relaxed">
                Every product is compounded by a U.S.-licensed 503A pharmacy,
                third-party tested for purity, and cold-chain shipped. Complete
                a short health assessment and your protocol ships to your door.
              </p>
            </FadeIn>
            <FadeIn delay={300}>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/start"
                  className="pill bg-accent text-black px-7 py-3 text-base font-semibold hover:brightness-110 transition"
                >
                  Start your assessment
                </Link>
                <Link
                  href="/protocols"
                  className="pill glass px-7 py-3 text-base text-foreground/80 hover:text-foreground transition"
                >
                  See protocols
                </Link>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* CATALOG */}
        <section className="px-4 md:px-6 pb-24 md:pb-32">
          <div className="mx-auto max-w-6xl">
            <ShopCatalog
              items={PUBLIC_PRODUCTS}
              categories={PUBLIC_CATEGORIES}
              basePath="/shop"
            />

            {/* Members see the rest of the catalog once signed in. */}
            <div className="mt-14 rounded-[2rem] border border-line bg-surface p-8 md:p-10 text-center">
              <p className="mb-2 text-[11px] tracking-widest text-accent">
                MEMBERS
              </p>
              <h2 className="mb-3 text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                The full catalog lives in your portal.
              </h2>
              <p className="mx-auto mb-6 max-w-xl text-sm text-foreground/65 leading-relaxed">
                Additional compounded formulations are available to members
                after a completed assessment. Create an account to see
                everything available for your protocol.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/signup"
                  className="pill bg-foreground text-background px-6 py-2.5 text-sm font-semibold hover:bg-accent hover:text-black transition-colors"
                >
                  Create an account
                </Link>
                <Link
                  href="/login"
                  className="pill glass px-6 py-2.5 text-sm text-foreground/80 hover:text-foreground transition"
                >
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
