import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { ADMIN_NAV } from '@/components/portal/ui';
import { getSession, loginUrl } from '@/lib/auth-server';
import { loadEconData } from '@/lib/profit-data';
import { PRESETS, aggregate, dayOf, presetRange, previousRange, rangeDays, type DateRange, type Preset } from '@/lib/profit';
import { AnalyticsView } from './AnalyticsView';

export const metadata: Metadata = { title: 'Analytics' };
export const dynamic = 'force-dynamic';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const valid = (d: string | undefined): d is string => !!d && DAY.test(d) && !Number.isNaN(Date.parse(d));

/**
 * Shopify-style analytics: sales, costs and profit for a date range, against
 * the period before. ADMIN ONLY: costs and profit are worked out here on the
 * server (lib/profit) and only an admin session gets past the redirect.
 */
export default async function AnalyticsPage({
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
  // Custom: both ends, in order, at most five years.
  if (valid(sp.from) && valid(sp.to) && sp.from <= sp.to && rangeDays({ from: sp.from, to: sp.to }) <= 366 * 5) {
    preset = 'custom';
    range = { from: sp.from, to: sp.to };
  }
  const previous = previousRange(range);

  const data = await loadEconData();
  const now = aggregate(data.orders, range, data.costs);
  const before = aggregate(data.orders, previous, data.costs);
  const byDay = rangeDays(range) <= 92;

  return (
    <PortalShell user={user} nav={ADMIN_NAV}>
      <AnalyticsView
        preset={preset}
        range={range}
        previous={previous}
        today={today}
        totals={now.totals}
        before={before.totals}
        series={byDay ? now.byDay : now.byMonth}
        bucket={byDay ? 'day' : 'month'}
        byProduct={now.byProduct}
        byMonth={now.byMonth}
        orders={now.orders}
        missingCost={now.missingCost}
        source={data.source}
        snapshots={data.snapshots}
      />
    </PortalShell>
  );
}
