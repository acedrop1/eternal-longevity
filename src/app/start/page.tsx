import type { Metadata } from 'next';
import Link from 'next/link';
import { IntakeWizard } from '@/components/intake/IntakeWizard';
import type { Offer } from '@/components/intake/Recommendation';
import { getSession } from '@/lib/auth-server';
import { getCatalogProduct, getLiveProduct, getLiveProducts } from '@/lib/catalog';
import { PRODUCT_CATEGORY } from '@/lib/intake-categories';
import { isCategoryKey } from '@/lib/intakeSchema';
import { knownAnswerIds } from '@/lib/intake-rules';
import { intakeStateFor, latestIntakeAnswers } from '@/lib/intake-status';
import { getAssessmentDraft } from '@/lib/assessment-drafts';
import { ALL_ITEMS, LIST_DRAFTS } from '@/lib/lineup';
import { cadenceTiersForProduct, defaultTier } from '@/lib/shopProducts';
import { pageMeta } from '@/lib/seo';
import { shippingPriceFor } from '@/lib/shipping';

export const metadata: Metadata = pageMeta(
  '/start',
  'Start Your Assessment',
  'Start with a short health profile. A licensed physician reviews it and decides whether to prescribe.',
);

interface StartPageProps {
  searchParams: Promise<{ product?: string; category?: string }>;
}

/**
 * The assessment. Three ways in: ?product=<id> (a product page), ?category=
 * (a category page), or nothing (home: the goal picker first). Focused mode:
 * the wizard draws its own header, and there is no site nav or footer.
 */
export default async function StartPage({ searchParams }: StartPageProps) {
  // Visitors arriving from a storefront card land here with ?product=<slug>:
  // a live product, or a listed draft (LIST_DRAFTS) so it isn't silently dropped.
  const { product: slug, category: cat } = await searchParams;
  const live = slug ? await getLiveProduct(slug) : null;
  const item = !live && LIST_DRAFTS ? ALL_ITEMS.find((x) => x.item.slug === slug)?.item : undefined;
  const draft = item?.live ? await getCatalogProduct(item.live) : null;
  const requested = live ?? (draft?.status === 'draft' ? draft : null);
  const category = !requested && isCategoryKey(cat) ? cat : undefined;

  // Everything live the assessment can recommend, priced as the product pages price it.
  const what = new Map(ALL_ITEMS.map(({ item: i }) => [i.live ?? i.slug, i.what]));
  const offers: Record<string, Offer> = Object.fromEntries(
    (await getLiveProducts())
      .filter((p) => Object.prototype.hasOwnProperty.call(PRODUCT_CATEGORY, p.id))
      .map((p) => {
        const tiers = cadenceTiersForProduct(p);
        return [
          p.id,
          {
            id: p.id,
            name: p.name,
            what: what.get(p.id) ?? p.tagline,
            image: p.image,
            swatch: p.swatch,
            contraindications: p.contraindications,
            tiers,
            defaultCadence: defaultTier(tiers).key,
            shipping: shippingPriceFor(p),
          },
        ];
      }),
  );

  /*
   * Signed-in members skip what is on file (details, body, consents, the
   * account) and are asked only the category, health and product questions.
   * Only sex reaches the browser: the questions branch on it.
   */
  const user = await getSession();
  const isMember = user?.role === 'member';
  const [state, onFile]: [string | null, Record<string, unknown>] = isMember
    ? await Promise.all([intakeStateFor(user.id), latestIntakeAnswers(user.id)])
    : [null, {}];
  const member = isMember
    ? { known: knownAnswerIds(onFile), prefill: typeof onFile.sex === 'string' ? { sex: onFile.sex } : {} }
    : undefined;
  // Their unfinished run from this same entry point (the wizard keys it the same way).
  const entry = (requested && PRODUCT_CATEGORY[requested.id] ? requested.id : undefined) ?? category ?? 'general';
  const saved = isMember ? await getAssessmentDraft(entry) : null;

  return (
    <main className="relative min-h-screen bg-white text-ink">
      {state === 'declined' ? (
        <div className="mx-auto max-w-[640px] px-5 pb-20 pt-24 text-center md:pt-32">
          <h1 className="mb-4 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[40px]">
            Your last visit was closed.
          </h1>
          <p className="mb-8 text-[16px] leading-relaxed text-ink-soft">
            A new assessment can&rsquo;t be started while your last one is closed. If something has changed, message your care
            team and they can reopen it.
          </p>
          <Link
            href="/portal/messages"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-butter px-6 py-3 text-[15px] font-semibold text-ink"
          >
            Message your care team
          </Link>
        </div>
      ) : (
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
          category={category}
          offers={offers}
          member={member}
          draft={saved ? { answers: saved.answers, screen: saved.screen } : undefined}
        />
      )}
    </main>
  );
}
