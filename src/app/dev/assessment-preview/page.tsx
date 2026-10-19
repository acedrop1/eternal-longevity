import { notFound } from 'next/navigation';
import { buildAssessmentSteps, buildVisitSteps, isCategoryKey, type Step } from '@/lib/intakeSchema';
import { PRODUCT_CATEGORY, type CategoryKey } from '@/lib/intake-categories';

const CATEGORY_KEYS: CategoryKey[] = ['longevity', 'sexual-health', 'hormones', 'hair', 'skin'];
import { getLiveProducts } from '@/lib/catalog';
import { StepPreview } from './StepPreview';

/**
 * Dev only: every screen of the assessment for one product or category, every
 * question shown (conditional ones included, with when they appear), for the
 * prescriber's review. Never served in production. Screenshotted per screen by
 * scripts/assessment-screenshots.mjs.
 */
export default async function AssessmentPreview({ searchParams }: { searchParams: Promise<{ product?: string; category?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { product, category } = await searchParams;
  const live = await getLiveProducts();
  const catalog = Object.fromEntries(live.map((p) => [p.id, { name: p.name, contraindications: p.contraindications ?? [] }]));
  const p = product ? live.find((x) => x.id === product) : undefined;
  const cat: CategoryKey | undefined = category && isCategoryKey(category) ? category : undefined;
  if (!product && !category) {
    // Index for the screenshot script: every live product with its category, and each category start.
    return (
      <main className="p-6">
        <ul>
          {live.map((x) => (
            <li key={x.id} data-product={x.id} data-category={PRODUCT_CATEGORY[x.id] ?? 'other'} data-name={x.name}>{x.name}</li>
          ))}
          {CATEGORY_KEYS.map((k) => (
            <li key={k} data-start-category={k}>{k}</li>
          ))}
        </ul>
      </main>
    );
  }
  if (!p && !cat) notFound();

  const before: Step[] = buildAssessmentSteps({ productId: p?.id, category: p ? undefined : cat, catalog }, {});
  const after: Step[] = p ? buildVisitSteps([{ id: p.id, name: p.name, contraindications: p.contraindications ?? [] }]) : [];
  // Labels for "only asked if …" notes.
  const labels: Record<string, string> = {};
  const options: Record<string, Record<string, string>> = {};
  for (const st of [...before, ...after])
    for (const f of st.fields) {
      labels[f.id] = f.label || st.heading;
      if (f.options) options[f.id] = Object.fromEntries(f.options.map((o) => [o.value, o.label]));
    }

  return (
    <main className="mx-auto max-w-[760px] space-y-10 bg-white px-5 py-10 text-ink">
      <header>
        <p className="text-[13px] font-medium text-ink/60">Assessment for prescriber review</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-[-0.03em]">{p ? p.name : `${cat} (category start)`}</h1>
      </header>
      <StepPreview part="Part 1 · Before checkout" steps={before} labels={labels} options={options} offset={0} />
      {after.length > 0 && <StepPreview part="Part 2 · Health questions after checkout" steps={after} labels={labels} options={options} offset={before.length} />}
    </main>
  );
}
