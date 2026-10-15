import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient, supabaseAdminConfigured } from './supabase/admin';
import { loadEconData } from './profit-data';
import { dayOf, orderEconomics, type DateRange } from './profit';
import { CATEGORY_LABEL, PRODUCT_CATEGORY, type CategoryKey } from './intake-categories';
import { cleanQuiz } from './attribution';

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

/** Finished assessments and paid orders per treatment category. New categories appear on their own. */
export interface CategoryRow {
  category: string;
  completes: number;
  orders: number;
  revenue: number;
}

/** One answer to one landing-page quiz question (lib/attribution saveQuiz), any page. */
export interface QuizRow {
  page: string;
  question: string;
  answer: string;
  completes: number;
  orders: number;
  revenue: number;
}

const categoryName = (key: string) => CATEGORY_LABEL[key as CategoryKey] ?? (key ? key : 'Other');
/** Intakes from before saveQuiz kept only /hair's goal. */
const LEGACY_HAIR_GOAL: Record<string, string> = { stop: 'Stop hair loss', regrow: 'Regrow hair', both: 'Both' };

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
  byCategory: CategoryRow[];
  quiz: QuizRow[];
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
  const cats = new Map<string, CategoryRow>();
  const catRow = (key: string) => {
    const name = categoryName(key);
    let r = cats.get(name);
    if (!r) cats.set(name, (r = { category: name, completes: 0, orders: 0, revenue: 0 }));
    return r;
  };
  const quiz = new Map<string, QuizRow>();
  const quizRows = (q: { page: string; answers: Record<string, string> }) =>
    Object.entries(q.answers).map(([question, answer]) => {
      const k = `${q.page}\u0000${question}\u0000${answer}`;
      let r = quiz.get(k);
      if (!r) quiz.set(k, (r = { page: q.page, question, answer, completes: 0, orders: 0, revenue: 0 }));
      return r;
    });
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
    const firstQuiz = new Map<string, { page: string; answers: Record<string, string> }>();
    try {
      const intakes = await readAll((from) =>
        db
          .from('intake_submissions')
          .select('user_id, created_at, attr:answers->_attribution, quiz:answers->_quiz, goal:answers->>hr_goal, cat:answers->>entryCategory, product:answers->>entryProductId')
          .order('created_at', { ascending: true })
          .range(from, from + 999),
      );
      for (const i of intakes) {
        const a = (i.attr ?? null) as Row | null;
        const src = { source: str(a?.source) || 'direct', medium: str(a?.medium), campaign: str(a?.campaign), landing: str(a?.landing) };
        const uid = str(i.user_id);
        if (uid && a && !firstSource.has(uid)) firstSource.set(uid, src);
        const goal = LEGACY_HAIR_GOAL[str(i.goal)];
        const q = cleanQuiz(i.quiz) ?? (goal ? { page: '/hair', answers: { 'What are your hair goals?': goal } } : null);
        if (uid && q && !firstQuiz.has(uid)) firstQuiz.set(uid, q);
        const day = dayOf(new Date(str(i.created_at)).getTime());
        if (day < range.from || day > range.to) continue;
        totals.completes++;
        const d = days.get(day);
        if (d) d.completes++;
        bump(src.source, src.medium, src.campaign, (r) => r.completes++);
        if (src.landing) page(src.landing).completes++;
        catRow(str(i.cat) || PRODUCT_CATEGORY[str(i.product)] || '').completes++;
        if (q) for (const r of quizRows(q)) r.completes++;
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
      const q = firstQuiz.get(o.customer);
      if (q) {
        for (const r of quizRows(q)) {
          r.orders++;
          r.revenue += e.net;
        }
      }
      // By what was bought: the order's first line decides its category.
      const c = catRow(PRODUCT_CATEGORY[o.lines[0]?.productId ?? ''] ?? '');
      c.orders++;
      c.revenue += e.net;
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
    byCategory: [...cats.values()].sort((a, b) => b.revenue - a.revenue || b.completes - a.completes),
    quiz: [...quiz.values()].sort((a, b) => a.page.localeCompare(b.page) || a.question.localeCompare(b.question) || b.completes - a.completes),
    tracking,
    untagged,
  };
}
