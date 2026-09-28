import type { Metadata } from 'next';
import { Header } from '@/components/nav/Header';
import { Footer } from '@/components/sections/Footer';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import { getCatalogProduct, getLiveProduct } from '@/lib/catalog';
import { ALL_ITEMS, LIST_DRAFTS } from '@/lib/lineup';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta(
  '/start',
  'Start Your Assessment',
  'Start with a short health profile. A licensed physician reviews it and decides whether to prescribe.',
);

interface StartPageProps {
  searchParams: Promise<{ product?: string }>;
}

export default async function StartPage({ searchParams }: StartPageProps) {
  // Visitors arriving from a storefront card land here with ?product=<slug>:
  // a live product, or a listed draft (LIST_DRAFTS) so it isn't silently dropped.
  const { product: slug } = await searchParams;
  const live = slug ? await getLiveProduct(slug) : null;
  const item = !live && LIST_DRAFTS ? ALL_ITEMS.find((x) => x.item.slug === slug)?.item : undefined;
  const draft = item?.live ? await getCatalogProduct(item.live) : null;
  const requested = live ?? (draft?.status === 'draft' ? draft : null);
  return (
    <>
      <Header />
      {/* Focused funnel: plain white ground, no product strip, no video. */}
      <main className="relative min-h-screen bg-white text-ink">
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
