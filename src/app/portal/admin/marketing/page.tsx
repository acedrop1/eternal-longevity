import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { getSession, loginUrl } from '@/lib/auth-server';
import { PRESETS, dayOf, presetRange, previousRange, rangeDays, type DateRange, type Preset } from '@/lib/profit';
import { loadMarketing } from '@/lib/marketing-data';
import { NOTE_STEP, RECOMMEND_STEP, STEPS } from '@/lib/intakeSchema';
import { PRODUCT_CATEGORY, buildCategorySteps } from '@/lib/intake-categories';
import { SITE_URL } from '@/lib/site';
import { CATEGORIES } from '@/lib/lineup';
import { MarketingView, type NamedPage } from './MarketingView';
import { listSavedLinksAction } from '@/lib/saved-links-actions';
import { LANDINGS } from '@/lib/landings';
import { getLandingStatus } from '@/lib/landing-actions';

export const metadata: Metadata = { title: 'Marketing' };
export const dynamic = 'force-dynamic';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const valid = (d: string | undefined): d is string => !!d && DAY.test(d) && !Number.isNaN(Date.parse(d));

/**
 * Shopify-style acquisition reports: sessions, assessment funnel, and sales by
 * traffic source, campaign and landing page, plus a tagged-link builder.
 * ADMIN ONLY.
 */
export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect(await loginUrl());
  if (user.role !== 'admin') redirect(user.redirectTo);

  const sp = await searchParams;
  const today = dayOf(Date.now());
  let preset: Preset | 'custom' = PRESETS.some(([k]) => k === sp.range) ? (sp.range as Preset) : 'last_30';
  let range: DateRange = presetRange(preset as Preset, today);
  if (valid(sp.from) && valid(sp.to) && sp.from <= sp.to && rangeDays({ from: sp.from, to: sp.to }) <= 366 * 2) {
    preset = 'custom';
    range = { from: sp.from, to: sp.to };
  }
  const previous = previousRange(range);
  const [now, before] = await Promise.all([loadMarketing(range), loadMarketing(previous)]);

  // Human names for the assessment screens in the drop-off report.
  // Screens are tracked as "stepId:firstFieldId" (lowercased by /api/t).
  const stepLabels: Record<string, string> = Object.fromEntries(
    [...STEPS, RECOMMEND_STEP, NOTE_STEP, ...buildCategorySteps(Object.keys(PRODUCT_CATEGORY))].flatMap((s) => [
      [s.id.toLowerCase(), s.heading],
      [`${s.id}:`.toLowerCase(), s.heading],
      ...s.fields.map((f) => [`${s.id}:${f.id}`.toLowerCase(), f.label || s.heading]),
    ]),
  );

  // The page dropdown: named pages first, then any other page that got visits (by its path).
  const named: NamedPage[] = [
    { label: 'Hair landing page (/hair)', path: '/hair' },
    ...(await getLandingStatus().then((st) =>
      LANDINGS.map((l) => ({ label: `${l.title} landing page (/${l.slug})${st[l.slug] ? '' : ' · draft'}`, path: `/${l.slug}` })),
    )),
    { label: 'Homepage', path: '/' },
    { label: 'Shop all', path: '/shop' },
    { label: 'Start assessment', path: '/start' },
    ...CATEGORIES.map((c) => ({ label: `${c.name} treatments`, path: `/treatments/${c.slug}` })),
  ];
  const pages: NamedPage[] = [
    ...named,
    ...now.byPage.filter((r) => !named.some((n) => n.path === r.path)).map((r) => ({ label: r.path, path: r.path })),
  ];

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <MarketingView
        preset={preset}
        range={range}
        previous={previous}
        today={today}
        data={now}
        before={before.totals}
        stepLabels={stepLabels}
        siteUrl={SITE_URL}
        pages={pages}
        savedLinks={await listSavedLinksAction()}
      />
    </PortalShell>
  );
}
