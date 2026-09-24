import type { Metadata } from 'next';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import { getLiveProduct } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Start Your Assessment',
  description:
    'Start with a short health profile. A licensed physician reviews it and decides whether to prescribe.',
};

interface StartPageProps {
  searchParams: Promise<{ product?: string }>;
}

export default async function StartPage({ searchParams }: StartPageProps) {
  // Visitors arriving from a storefront card land here with ?product=<slug>.
  const { product: slug } = await searchParams;
  const requested = slug ? await getLiveProduct(slug) : undefined;
  return (
    <>
      <Header />
      {/* Focused funnel: plain white ground, no product strip, no video. */}
      <main className="relative min-h-screen bg-white text-black">
        <IntakeWizard
          product={
            requested
              ? {
                  id: requested.id,
                  name: requested.name,
                  tagline: requested.tagline,
                  contraindications: requested.contraindications,
                }
              : undefined
          }
        />
      </main>
      <div className="bg-white">
        <Footer />
      </div>
    </>
  );
}
