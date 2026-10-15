import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, supabaseAdminConfigured } from './supabase/admin';
import { loadEconData } from './profit-data';
import { dayOf, orderEconomics, type DateRange } from './profit';

/*
 * Admin → Marketing: where visitors come from and which sources turn into
 * paying patients. Sessions, assessment starts and screen-by-screen counts
 * come from the anonymous `site_events` (migration 0029); finished
 * assessments from `intake_submissions`; money from paid orders, matched to
 * the source saved on the member's first tagged intake. ADMIN ONLY.
 */

export interface SourceRow {
  key: string;
  source: string;
  medium: string;
  sessions: number;
  starts: number;
  completes: number;
  orders: number;
  revenue: number;
  profit: number;
}

export interface PageRow {
  path: string;
  sessions: number;
  /** Finished assessments and paid orders credited to this landing page (the page of their tagged visit). */
  completes: number;
  orders: number;
  revenue: number;
}

export interface StepRow {
  step: string;
  reached: number;
}

/** Hair assessments by /hair's first question, "What are your hair goals?". */
export interface HairRow {
  answer: string;
  completes: number;
  orders: number;
  revenue: number;
}

export interface DayRow {
  day: string;
  sessions: number;
  starts: number;
  completes: number;
  orders: number;
  revenue: number;
}

export interface MarketingTotals {
  sessions: number;
  starts: number;
  completes: number;
  orders: number;
  revenue: number;
  profit: number;
}

export interface MarketingData {
  totals: MarketingTotals;
  bySource: SourceRow[];
  byCampaign: SourceRow[];
  byPage: PageRow[];
  steps: StepRow[];
  byDay: DayRow[];
  hairPath: HairRow[];
  /** False when site_events could not be read (migration 0029 not run). */
  tracking: boolean;
  /** Paid orders whose member has no tagged intake (before tracking, or direct). */
  untagged: number;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : '');

async function readAll(build: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const blankSource = (key: string, source: string, medium: string): SourceRow => ({
  key, source, medium, sessions: 0, starts: 0, completes: 0, orders: 0, revenue: 0, profit: 0,
});

function emptyDays(r: DateRange): Map<string, DayRow> {
  const m = new Map<string, DayRow>();
  for (let d = r.from; d <= r.to; d = new Date(Date.parse(`${d}T12:00:00Z`) + 86400_000).toISOString().slice(0, 10)) {
    m.set(d, { day: d, sessions: 0, starts: 0, completes: 0, orders: 0, revenue: 0 });
  }
  return m;
}

export async function loadMarketing(range: DateRange): Promise<MarketingData> {
  const totals: MarketingTotals = { sessions: 0, starts: 0, completes: 0, orders: 0, revenue: 0, profit: 0 };
  const sources = new Map<string, SourceRow>();
  const campaigns = new Map<string, SourceRow>();
  const pages = new Map<string, PageRow>();
  const steps = new Map<string, number>();
  const days = emptyDays(range);
  const hair = new Map<string, HairRow>();
  const hairRow = (answer: string) => {
    let r = hair.get(answer);
    if (!r) hair.set(answer, (r = { answer, completes: 0, orders: 0, revenue: 0 }));
    return r;
  };
  let tracking = true;
  let untagged = 0;

  const row = (map: Map<string, SourceRow>, key: string, source: string, medium: string) => {
    let r = map.get(key);
    if (!r) map.set(key, (r = blankSource(key, source, medium)));
    return r;
  };
  const bump = (src: string, med: string, camp: string, f: (r: SourceRow) => void) => {
    const s = src || 'direct';
    f(row(sources, `${s} / ${med || '(none)'}`, s, med));
    if (camp) f(row(campaigns, camp, s, med));
  };

  if (supabaseAdminConfigured()) {
    const db = createSupabaseAdminClient() as unknown as SupabaseClient;

    // Anonymous events: sessions, starts, screens reached.
    try {
      const events = await readAll((from) =>
        db
          .from('site_events')
          .select('day, kind, path, source, medium, campaign, step')
          .gte('day', range.from)
          .lte('day', range.to)
          .range(from, from + 999),
      );
      for (const e of events) {
        const [kind, src, med, camp, day] = [str(e.kind), str(e.source), str(e.medium), str(e.campaign), str(e.day)];
        const d = days.get(day);
        if (kind === 'visit') {
          totals.sessions++;
          if (d) d.sessions++;
          bump(src, med, camp, (r) => r.sessions++);
          const p = str(e.path) || '/';
          const pr = pages.get(p) ?? { path: p, sessions: 0, completes: 0, orders: 0, revenue: 0 };
          pr.sessions++;
          pages.set(p, pr);
        } else if (kind === 'start') {
          totals.starts++;
          if (d) d.starts++;
          bump(src, med, camp, (r) => r.starts++);
        } else if (kind === 'step' && e.step) {
          steps.set(str(e.step), (steps.get(str(e.step)) ?? 0) + 1);
        }
      }
    } catch (err) {
      tracking = false;
      console.error('[marketing] reading site_events failed (has supabase/migrations/0029_site_events.sql been run?):', err);
    }

    // Finished assessments, and each member's first tagged source.
    const firstSource = new Map<string, { source: string; medium: string; campaign: string; landing: string }>();
    const page = (p: string) => {
      const key = p || '/';
      let r = pages.get(key);
      if (!r) pages.set(key, (r = { path: key, sessions: 0, completes: 0, orders: 0, revenue: 0 }));
      return r;
    };
    const firstHair = new Map<string, string>();
    try {
      const intakes = await readAll((from) =>
        db
          .from('intake_submissions')
          .select('user_id, created_at, attr:answers->_attribution, goal:answers->>hr_goal')
          .order('created_at', { ascending: true })
          .range(from, from + 999),
      );
      for (const i of intakes) {
        const a = (i.attr ?? null) as Row | null;
        const src = { source: str(a?.source) || 'direct', medium: str(a?.medium), campaign: str(a?.campaign), landing: str(a?.landing) };
        const uid = str(i.user_id);
        if (uid && a && !firstSource.has(uid)) firstSource.set(uid, src);
        const tr = str(i.goal);
        if (uid && tr && !firstHair.has(uid)) firstHair.set(uid, tr);
        const day = dayOf(new Date(str(i.created_at)).getTime());
        if (day < range.from || day > range.to) continue;
        totals.completes++;
        const d = days.get(day);
        if (d) d.completes++;
        bump(src.source, src.medium, src.campaign, (r) => r.completes++);
        if (src.landing) page(src.landing).completes++;
        if (tr) hairRow(tr).completes++;
      }
    } catch (err) {
      console.error('[marketing] reading intakes failed:', err);
    }

    // Paid orders, credited to the member's first tagged source.
    const econ = await loadEconData();
    for (const o of econ.orders) {
      const day = dayOf(o.at);
      if (day < range.from || day > range.to) continue;
      const e = orderEconomics(o, econ.costs);
      const src = firstSource.get(o.customer);
      const tr = firstHair.get(o.customer);
      if (tr) {
        hairRow(tr).orders++;
        hairRow(tr).revenue += e.net;
      }
      if (!src) untagged++;
      totals.orders++;
      totals.revenue += e.net;
      totals.profit += e.profit;
      const d = days.get(day);
      if (d) {
        d.orders++;
        d.revenue += e.net;
      }
      if (src?.landing) {
        page(src.landing).orders++;
        page(src.landing).revenue += e.net;
      }
      bump(src?.source ?? 'untracked', src?.medium ?? '', src?.campaign ?? '', (r) => {
        r.orders++;
        r.revenue += e.net;
        r.profit += e.profit;
      });
    }
  }

  const byValue = (a: SourceRow, b: SourceRow) => b.revenue - a.revenue || b.sessions - a.sessions;
  return {
    totals,
    bySource: [...sources.values()].sort(byValue),
    byCampaign: [...campaigns.values()].sort(byValue),
    byPage: [...pages.values()].sort((a, b) => b.revenue - a.revenue || b.sessions - a.sessions).slice(0, 25),
    steps: [...steps.entries()].map(([step, reached]) => ({ step, reached })).sort((a, b) => b.reached - a.reached),
    byDay: [...days.values()],
    hairPath: [...hair.values()].sort((a, b) => b.completes - a.completes),
    tracking,
    untagged,
  };
}
