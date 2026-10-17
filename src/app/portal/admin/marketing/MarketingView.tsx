'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import { PRESETS, change, type DateRange, type Preset } from '@/lib/profit';
import type { MarketingData, MarketingTotals, SourceRow } from '@/lib/marketing-data';
import { deleteLinkAction, saveLinkAction, type SavedLink } from '@/lib/saved-links-actions';
import {
  AdminPageHeader,
  MetricCard,
  SectionCard,
  fieldInput,
  fieldLabel,
  plainTd,
  secondaryButton,
  toolbarSelect,
} from '@/components/admin/IndexTable';

interface Props {
  preset: Preset | 'custom';
  range: DateRange;
  previous: DateRange;
  today: string;
  data: MarketingData;
  before: MarketingTotals;
  stepLabels: Record<string, string>;
  siteUrl: string;
  /** The link builder's page dropdown: named pages, then any other page that got visits. */
  pages: NamedPage[];
  savedLinks: SavedLink[];
}

const money = (cents: number) => (cents < 0 ? `−${formatMoney(-cents)}` : formatMoney(cents));
const rate = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : '—');
const int = (n: number) => n.toLocaleString('en-US');
const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const BLUE = '#2a78d6';

/** Ready-made link tags: the source names the reports group by. */
const LINK_PRESETS = [
  { label: 'Eternal Hair email', source: 'eternalhair', medium: 'email', campaign: 'hair-launch', page: '/hair' },
  { label: 'Eternal Hair text (SMS)', source: 'eternalhair', medium: 'sms', campaign: 'hair-launch', page: '/hair' },
  { label: 'Meta ad (Facebook/Instagram)', source: 'meta', medium: 'paid', campaign: '', page: '/hair' },
  { label: 'Google ad', source: 'google', medium: 'paid', campaign: '', page: '/hair' },
  { label: 'Instagram bio / post', source: 'instagram', medium: 'social', campaign: '', page: '/' },
  { label: 'Influencer / partner', source: 'partner', medium: 'referral', campaign: '', page: '/' },
  { label: 'Custom', source: '', medium: '', campaign: '', page: '/' },
];

/** A page the link builder offers by name. */
export interface NamedPage {
  label: string;
  path: string;
}

/** Label | Finished | Paid | Conv. | Net sales: shared by the category and quiz tables. */
function MoneyTable({ first, rows, empty }: { first: string; empty: string; rows: { key: string; label: string; completes: number; orders: number; revenue: number }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-[14px] tabular-nums">
        <thead>
          <tr className="bg-milk text-left text-[13px] text-ink/70">
            <th className="px-4 py-2 font-semibold">{first}</th>
            <th className="px-4 py-2 text-right font-semibold">Finished</th>
            <th className="px-4 py-2 text-right font-semibold">Paid orders</th>
            <th className="px-4 py-2 text-right font-semibold">Paid / finished</th>
            <th className="px-4 py-2 text-right font-semibold">Net sales</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && empty && (
            <tr>
              <td colSpan={5} className="border-t border-ink/10 px-4 py-6 text-center text-ink/65">{empty}</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.key}>
              <td className={plainTd}>{r.label}</td>
              <td className={cn(plainTd, 'text-right')}>{int(r.completes)}</td>
              <td className={cn(plainTd, 'text-right')}>{int(r.orders)}</td>
              <td className={cn(plainTd, 'text-right')}>{rate(r.orders, r.completes)}</td>
              <td className={cn(plainTd, 'text-right')}>{money(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarketingView(p: Props) {
  const router = useRouter();
  const [custom, setCustom] = useState(p.preset === 'custom');
  const [from, setFrom] = useState(p.range.from);
  const [to, setTo] = useState(p.range.to);
  const go = (q: string) => router.push(`/portal/admin/marketing?${q}`);
  const t = p.data.totals;
  const b = p.before;

  const kpis: [string, string, number, number][] = [
    ['Sessions', int(t.sessions), t.sessions, b.sessions],
    ['Started assessment', int(t.starts), t.starts, b.starts],
    ['Finished assessment', int(t.completes), t.completes, b.completes],
    ['Paid orders', int(t.orders), t.orders, b.orders],
    ['Net sales', money(t.revenue), t.revenue, b.revenue],
    ['Conversion rate', rate(t.orders, t.sessions), t.sessions ? t.orders / t.sessions : 0, b.sessions ? b.orders / b.sessions : 0],
  ];

  const funnel = [
    ['Sessions', t.sessions],
    ['Started assessment', t.starts],
    ['Finished assessment', t.completes],
    ['Paid', t.orders],
  ] as const;
  const top = Math.max(1, ...funnel.map(([, n]) => n));

  const exportSources = () =>
    download(`sales-by-source_${p.range.from}_${p.range.to}.csv`, [
      ['Source', 'Medium', 'Sessions', 'Started', 'Finished', 'Paid orders', 'Net sales', 'Profit', 'Conversion %'],
      ...p.data.bySource.map((r) => [r.source, r.medium, r.sessions, r.starts, r.completes, r.orders, (r.revenue / 100).toFixed(2), (r.profit / 100).toFixed(2), r.sessions ? ((r.orders / r.sessions) * 100).toFixed(1) : '']),
    ]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Marketing"
        subtitle="Where visitors come from and which sources become paying patients. Days are New York time."
        actions={
          <button type="button" className={secondaryButton} onClick={exportSources}>
            Export
          </button>
        }
      />

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Date range"
          className={cn(toolbarSelect, 'flex-none')}
          value={custom ? 'custom' : p.preset}
          onChange={(e) => {
            if (e.target.value === 'custom') return setCustom(true);
            setCustom(false);
            go(`range=${e.target.value}`);
          }}
        >
          {PRESETS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
          <option value="custom">Custom range</option>
        </select>
        {custom && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (from && to && from <= to) go(`from=${from}&to=${to}`);
            }}
          >
            <input aria-label="From" type="date" className={cn(fieldInput, 'w-auto')} value={from} max={to || p.today} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-[14px] text-ink/60">to</span>
            <input aria-label="To" type="date" className={cn(fieldInput, 'w-auto')} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            <button type="submit" className={secondaryButton} disabled={!from || !to || from > to}>
              Apply
            </button>
          </form>
        )}
        <p className="basis-full text-[13px] text-ink/65 sm:basis-auto">
          {fmt(p.range.from)} – {fmt(p.range.to)} <span className="text-ink/45">·</span> compared with {fmt(p.previous.from)} – {fmt(p.previous.to)}
        </p>
      </div>

      {!p.data.tracking && (
        <Notice>Visit tracking isn’t set up yet: run supabase/migrations/0029_site_events.sql in Supabase. Orders and assessments still show.</Notice>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([label, value, now, prev]) => (
          <MetricCard key={label} label={label} value={value} hint={<Delta now={now} prev={prev} />} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Funnel */}
        <SectionCard title="Conversion funnel" description="Each step as a share of sessions.">
          <div className="space-y-3">
            {funnel.map(([label, n], i) => (
              <div key={label}>
                <div className="flex items-baseline justify-between text-[14px]">
                  <span className="font-medium text-ink">{label}</span>
                  <span className="tabular-nums text-ink/70">
                    {int(n)} <span className="text-ink/45">· {i === 0 ? '100%' : rate(n, t.sessions)}</span>
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-milk">
                  <div className="h-2.5 rounded-full" style={{ width: `${(n / top) * 100}%`, background: BLUE, minWidth: n ? 4 : 0 }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Sessions over time */}
        <SectionCard title="Sessions and orders by day">
          <DayBars days={p.data.byDay} />
        </SectionCard>
      </div>

      {/* By source */}
      <SectionCard
        title="Sales by traffic source"
        description={
          p.data.untagged > 0
            ? `${p.data.untagged} paid order${p.data.untagged === 1 ? '' : 's'} came from members with no tagged link (before tracking, or typed the address): shown as “untracked”.`
            : 'Paid orders are credited to the first tagged link the member arrived from.'
        }
        flush
      >
        <SourceTable rows={p.data.bySource} first="Source / medium" empty="No visits yet in this range." />
      </SectionCard>

      {/* By campaign */}
      <SectionCard title="Sales by campaign" description="Links with a campaign tag (utm_campaign)." flush>
        <SourceTable rows={p.data.byCampaign} first="Campaign" empty="No tagged campaigns in this range." />
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Landing pages */}
        <SectionCard
          title="Landing pages: visits and sales"
          description="Sessions by first page. Finished and paid are credited to the page of the member’s tagged visit (kept 30 days in their browser)."
          flush
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[14px] tabular-nums">
              <thead>
                <tr className="bg-milk text-left text-[13px] text-ink/70">
                  <th className="px-4 py-2 font-semibold">Page</th>
                  <th className="px-4 py-2 text-right font-semibold">Sessions</th>
                  <th className="px-4 py-2 text-right font-semibold">Finished</th>
                  <th className="px-4 py-2 text-right font-semibold">Paid</th>
                  <th className="px-4 py-2 text-right font-semibold">Net sales</th>
                </tr>
              </thead>
              <tbody>
                {p.data.byPage.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border-t border-ink/10 px-4 py-6 text-center text-ink/65">No visits yet in this range.</td>
                  </tr>
                )}
                {p.data.byPage.map((r) => (
                  <tr key={r.path}>
                    <td className={plainTd}>{r.path}</td>
                    <td className={cn(plainTd, 'text-right')}>{int(r.sessions)}</td>
                    <td className={cn(plainTd, 'text-right')}>{int(r.completes)}</td>
                    <td className={cn(plainTd, 'text-right')}>{int(r.orders)}</td>
                    <td className={cn(plainTd, 'text-right')}>{money(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Assessment drop-off */}
        <SectionCard title="Assessment drop-off" description="How many reached each screen. A big drop means people quit there." flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-[14px] tabular-nums">
              <thead>
                <tr className="bg-milk text-left text-[13px] text-ink/70">
                  <th className="px-4 py-2 font-semibold">Screen</th>
                  <th className="px-4 py-2 text-right font-semibold">Reached</th>
                  <th className="px-4 py-2 text-right font-semibold">Of starts</th>
                </tr>
              </thead>
              <tbody>
                {p.data.steps.length === 0 && (
                  <tr>
                    <td colSpan={3} className="border-t border-ink/10 px-4 py-6 text-center text-ink/65">No assessments started in this range.</td>
                  </tr>
                )}
                {p.data.steps.map((s) => (
                  <tr key={s.step}>
                    <td className={cn(plainTd, 'max-w-[280px] truncate')} title={s.step}>
                      {p.stepLabels[s.step] ?? s.step.replace(/[_:-]+/g, ' ').trim()}
                    </td>
                    <td className={cn(plainTd, 'text-right')}>{int(s.reached)}</td>
                    <td className={cn(plainTd, 'text-right')}>{rate(s.reached, t.starts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* Every category and every landing-page quiz, whatever we add next: nothing here is per-product code. */}
      <SectionCard title="Sales by category" description="Finished assessments by the category they started in; paid orders by what was bought." flush>
        <MoneyTable
          first="Category"
          empty="No assessments or orders in this range."
          rows={p.data.byCategory.map((r) => ({ key: r.category, label: r.category, completes: r.completes, orders: r.orders, revenue: r.revenue }))}
        />
      </SectionCard>

      <SectionCard
        title="Landing page quiz answers"
        description="What people picked in a landing page’s quick questions (e.g. /hair), and how many went on to finish and pay. Any new landing page with a quiz shows up here on its own."
        flush
      >
        {p.data.quiz.length === 0 ? (
          <p className="px-4 py-6 text-center text-[14px] text-ink/65">No quiz answers in this range.</p>
        ) : (
          [...new Set(p.data.quiz.map((r) => `${r.page}\u0000${r.question}`))].map((k) => {
            const [page, question] = k.split('\u0000');
            const rows = p.data.quiz.filter((r) => r.page === page && r.question === question);
            return (
              <div key={k} className="border-t border-ink/10 first:border-t-0">
                <p className="px-4 pt-3 text-[13px] text-ink/60">
                  <span className="font-semibold text-ink">{page}</span> · {question}
                </p>
                <MoneyTable
                  first="Answer"
                  empty=""
                  rows={rows.map((r) => ({ key: r.answer, label: r.answer, completes: r.completes, orders: r.orders, revenue: r.revenue }))}
                />
              </div>
            );
          })
        )}
      </SectionCard>

      <LinkBuilder siteUrl={p.siteUrl} pages={p.pages} saved={p.savedLinks} />

      <SectionCard title="How tracking works">
        <dl className="grid gap-x-8 gap-y-3 text-[14px] leading-relaxed md:grid-cols-2">
          {[
            ['Sessions', 'One per browser visit to our public pages, counted anonymously on our own servers. Portal, sign-in and payment pages aren’t counted.'],
            ['Source', 'From the link’s tags (utm_source / utm_medium / utm_campaign), or Meta/Google ad clicks, or the referring site. No tag = direct.'],
            ['Credit for a sale', 'The first tagged link a member arrived from before their first assessment. Kept 30 days in their browser.'],
            ['Privacy', 'No names, emails or health answers are stored with visits. Nothing here is shared with ad platforms.'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold text-ink">{k}</dt>
              <dd className="text-ink/70">{v}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  );
}

function SourceTable({ rows, first, empty }: { rows: SourceRow[]; first: string; empty: string }) {
  const heads = [first, 'Sessions', 'Started', 'Finished', 'Paid', 'Conv.', 'Net sales', 'Profit'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[14px] tabular-nums">
        <thead>
          <tr className="bg-milk text-left text-[13px] text-ink/70">
            {heads.map((h, i) => (
              <th key={h} className={cn('px-4 py-2 font-semibold', i > 0 && 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={heads.length} className="border-t border-ink/10 px-4 py-6 text-center text-ink/65">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.key}>
              <td className={plainTd}>{r.key}</td>
              <td className={cn(plainTd, 'text-right')}>{int(r.sessions)}</td>
              <td className={cn(plainTd, 'text-right')}>{int(r.starts)}</td>
              <td className={cn(plainTd, 'text-right')}>{int(r.completes)}</td>
              <td className={cn(plainTd, 'text-right')}>{int(r.orders)}</td>
              <td className={cn(plainTd, 'text-right')}>{rate(r.orders, r.sessions)}</td>
              <td className={cn(plainTd, 'text-right')}>{money(r.revenue)}</td>
              <td className={cn(plainTd, 'text-right')}>{money(r.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DayBars({ days }: { days: MarketingData['byDay'] }) {
  const max = Math.max(1, ...days.map((d) => d.sessions));
  if (!days.some((d) => d.sessions || d.orders)) return <p className="py-6 text-center text-[14px] text-ink/65">No visits yet in this range.</p>;
  return (
    <div>
      <div className="flex h-36 items-end gap-[2px]" role="img" aria-label="Sessions per day">
        {days.map((d) => (
          <div
            key={d.day}
            title={`${d.day}: ${d.sessions} sessions, ${d.orders} orders`}
            className="relative flex-1 rounded-t-[2px]"
            style={{ height: `${(d.sessions / max) * 100}%`, minHeight: d.sessions ? 2 : 0, background: BLUE, opacity: 0.85 }}
          >
            {d.orders > 0 && <span className="absolute -top-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#eb6834]" />}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[13px] text-ink/60">
        <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: BLUE }} /> Sessions
        <span className="ml-4 mr-1 inline-block h-2 w-2 rounded-full bg-[#eb6834]" /> Day with a paid order
      </p>
    </div>
  );
}

const OTHER = '__other';

function LinkBuilder({ siteUrl, pages, saved }: { siteUrl: string; pages: NamedPage[]; saved: SavedLink[] }) {
  const [preset, setPreset] = useState(0);
  const [dest, setDest] = useState(LINK_PRESETS[0].page);
  const [other, setOther] = useState(false);
  const [source, setSource] = useState(LINK_PRESETS[0].source);
  const [medium, setMedium] = useState(LINK_PRESETS[0].medium);
  const [campaign, setCampaign] = useState(LINK_PRESETS[0].campaign);
  const [copied, setCopied] = useState<string | null>(null);
  const [links, setLinks] = useState(saved);
  const [name, setName] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const q = new URLSearchParams();
  if (slug(source)) q.set('utm_source', slug(source));
  if (slug(medium)) q.set('utm_medium', slug(medium));
  if (slug(campaign)) q.set('utm_campaign', slug(campaign));
  // Whatever was picked, typed or pasted, as a path on our site.
  const path = `/${dest.trim().replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, '').split(/[?#]/)[0]}`;
  const url = `${siteUrl.replace(/\/$/, '')}${path}${q.toString() ? `?${q}` : ''}`;
  const known = pages.some((pg) => pg.path === dest);
  const pageName = pages.find((pg) => pg.path === path)?.label ?? path;

  const copy = (text: string, key: string) =>
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  const save = () =>
    start(async () => {
      const res = await saveLinkAction({ name: name || `${LINK_PRESETS[preset].label} · ${pageName}`, url });
      setNote({ ok: res.ok, text: res.message });
      if (res.ok && res.links) {
        setLinks(res.links);
        setName('');
      }
    });
  const remove = (id: string) =>
    start(async () => {
      if (!window.confirm('Delete this saved link? Links already sent keep working.')) return;
      const res = await deleteLinkAction(id);
      if (res.ok && res.links) setLinks(res.links);
      else setNote({ ok: false, text: res.message });
    });

  return (
    <SectionCard
      title="Link builder"
      description="Make a tagged link for an email, text, ad or post, so its visits and sales show up above under its own name. Save it to reuse later."
    >
      <div className="grid gap-3 md:grid-cols-5">
        <label className="md:col-span-1">
          <span className={fieldLabel}>Where it’s posted</span>
          <select
            className={fieldInput}
            value={preset}
            onChange={(e) => {
              const i = Number(e.target.value);
              setPreset(i);
              setSource(LINK_PRESETS[i].source);
              setMedium(LINK_PRESETS[i].medium);
              setCampaign(LINK_PRESETS[i].campaign);
              setDest(LINK_PRESETS[i].page);
              setOther(false);
            }}
          >
            {LINK_PRESETS.map((l, i) => (
              <option key={l.label} value={i}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={fieldLabel}>Page</span>
          <select
            className={fieldInput}
            value={other || !known ? OTHER : dest}
            onChange={(e) => {
              if (e.target.value === OTHER) {
                setOther(true);
                setDest('');
              } else {
                setOther(false);
                setDest(e.target.value);
              }
            }}
          >
            {pages.map((pg) => (
              <option key={pg.path} value={pg.path}>
                {pg.label}
              </option>
            ))}
            <option value={OTHER}>Other page…</option>
          </select>
          {(other || !known) && (
            <input className={cn(fieldInput, 'mt-2')} value={dest} onChange={(e) => setDest(e.target.value)} placeholder="/treatments/hair" autoFocus />
          )}
        </label>
        <label>
          <span className={fieldLabel}>Source</span>
          <input className={fieldInput} value={source} onChange={(e) => setSource(e.target.value)} placeholder="eternalhair" />
        </label>
        <label>
          <span className={fieldLabel}>Medium</span>
          <input className={fieldInput} value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="email" />
        </label>
        <label>
          <span className={fieldLabel}>Campaign</span>
          <input className={fieldInput} value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="hair-launch" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 break-all rounded-thumb bg-milk px-3 py-2 text-[13px] text-ink">{url}</code>
        <button type="button" className={secondaryButton} onClick={() => copy(url, 'builder')}>
          {copied === 'builder' ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className={cn(fieldInput, 'max-w-sm')}
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Name, e.g. ${LINK_PRESETS[preset].label} · ${pageName}`}
          aria-label="Name for this link"
        />
        <button type="button" className={secondaryButton} disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save link'}
        </button>
        {note && <span className={cn('text-[13px]', note.ok ? 'text-emerald-700' : 'text-red-700')}>{note.text}</span>}
      </div>
      <p className="mt-2 text-[13px] text-ink/60">
        For Meta ads, Mo can instead paste this into Ads Manager → URL parameters:{' '}
        <code className="rounded bg-milk px-1">utm_source=meta&amp;utm_medium=paid&amp;utm_campaign={'{{campaign.name}}'}</code>
      </p>

      <div className="mt-5 border-t border-ink/10 pt-4">
        <h3 className="text-[14px] font-semibold text-ink">Saved links</h3>
        {links.length === 0 ? (
          <p className="mt-1 text-[13px] text-ink/60">None yet. Build a link above, name it and press Save link.</p>
        ) : (
          <ul className="mt-2 divide-y divide-ink/10">
            {links.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{l.name}</span>
                  <span className="block break-all text-[12px] text-ink/55">{l.url}</span>
                </span>
                <button type="button" className={secondaryButton} onClick={() => copy(l.url, l.id)}>
                  {copied === l.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(l.id)}
                  aria-label={`Delete ${l.name}`}
                  className="inline-flex h-8 items-center rounded-thumb px-2 text-[13px] font-medium text-ink/55 hover:bg-red-50 hover:text-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}

function Delta({ now, prev }: { now: number; prev: number }) {
  const d = change(now, prev);
  if (d === null) return <span className="text-ink/55">— vs previous</span>;
  const flat = Math.abs(d) < 0.0005;
  return (
    <span className={flat ? 'text-ink/60' : d > 0 ? 'text-emerald-700' : 'text-red-700'}>
      {flat ? '0%' : `${d > 0 ? '↑' : '↓'} ${Math.abs(d * 100).toFixed(0)}%`}
      <span className="text-ink/55"> vs previous</span>
    </span>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">{children}</p>;
}

function download(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
