'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Printer,
  Check,
  CheckCircle2,
  Clapperboard,
  Copy,
  Images,
  KeyRound,
  LayoutGrid,
  Link2,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Settings,
  Sun,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Wordmark } from '@/components/nav/Wordmark';
import { useConfirm } from '@/components/ui/useConfirm';
import {
  addStudioUser,
  importStudio,
  issueStudioCode,
  lockStudio,
  saveReportNote,
  saveStudioGrid,
  saveStudioItem,
  saveStudioSettings,
  updateStudioUser,
} from '@/lib/studio-actions';
import {
  BRAND_LABEL,
  FLOW,
  ROLE_LABEL,
  STATUS_LABEL,
  canAssign,
  finishedStatus,
  isFinished,
  presence,
  todayET,
  type Brand,
  type GridBrand,
  type GridPage,
  type GuideSection,
  type Role,
  type StudioData,
  type StudioFile,
  type StudioEvent,
  type StudioItem,
  type StudioMiss,
  type StudioSettings,
  type StudioUser,
} from '@/lib/studio-types';
import { FileTile, ItemSheet, blankItem, uploadFiles } from './ItemSheet';
import { BRAND_COLOR, BarButton, BrandDot, BrandTag, byDay, Chips, dayTitle, Columns, Empty, Group, ItemRow, LargeTitle, Linkified, Segmented, Sheet, SheetBar, StatusPill, dayLabel, type RowUpdate } from './ui';

type Tab = 'today' | 'tasks' | 'content' | 'grid' | 'inspo' | 'guide' | 'activity' | 'report';
type BrandFilter = 'all' | Brand;

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'content', label: 'Content', icon: Clapperboard },
  { id: 'grid', label: 'Grid', icon: LayoutGrid },
  { id: 'inspo', label: 'Inspo', icon: Images },
  { id: 'guide', label: 'Guide', icon: BookOpen },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'report', label: 'Report', icon: ClipboardCheck },
];

const MANAGER_TABS: Tab[] = ['activity', 'report'];

const BRAND_CHIPS: { value: BrandFilter; label: string; dot?: Brand }[] = [
  { value: 'all', label: 'All' },
  { value: 'longevity', label: 'Longevity', dot: 'longevity' },
  { value: 'hair', label: 'Hair & Esthetics', dot: 'hair' },
  { value: 'both', label: 'Collab', dot: 'both' },
];

const byDue = (a: StudioItem, b: StudioItem) =>
  Number(b.flagged) - Number(a.flagged) || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.createdAt.localeCompare(b.createdAt);

const addDays = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

/** Keep a file's read link across refreshes, so photos are not downloaded again every poll. */
function merge(prev: StudioItem[], next: StudioItem[]): StudioItem[] {
  const urls = new Map(prev.flatMap((i) => i.files.map((f) => [f.path, f.url] as const)));
  return next.map((i) => ({ ...i, files: i.files.map((f) => ({ ...f, url: urls.get(f.path) ?? f.url })) }));
}

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function Studio({ initial, me }: { initial: StudioData; me: StudioUser }) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const [settings, setSettings] = useState(initial.settings);
  const [tab, setTab] = useState<Tab>('today');
  const [sheet, setSheet] = useState<{ item: StudioItem; isNew: boolean } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Clicking outside or pressing Escape asks the open item to save first.
  const closer = useRef<(() => void) | null>(null);
  const manager = canAssign(me.role);
  const tabs = manager ? TABS : TABS.filter((t) => !MANAGER_TABS.includes(t.id));
  const crew = settings.users.find((u) => u.active && u.role === 'member')?.name ?? '';

  useEffect(() => {
    setItems((prev) => merge(prev, initial.items));
    setSettings(initial.settings);
  }, [initial]);

  // Stay in step with everyone else: refresh when the app comes back and every 30 s while open.
  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && router.refresh();
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router]);

  useEffect(() => {
    try {
      const t = localStorage.getItem('studio-tab') as Tab | null;
      if (t && TABS.some((x) => x.id === t) && (!MANAGER_TABS.includes(t) || canAssign(me.role))) setTab(t);
    } catch {}
  }, [me.role]);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0 });
    try {
      localStorage.setItem('studio-tab', t);
    } catch {}
  };

  const upsert = useCallback((item: StudioItem) => {
    setItems((list) => (list.some((i) => i.id === item.id) ? list.map((i) => (i.id === item.id ? item : i)) : [item, ...list]));
  }, []);

  const open = (item: StudioItem) => setSheet({ item, isNew: false });
  const create = (preset: Partial<StudioItem> = {}) => setSheet({ item: blankItem(me.name, preset), isNew: true });

  const toggle = async (item: StudioItem) => {
    const done = isFinished(item.status);
    const next = { ...item, status: done ? FLOW[item.kind][0] : finishedStatus(item.kind), completedOn: done ? null : todayET() };
    upsert(next);
    const r = await saveStudioItem(next);
    upsert(r.ok ? r.data : item);
  };

  // For Adam and Mo: under each task, what the other person did since you last touched it.
  const updateOf = (i: StudioItem): RowUpdate => {
    if (!manager || i.kind === 'inspo') return null;
    const evs = initial.activity.filter((e) => e.itemId === i.id);
    const mine = evs.findIndex((e) => e.by === me.name);
    const fresh = (mine === -1 ? evs : evs.slice(0, mine)).filter((e) => e.by !== me.name);
    if (fresh.length) {
      const at = fresh[0].at;
      return {
        by: [...new Set(fresh.map((e) => e.by))].join(' & '),
        when: `${dayLabel(todayET(new Date(at)))} ${timeET(at)}`,
        summary: rollUp(fresh),
        note: fresh.find((e) => /^left a note/.test(e.action))?.detail,
      };
    }
    return i.assignee && i.assignee !== me.name && !isFinished(i.status) ? { none: i.assignee } : null;
  };

  const row = (i: StudioItem, opts: { check?: boolean; status?: boolean } = {}) => (
    <ItemRow key={i.id} item={i} onOpen={() => open(i)} onToggle={opts.check === false ? undefined : () => toggle(i)} showStatus={opts.status} update={updateOf(i)} />
  );

  // Adam and Mo issue tasks; content adds their own posts, stories and inspo.
  const newPost = () => create({ kind: 'post', platforms: ['Instagram', 'TikTok'], assignee: manager ? crew : me.name });
  const addFor: Partial<Record<Tab, { label: string; run: () => void }>> = {
    today: manager ? { label: 'New task', run: () => create({ kind: 'task', assignee: crew }) } : { label: 'New post idea', run: newPost },
    tasks: manager ? { label: 'New task', run: () => create({ kind: 'task', assignee: crew }) } : undefined,
    content: { label: manager ? 'New post' : 'New post idea', run: newPost },
    inspo: { label: 'New inspo', run: () => create({ kind: 'inspo' }) },
  };
  const add = addFor[tab];

  // What each person sees first: content sees their own work; Adam and Mo see everything.
  const visible = manager ? items : items.filter((i) => i.kind === 'inspo' || !i.assignee || i.assignee === me.name || i.createdBy === me.name);
  const badge = (t: Tab) => {
    if (t !== 'today') return 0;
    return visible.filter((i) => i.status === (manager ? 'review' : 'changes')).length;
  };

  return (
    <div className="lg:flex">
      {/* Sidebar (computer) */}
      <aside className="sticky top-0 hidden h-dvh print:!hidden w-[260px] shrink-0 flex-col border-r border-black/[0.06] bg-white/60 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2 px-2">
          <Wordmark href={null} className="text-[18px]" />
          <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-butter">Studio</span>
        </div>
        {add && (
          <button type="button" onClick={add.run} className="mt-6 flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-ink text-[15px] font-semibold text-white hover:bg-ink/90">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> {add.label}
          </button>
        )}
        <nav aria-label="Studio" className="mt-6 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const on = tab === id;
            const n = badge(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={on ? 'page' : undefined}
                className={cn('flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[15px] font-semibold transition-colors', on ? 'bg-butter text-ink' : 'text-ink/60 hover:bg-black/[0.04] hover:text-ink')}
              >
                <Icon className="h-[20px] w-[20px]" strokeWidth={on ? 2.4 : 1.9} />
                {label}
                {n > 0 && <span className="ml-auto grid h-[20px] min-w-[20px] place-items-center rounded-full bg-red-500 px-1.5 text-[12px] text-white">{n}</span>}
              </button>
            );
          })}
        </nav>
        <button type="button" onClick={() => setSettingsOpen(true)} className="mt-auto flex items-center gap-3 rounded-[12px] p-2 text-left hover:bg-black/[0.04]">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-[14px] font-bold text-butter">{initials(me.name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{me.name}</span>
            <span className="block text-[13px] text-ink/45">{ROLE_LABEL[me.role]}</span>
          </span>
          <Settings className="h-[18px] w-[18px] text-ink/40" />
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Toolbar (phone) */}
        <div className="sticky top-0 z-30 flex h-[52px] items-center justify-between bg-milk/85 print:hidden px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl [box-sizing:content-box] lg:hidden">
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" className="grid h-11 w-11 place-items-center rounded-full text-ink/70">
            <Settings className="h-[22px] w-[22px]" />
          </button>
          <span className="flex items-center gap-2 text-ink">
            <Wordmark href={null} className="text-[15px]" />
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-butter">Studio</span>
          </span>
          {add ? (
            <button type="button" onClick={add.run} aria-label={add.label} className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white shadow-[0_6px_16px_-8px_rgba(17,17,17,0.6)]">
              <Plus className="h-[22px] w-[22px]" strokeWidth={2.5} />
            </button>
          ) : (
            <span className="w-11" />
          )}
        </div>

        <main className="mx-auto max-w-[720px] pb-[calc(env(safe-area-inset-bottom)+96px)] lg:max-w-[1200px] lg:px-10 lg:pb-16">
          {!initial.live && (
            <p className="mx-4 mb-2 rounded-[12px] bg-butter-soft px-4 py-2 text-[13px] text-ink/70 lg:mx-0 lg:mt-6">Local copy: changes are not saved to the live studio.</p>
          )}
          {tab === 'today' && <TodayTab items={visible} me={me} settings={settings} row={row} create={create} go={go} />}
          {tab === 'tasks' && <TasksTab items={visible} people={settings.people} crew={crew} me={me} row={row} />}
          {tab === 'content' && <ContentTab items={visible} row={row} />}
          {tab === 'grid' && (
            <GridTab items={items} grid={settings.grid} open={open} create={create} onSaved={(b, g) => setSettings((s) => ({ ...s, grid: { ...s.grid, [b]: g } }))} />
          )}
          {tab === 'inspo' && <InspoTab items={items} me={me} open={open} upsert={upsert} />}
          {tab === 'guide' && <GuideTab settings={settings} canEdit={manager} onSaved={setSettings} />}
          {tab === 'report' && manager && (
            <ReportTab
              items={items}
              misses={initial.misses}
              events={initial.activity}
              notes={initial.notes}
              users={settings.users.filter((u) => u.active && u.role === 'member')}
              targets={settings.targets}
              open={(id) => {
                const i = items.find((x) => x.id === id);
                if (i) open(i);
              }}
            />
          )}
          {tab === 'activity' && manager && (
            <ActivityTab
              events={initial.activity}
              items={items}
              users={settings.users.filter((u) => u.active)}
              open={(id) => {
                const i = items.find((x) => x.id === id);
                if (i) open(i);
              }}
            />
          )}
        </main>
      </div>

      {/* Tab bar (phone) */}
      <nav aria-label="Studio" className="fixed inset-x-0 bottom-0 z-40 print:hidden border-t border-black/[0.08] bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[720px]">
          {tabs.map(({ id, label, icon: Icon }) => {
            const on = tab === id;
            const n = badge(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={on ? 'page' : undefined}
                className={cn('relative flex h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold', on ? 'text-ink' : 'text-ink/35')}
              >
                <Icon className="h-[24px] w-[24px]" strokeWidth={on ? 2.4 : 1.8} />
                {label}
                {n > 0 && <span className="absolute left-1/2 top-1.5 ml-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[11px] text-white">{n}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={!!sheet} onClose={() => (closer.current ? closer.current() : setSheet(null))} label="Item">
        {sheet && (
          <ItemSheet
            key={sheet.item.id}
            start={sheet.item}
            isNew={sheet.isNew}
            me={me}
            people={settings.people}
            onClose={() => {
              closer.current = null;
              setSheet(null);
            }}
            bindClose={(fn) => (closer.current = fn)}
            onSaved={upsert}
            onDeleted={(id) => setItems((l) => l.filter((i) => i.id !== id))}
          />
        )}
      </Sheet>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} label="Settings">
        <SettingsSheet settings={settings} me={me} onClose={() => setSettingsOpen(false)} onSettings={setSettings} onImported={() => router.refresh()} />
      </Sheet>
    </div>
  );
}

/* ---------------- Today ---------------- */

type RowFn = (i: StudioItem, opts?: { check?: boolean; status?: boolean }) => ReactNode;

function Ring({ value, goal, r, color }: { value: number; goal: number; r: number; color: string }) {
  const c = 2 * Math.PI * r;
  const p = Math.min(1, goal ? value / goal : 0);
  return (
    <>
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth="13" />
      {p > 0 && (
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)' }}
        />
      )}
    </>
  );
}

function TodayTab({
  items,
  me,
  settings,
  row,
  create,
  go,
}: {
  items: StudioItem[];
  me: StudioUser;
  settings: StudioSettings;
  row: RowFn;
  create: (p?: Partial<StudioItem>) => void;
  go: (t: Tab) => void;
}) {
  const manager = canAssign(me.role);
  const today = todayET();
  const work = items.filter((i) => i.kind !== 'inspo');
  const posts = work.filter((i) => i.kind === 'post' && i.completedOn === today).length;
  const stories = work.filter((i) => i.kind === 'story' && i.completedOn === today).length;
  const open = work.filter((i) => !isFinished(i.status));
  const review = open.filter((i) => i.status === 'review').sort(byDue);
  // Content fixes their sent-back work first; Adam and Mo see it by date, with its status showing.
  const fixes = manager ? [] : open.filter((i) => i.status === 'changes').sort(byDue);
  const rest = open.filter((i) => i.status !== 'review' && (manager || i.status !== 'changes'));
  const late = rest.filter((i) => i.due && i.due < today).sort(byDue);
  const due = rest.filter((i) => i.due === today).sort(byDue);
  const week = rest.filter((i) => i.due && i.due > today && i.due <= addDays(today, 7)).sort(byDue);
  const shown = new Set([...late, ...due, ...week].map((i) => i.id));
  const waiting = manager ? open.filter((i) => i.status === 'changes' && !shown.has(i.id)).sort(byDue) : [];
  const finishedToday = work.filter((i) => isFinished(i.status) && i.completedOn === today);
  const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }));
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  const todo = late.length + due.length + fixes.length;

  const reviewGroup = review.length > 0 && (
    <Group title={manager ? 'Needs your review' : 'Waiting on Adam or Mo'} count={review.length} footer={manager ? 'Open one to approve it or ask for changes.' : undefined}>
      {review.map((i) => row(i, { check: false, status: false }))}
    </Group>
  );
  const fixGroup = fixes.length > 0 && (
    <Group title="Fix these first" count={fixes.length} footer="Open one to see exactly what to change.">
      {fixes.map((i) => row(i, { check: false, status: false }))}
    </Group>
  );

  return (
    <>
      <LargeTitle
        eyebrow={date}
        title={`${hello}, ${me.name}`}
        sub={
          manager
            ? 'Where the team stands today.'
            : todo
              ? `You have ${todo} thing${todo > 1 ? 's' : ''} to do today. Start at the top. When one is finished, tap the circle or open it and send it for review.`
              : 'Nothing due today. Work ahead on the next 7 days.'
        }
      />

      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-8">
        <section className="px-4 pb-6 lg:sticky lg:top-8 lg:px-0">
          <button
            type="button"
            disabled={!posts && !stories}
            onClick={() => document.getElementById('done-today')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="flex w-full items-center gap-5 rounded-[22px] bg-white p-5 text-left transition-shadow enabled:hover:shadow-[0_6px_20px_-12px_rgba(17,17,17,0.35)] lg:flex-col lg:items-stretch lg:text-center"
          >
            <svg viewBox="0 0 120 120" className="h-[112px] w-[112px] shrink-0 lg:mx-auto lg:h-[160px] lg:w-[160px]" role="img" aria-label={`${posts} of ${settings.targets.posts} posts, ${stories} of ${settings.targets.stories} stories posted today`}>
              <Ring value={posts} goal={settings.targets.posts} r={50} color="#E6C54F" />
              <Ring value={stories} goal={settings.targets.stories} r={34} color="#111111" />
            </svg>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/40">Posted today</p>
              <p className="text-[24px] font-bold leading-none tracking-[-0.02em] text-[#C9A82E]">
                {posts}
                <span className="text-[16px] text-ink/30">/{settings.targets.posts}</span>
                <span className="ml-1.5 text-[14px] font-semibold text-ink/50">posts</span>
              </p>
              <p className="text-[24px] font-bold leading-none tracking-[-0.02em]">
                {stories}
                <span className="text-[16px] text-ink/30">/{settings.targets.stories}</span>
                <span className="ml-1.5 text-[14px] font-semibold text-ink/50">stories</span>
              </p>
              {(posts > 0 || stories > 0) && <p className="text-[13px] font-semibold text-ink/45 underline decoration-butter-deep decoration-2 underline-offset-2">See what was posted</p>}
            </div>
          </button>
          {manager ? (
            <TeamProgress items={items} users={settings.users} />
          ) : (
          <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => create({ kind: 'post', status: 'posted', due: today, completedOn: today, assignee: me.name, platforms: ['Instagram', 'TikTok'] })}
              className="flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-white text-[15px] font-semibold hover:bg-white/70"
            >
              <Plus className="h-4 w-4" /> Log a post
            </button>
            <button
              type="button"
              onClick={() => create({ kind: 'story', status: 'posted', due: today, completedOn: today, assignee: me.name, platforms: ['Instagram'] })}
              className="flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-white text-[15px] font-semibold hover:bg-white/70"
            >
              <Plus className="h-4 w-4" /> Log a story
            </button>
          </div>
          <p className="px-2 pt-2 text-[13px] leading-snug text-ink/40">Posted something? Log it so it counts toward today’s goal.</p>
          </>
          )}
        </section>

        <div>
          {manager ? reviewGroup : fixGroup}
          {late.length > 0 && (
            <Group title="Late" count={late.length}>
              {late.map((i) => row(i))}
            </Group>
          )}
          <Group title={dayTitle(today, today)} count={due.length}>
            {due.length ? due.map((i) => row(i)) : <Empty>Nothing else due today.</Empty>}
          </Group>
          {!manager && reviewGroup}
          {byDay(week, today, addDays(today, 7))
            .filter((g) => g.items.length)
            .map((g) => (
              <Group key={g.title} title={g.title} count={g.items.length}>
                {g.items.map((i) => row(i))}
              </Group>
            ))}
          {waiting.length > 0 && (
            <Group title="Sent back, due later" count={waiting.length}>
              {waiting.map((i) => row(i))}
            </Group>
          )}
          {finishedToday.length > 0 && (
            <div id="done-today" className="scroll-mt-20">
              <Group title="Done today" count={finishedToday.length}>
                {finishedToday.map((i) => row(i))}
              </Group>
            </div>
          )}
          <div className="px-4 pb-4 lg:px-0">
            <button type="button" onClick={() => go('tasks')} className="h-11 w-full rounded-[12px] text-[15px] font-semibold text-ink/50 hover:bg-black/[0.03]">
              See every task
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** How each content person is doing, at a glance. */
function TeamProgress({ items, users }: { items: StudioItem[]; users: StudioUser[] }) {
  const today = todayET();
  const weekAgo = addDays(today, -6);
  const crew = users.filter((u) => u.active && u.role === 'member');
  if (!crew.length) return null;
  return (
    <div className="mt-3 space-y-3">
      {crew.map((u) => {
        const theirs = items.filter((i) => i.kind !== 'inspo' && i.assignee === u.name);
        const open = theirs.filter((i) => !isFinished(i.status));
        const stats = [
          { n: open.filter((i) => i.due && i.due < today).length, label: 'late', tone: 'text-red-600' },
          { n: open.filter((i) => i.due === today).length, label: 'due today', tone: '' },
          { n: open.filter((i) => i.status === 'review').length, label: 'for you to review', tone: 'text-[#C9A82E]' },
          { n: theirs.filter((i) => isFinished(i.status) && (i.completedOn ?? '') >= weekAgo).length, label: 'done this week', tone: 'text-emerald-700' },
        ];
        return (
          <div key={u.id} className="rounded-[18px] bg-white p-4 text-left">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[13px] font-bold text-butter">{initials(u.name)}</span>
              <div>
                <p className="text-[16px] font-semibold">{u.name}</p>
                <p className={cn('text-[12px]', presence(u, today).today ? 'text-emerald-700' : 'text-orange-600')}>{presence(u, today).text}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {stats.map((s) => (
                <div key={s.label} className="rounded-[10px] bg-black/[0.03] px-3 py-2">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className={cn('text-[20px] font-bold leading-none', s.n ? s.tone : 'text-ink/25')}>{s.n}</dd>
                  <p className="mt-1 text-[12px] text-ink/50">{s.label}</p>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Tasks ---------------- */

function TasksTab({ items, people, crew, me, row }: { items: StudioItem[]; people: string[]; crew: string; me: StudioUser; row: RowFn }) {
  const manager = canAssign(me.role);
  const [view, setView] = useState<'open' | 'done'>('open');
  // Adam and Mo land on the content person's list: what Jacob has to do, day by day.
  const [who, setWho] = useState<string>(canAssign(me.role) && crew ? crew : 'all');
  const today = todayET();
  const [brand, setBrand] = useState<BrandFilter>('all');
  const mine = items.filter((i) => i.kind !== 'inspo' && (who === 'all' || i.assignee === who) && (brand === 'all' || i.brand === brand));
  const list = mine;

  const groups = useMemo(() => {
    if (view === 'done') {
      // Everything finished, tasks and posts alike, newest first.
      const done = mine.filter((i) => isFinished(i.status)).sort((a, b) => (b.completedOn ?? '').localeCompare(a.completedOn ?? ''));
      return [...new Set(done.map((i) => i.completedOn ?? ''))].map((d) => ({
        title: d ? dayLabel(d, today) : 'Earlier',
        items: done.filter((i) => (i.completedOn ?? '') === d),
      }));
    }
    return byDay(list.filter((i) => !isFinished(i.status)).sort(byDue), today);
  }, [list, mine, view, today]);

  return (
    <>
      <LargeTitle title="Tasks" sub={manager ? 'All work you and Mo have assigned (tasks, posts, stories, shoots), by when it’s due.' : 'Everything assigned to you, by when it’s due. Tap one to see exactly what to do.'} />
      <div className="space-y-3 px-4 pb-5 lg:flex lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-3 lg:space-y-0 lg:px-0">
        <Segmented className="lg:w-[260px]" value={view} onChange={setView} options={[{ value: 'open', label: 'To do' }, { value: 'done', label: 'Done (all work)' }]} />
        {manager && <Chips value={who} onChange={setWho} options={[{ value: 'all', label: 'Everyone' }, ...people.map((p) => ({ value: p, label: p }))]} />}
        <Chips value={brand} onChange={setBrand} options={BRAND_CHIPS} />
      </div>
      {groups.every((g) => !g.items.length) && (
        <Group>
          <Empty>{view === 'open' ? (manager ? 'All clear. Use New task to assign one.' : 'All clear. Nothing assigned right now.') : 'Nothing finished yet.'}</Empty>
        </Group>
      )}
      <Columns>
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <Group key={g.title} title={g.title} count={g.items.length}>
              {g.items.map((i) => row(i))}
            </Group>
          ))}
      </Columns>
    </>
  );
}

/* ---------------- Content ---------------- */

function ContentTab({ items, row }: { items: StudioItem[]; row: RowFn }) {
  const [view, setView] = useState<'calendar' | 'pipeline' | 'posted'>('calendar');
  const [brand, setBrand] = useState<BrandFilter>('all');
  const today = todayET();
  const list = items.filter((i) => (i.kind === 'post' || i.kind === 'story') && (brand === 'all' || i.brand === brand));
  const open = list.filter((i) => !isFinished(i.status));

  let groups: { title: string; items: StudioItem[] }[];
  if (view === 'posted') {
    const posted = list.filter((i) => isFinished(i.status)).sort((a, b) => (b.completedOn ?? '').localeCompare(a.completedOn ?? ''));
    const days = [...new Set(posted.map((i) => i.completedOn ?? ''))];
    groups = days.map((d) => ({ title: d ? dayLabel(d, today) : 'Earlier', items: posted.filter((i) => (i.completedOn ?? '') === d) }));
  } else if (view === 'pipeline') {
    groups = FLOW.post.filter((s) => s !== 'posted').map((s) => ({ title: STATUS_LABEL[s], items: open.filter((i) => i.status === s).sort(byDue) }));
  } else {
    const dated = open.filter((i) => i.due).sort(byDue);
    const days = [...new Set(dated.map((i) => i.due!))].sort();
    groups = [
      ...days.map((d) => ({
        title: d < today ? `${dayLabel(d, today)} · late` : `${dayLabel(d, today)}${d > today ? ` · ${new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`,
        items: dated.filter((i) => i.due === d),
      })),
      { title: 'Not scheduled yet', items: open.filter((i) => !i.due).sort(byDue) },
    ];
  }

  return (
    <>
      <LargeTitle title="Content" sub="Every post and story. Calendar shows when each goes up; Pipeline shows how far along it is." />
      <div className="space-y-3 px-4 pb-5 lg:flex lg:items-center lg:gap-4 lg:space-y-0 lg:px-0">
        <Segmented
          className="lg:w-[360px]"
          value={view}
          onChange={setView}
          options={[
            { value: 'calendar', label: 'Calendar' },
            { value: 'pipeline', label: 'Pipeline' },
            { value: 'posted', label: 'Posted' },
          ]}
        />
        <Chips value={brand} onChange={setBrand} options={BRAND_CHIPS} />
      </div>
      {groups.every((g) => !g.items.length) && (
        <Group>
          <Empty>No content here yet.</Empty>
        </Group>
      )}
      <Columns>
        {groups
          .filter((g) => g.items.length)
          .map((g) => (
            <Group key={g.title} title={g.title} count={g.items.length}>
              {g.items.map((i) => row(i, { status: view !== 'pipeline' }))}
            </Group>
          ))}
      </Columns>
    </>
  );
}

/* ---------------- Inspo ---------------- */

/* ---------------- Grid ---------------- */


function GridTile({ file, alt }: { file?: StudioFile; alt: string }) {
  if (file?.url && file.type.startsWith('video/'))
    return <video src={`${file.url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
  if (file?.url)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={file.url} alt={alt} className="h-full w-full object-cover" />;
  return <span className="grid h-full w-full place-items-center bg-black/[0.06] p-2 text-center text-[12px] font-semibold leading-tight text-ink/50">{alt || 'No image yet'}</span>;
}

/*
 * How each Instagram page will look: planned posts on top (latest post date first),
 * then posts marked posted here, then screenshots of what was already live.
 * ponytail: order comes from post dates; live screenshots reorder with arrows. Drag-and-drop if that gets tedious.
 */
function GridTab({
  items,
  grid,
  open,
  create,
  onSaved,
}: {
  items: StudioItem[];
  grid: StudioSettings['grid'];
  open: (i: StudioItem) => void;
  create: (preset: Partial<StudioItem>) => void;
  onSaved: (b: GridBrand, g: GridPage) => void;
}) {
  const [brand, setBrand] = useState<GridBrand>('longevity');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [handle, setHandle] = useState(grid[brand].handle);
  const input = useRef<HTMLInputElement>(null);
  const page = grid[brand];
  useEffect(() => setHandle(grid[brand].handle), [brand, grid]);

  const posts = items.filter((i) => i.kind === 'post' && (i.brand === brand || i.brand === 'both'));
  const media = (i: StudioItem) => i.files.find((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
  const planned = posts.filter((i) => !isFinished(i.status)).sort((a, b) => (b.due ?? '9999').localeCompare(a.due ?? '9999'));
  const posted = posts.filter((i) => isFinished(i.status)).sort((a, b) => (b.completedOn ?? '').localeCompare(a.completedOn ?? ''));

  const save = async (next: GridPage) => {
    setError(null);
    onSaved(brand, next);
    const r = await saveStudioGrid(brand, next);
    if (!r.ok) setError(r.error);
  };

  const addLive = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(files.length);
    const { files: up, error: e } = await uploadFiles(`grid-${brand}`, files);
    setBusy(0);
    if (e) setError(e);
    if (up.length) await save({ ...page, live: [...page.live, ...up] });
  };
  const move = (n: number, by: number) => {
    const live = [...page.live];
    const [f] = live.splice(n, 1);
    live.splice(Math.max(0, Math.min(live.length, n + by)), 0, f);
    save({ ...page, live });
  };

  const badge = 'absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none shadow-sm';
  return (
    <>
      <LargeTitle title="Grid" sub="How each Instagram page will look. Planned posts sit on top with the day they go up." />
      <div className="flex flex-wrap items-center gap-3 px-4 pb-5 lg:px-0">
        <Segmented
          value={brand}
          onChange={(b) => (setBrand(b), setEditing(false))}
          options={[
            { value: 'longevity', label: 'Longevity' },
            { value: 'hair', label: 'Hair & Esthetics' },
          ]}
          className="w-[280px]"
        />
      </div>

      <div className="mx-4 max-w-[560px] rounded-[18px] bg-white pb-1 lg:mx-0">
        {/* Profile header */}
        <div className="flex items-center gap-4 px-4 py-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-[22px] font-bold" style={{ background: BRAND_COLOR[brand] }}>
            {brand === 'longevity' ? 'EL' : 'EH'}
          </span>
          <div className="min-w-0 flex-1">
            <label className="flex items-center text-[17px] font-semibold">
              @
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/^@/, ''))}
                onBlur={() => handle.trim() !== page.handle && save({ ...page, handle: handle.trim() })}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                placeholder="username"
                aria-label="Instagram username"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink/25"
              />
            </label>
            <p className="text-[13px] text-ink/50">
              {posted.length + page.live.length} posted · {planned.length} planned
            </p>
            {page.handle && (
              <a href={`https://www.instagram.com/${page.handle}/`} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold underline decoration-butter-deep decoration-2 underline-offset-2">
                Open on Instagram
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-3">
          <button type="button" onClick={() => create({ kind: 'post', brand })} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-[10px] bg-butter text-[14px] font-semibold">
            <Plus className="h-4 w-4" /> Plan a post
          </button>
          <button type="button" onClick={() => input.current?.click()} disabled={busy > 0} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-[10px] bg-black/[0.06] text-[14px] font-semibold disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {busy ? `Uploading ${busy}…` : 'Add live posts'}
          </button>
          {page.live.length > 0 && (
            <button type="button" onClick={() => setEditing((v) => !v)} className={cn('h-9 rounded-[10px] px-3 text-[14px] font-semibold', editing ? 'bg-ink text-white' : 'bg-black/[0.06]')}>
              {editing ? 'Done' : 'Arrange'}
            </button>
          )}
          <input ref={input} type="file" multiple accept="image/*,video/*" hidden onChange={(e) => (addLive(e.target.files), (e.target.value = ''))} />
        </div>
        {error && <p role="alert" className="mx-4 mb-3 rounded-[10px] bg-red-50 px-3 py-2 text-[14px] text-red-700">{error}</p>}

        {/* The grid: newest top-left, 3 across, Instagram's 3:4 tiles */}
        <div className="grid grid-cols-3 gap-[2px]">
          {[...planned, ...posted].map((i) => (
            <button key={i.id} type="button" onClick={() => open(i)} className={cn('relative aspect-[3/4] overflow-hidden bg-black/[0.04]', !isFinished(i.status) && 'outline-dashed outline-2 -outline-offset-2 outline-butter-deep')}>
              <GridTile file={media(i)} alt={i.title} />
              <span className={cn(badge, isFinished(i.status) ? 'bg-white/90 text-ink/70' : 'bg-butter text-ink')}>
                {isFinished(i.status) ? `Posted ${i.completedOn ? shortDay(i.completedOn) : ''}` : i.due ? shortDay(i.due) : 'No date'}
              </span>
              {i.brand === 'both' && <span className={cn(badge, 'left-auto right-1.5 bg-white/90 text-ink/70')}>Collab</span>}
            </button>
          ))}
          {page.live.map((f, n) => (
            <div key={f.path} className="relative aspect-[3/4] overflow-hidden bg-black/[0.04]">
              <GridTile file={f} alt="Live post" />
              {editing && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1">
                  <button type="button" aria-label="Move earlier" onClick={() => move(n, -1)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-[15px] font-bold">‹</button>
                  <button type="button" aria-label="Remove" onClick={() => save({ ...page, live: page.live.filter((x) => x.path !== f.path) })} className="grid h-8 w-8 place-items-center rounded-full bg-white">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                  <button type="button" aria-label="Move later" onClick={() => move(n, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white text-[15px] font-bold">›</button>
                </div>
              )}
            </div>
          ))}
        </div>
        {planned.length + posted.length + page.live.length === 0 && (
          <p className="px-4 py-8 text-center text-[14px] text-ink/45">Add screenshots of the posts already on the page, then plan posts to see them on top.</p>
        )}
      </div>
      <p className="mx-4 mt-3 max-w-[560px] text-[13px] text-ink/40 lg:mx-0">
        Dashed = planned, with its post date. To change the order of planned posts, change their post date. Collab posts show on both pages.
      </p>
    </>
  );
}

function InspoTab({ items, me, open, upsert }: { items: StudioItem[]; me: StudioUser; open: (i: StudioItem) => void; upsert: (i: StudioItem) => void }) {
  const [brand, setBrand] = useState<BrandFilter>('all');
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = items.filter((i) => i.kind === 'inspo' && (brand === 'all' || i.brand === brand)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Each photo or video picked becomes its own tile, straight from the camera roll.
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(files.length);
    for (const f of Array.from(files)) {
      const item = blankItem(me.name, { kind: 'inspo', brand: brand === 'all' ? 'longevity' : brand, title: f.name.replace(/\.[^.]*$/, '').slice(0, 60) });
      const { files: up, error: e } = await uploadFiles(item.id, [f]);
      if (e) {
        setError(e);
        break;
      }
      const r = await saveStudioItem({ ...item, files: up });
      if (r.ok) upsert(r.data);
      else setError(r.error);
      setBusy((n) => n - 1);
    }
    setBusy(0);
  };

  return (
    <>
      <LargeTitle title="Inspo" sub="References for the look we want. Upload photos and videos, or save a link.">
        <button type="button" onClick={() => input.current?.click()} disabled={busy > 0} className="mb-1 flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-butter px-3.5 text-[14px] font-semibold disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? `${busy} left` : 'Upload'}
        </button>
      </LargeTitle>
      <input ref={input} type="file" multiple accept="image/*,video/*,application/pdf" hidden onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
      <div className="space-y-3 px-4 pb-4 lg:px-0">
        <Chips value={brand} onChange={setBrand} options={BRAND_CHIPS} />
        {error && <p className="rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
      </div>
      {list.length === 0 ? (
        <Group>
          <Empty>Upload photos and videos, or tap + to save a link.</Empty>
        </Group>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 lg:px-0 xl:grid-cols-5">
          {list.map((i) => {
            const file = i.files[0];
            const link = i.links[0];
            return (
              <button key={i.id} type="button" onClick={() => open(i)} className="group text-left">
                {file ? (
                  <div className="pointer-events-none transition-transform group-hover:scale-[1.02]">
                    <FileTile file={file} />
                  </div>
                ) : (
                  <div className="flex aspect-square flex-col justify-between rounded-[12px] bg-white p-3 transition-transform group-hover:scale-[1.02]">
                    <Link2 className="h-5 w-5 text-ink/30" />
                    <p className="line-clamp-4 text-[14px] font-semibold leading-snug">{i.title}</p>
                    {link && <p className="truncate text-[12px] text-ink/40">{new URL(link.url).hostname.replace(/^www\./, '')}</p>}
                  </div>
                )}
                <p className="mt-1.5 flex items-center gap-1.5 px-0.5 text-[13px]">
                  <BrandDot brand={i.brand} className="h-2 w-2" />
                  <span className="truncate">{file ? i.title : BRAND_LABEL[i.brand]}</span>
                  {i.files.length + i.links.length > 1 && <span className="ml-auto shrink-0 text-ink/35">+{i.files.length + i.links.length - 1}</span>}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ---------------- Activity ---------------- */

const timeET = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

// One line per task: "sent for review · 2 links · 8 notes".
function rollUp(evs: StudioEvent[]) {
  const total = (re: RegExp) => evs.filter((e) => re.test(e.action)).reduce((t, e) => t + (Number(e.action.match(/\d+/)?.[0]) || 1), 0);
  const plural = (n: number, w: string) => (n ? [`${n} ${w}${n > 1 ? 's' : ''}`] : []);
  const other = [...evs]
    .reverse()
    .map((e) => e.action)
    .filter((a) => !/^(left a note|added \d+ links?|uploaded \d+ files?)/.test(a))
    .map((a) => a.replace(/ (on|to)$/, ''));
  return [...new Set(other), ...plural(total(/^uploaded/), 'file'), ...plural(total(/^added \d+ link/), 'link'), ...plural(total(/^left a note/), 'note')];
}

function ActivityTab({ events, items, users, open }: { events: StudioEvent[]; items: StudioItem[]; users: StudioUser[]; open: (id: string) => void }) {
  const people = users.map((u) => u.name);
  const [who, setWho] = useState('all');
  const [view, setView] = useState<'task' | 'time'>('task');
  const today = todayET();
  const list = events.filter((e) => who === 'all' || e.by === who);
  const days = [...new Set(list.map((e) => todayET(new Date(e.at))))];

  // Today at a glance, per person.
  const summary = (name: string) => {
    const mine = events.filter((e) => e.by === name && todayET(new Date(e.at)) === today);
    const count = (re: RegExp) => mine.filter((e) => re.test(e.action)).length;
    const u = users.find((x) => x.name === name);
    return {
      name,
      here: u ? presence(u, today) : { text: 'Never signed in', today: false },
      stats: [
        { n: count(/^marked (done|posted)/), label: 'finished' },
        { n: count(/^sent for review/), label: 'sent for review' },
        { n: mine.filter((e) => /^uploaded/.test(e.action)).reduce((t, e) => t + (Number(e.action.match(/\d+/)?.[0]) || 0), 0), label: 'files uploaded' },
        { n: count(/^left a note/), label: 'notes' },
      ],
    };
  };
  const shown = (who === 'all' ? people : [who]).map(summary);

  return (
    <>
      <LargeTitle title="Activity" sub="Everything done in the studio, newest first. Only you and Mo see this." />
      <div className="flex flex-wrap items-center gap-3 px-4 pb-5 lg:px-0">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'task', label: 'By task' },
            { value: 'time', label: 'Timeline' },
          ]}
          className="w-[220px]"
        />
        <Chips value={who} onChange={setWho} options={[{ value: 'all', label: 'Everyone' }, ...people.map((p) => ({ value: p, label: p }))]} />
      </div>

      <div className="grid gap-3 px-4 pb-6 sm:grid-cols-2 lg:grid-cols-3 lg:px-0">
        {shown.map((s) => (
          <div key={s.name} className="rounded-[18px] bg-white p-4">
            <p className="text-[16px] font-semibold">{s.name} today</p>
            <p className={cn('text-[13px]', s.here.today ? 'text-emerald-700' : 'text-orange-600')}>{s.here.text}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {s.stats.map((x) => (
                <div key={x.label} className="rounded-[10px] bg-black/[0.03] px-3 py-2">
                  <dd className={cn('text-[20px] font-bold leading-none', !x.n && 'text-ink/25')}>{x.n}</dd>
                  <dt className="mt-1 text-[12px] text-ink/50">{x.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {(!events.length || todayET(new Date(events[events.length - 1].at)) === today) && (
        <p className="-mt-3 px-5 pb-5 text-[13px] text-ink/40 lg:px-1">The log started on Oct 28, so work from before then isn’t counted. “Last seen” is always current.</p>
      )}
      {list.length === 0 && (
        <Group>
          <Empty>Nothing yet. Every sign-in, check-off, upload, note and approval shows up here from now on.</Empty>
        </Group>
      )}
      {view === 'task' && (
        <div className="lg:max-w-[820px]">
          {days.map((d) => {
            const dayEvents = list.filter((e) => e.itemId && todayET(new Date(e.at)) === d);
            const ids = [...new Set(dayEvents.map((e) => e.itemId!))];
            if (!ids.length) return null;
            return (
              <Group key={d} title={dayLabel(d, today)} count={ids.length}>
                {ids.map((id) => {
                  const evs = dayEvents.filter((e) => e.itemId === id);
                  const item = items.find((i) => i.id === id);
                  const note = evs.find((e) => /^left a note/.test(e.action))?.detail;
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={!item}
                      onClick={() => open(id)}
                      className="flex w-full items-start gap-3 px-4 py-3.5 text-left [&+&]:border-t [&+&]:border-black/[0.06] enabled:hover:bg-black/[0.015]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] font-semibold leading-snug">{item?.title ?? evs[0].itemTitle ?? 'Deleted item'}</span>
                        {item && (
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <BrandTag brand={item.brand} />
                            <StatusPill status={item.status} />
                            {item.status === 'review' && <span className="text-[13px] font-semibold text-orange-600">Waiting on you</span>}
                          </span>
                        )}
                        <span className="mt-1.5 block text-[14px] text-ink/65">
                          {[...new Set(evs.map((e) => e.by))].join(' & ')}: {rollUp(evs).join(' · ')}
                        </span>
                        {note && <span className="mt-1 line-clamp-2 block text-[13px] text-ink/45">“{note}”</span>}
                      </span>
                      <span className="shrink-0 text-[13px] tabular-nums text-ink/40">{timeET(evs[0].at)}</span>
                    </button>
                  );
                })}
              </Group>
            );
          })}
        </div>
      )}

      <div className={cn('lg:max-w-[820px]', view === 'task' && 'hidden')}>
        {days.map((d) => (
          <Group key={d} title={dayLabel(d, today)} count={list.filter((e) => todayET(new Date(e.at)) === d).length}>
            {list
              .filter((e) => todayET(new Date(e.at)) === d)
              .map((e, n) => {
                const Row = e.itemId ? 'button' : 'div';
                return (
                  <Row
                    key={e.at + n}
                    {...(e.itemId ? { type: 'button' as const, onClick: () => open(e.itemId!) } : {})}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left [&+&]:border-t [&+&]:border-black/[0.06] enabled:hover:bg-black/[0.015]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold text-butter">{initials(e.by)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug">
                        <b className="font-semibold">{e.by}</b> {e.action}
                        {e.itemTitle && <> <span className="font-semibold">“{e.itemTitle}”</span></>}
                      </span>
                      {e.detail && <span className="mt-0.5 block truncate text-[13px] text-ink/50">{e.detail}</span>}
                    </span>
                    <span className="shrink-0 text-[13px] tabular-nums text-ink/40">{timeET(e.at)}</span>
                  </Row>
                );
              })}
          </Group>
        ))}
      </div>
    </>
  );
}

/* ---------------- Report ---------------- */

/** Monday of the week holding `d`, YYYY-MM-DD. */
function mondayOf(d: string): string {
  const t = new Date(`${d}T12:00:00Z`);
  return addDays(d, -((t.getUTCDay() + 6) % 7));
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function grade(pct: number | null): { letter: string; tone: string } {
  if (pct === null) return { letter: '—', tone: 'text-ink/30' };
  if (pct >= 90) return { letter: 'A', tone: 'text-emerald-600' };
  if (pct >= 80) return { letter: 'B', tone: 'text-emerald-600' };
  if (pct >= 70) return { letter: 'C', tone: 'text-[#C9A82E]' };
  if (pct >= 60) return { letter: 'D', tone: 'text-orange-600' };
  return { letter: 'F', tone: 'text-red-600' };
}

type Commitment = { key: string; itemId: string; title: string; brand: Brand; due: string; result: 'on time' | 'late' | 'missed' | 'upcoming'; daysLate: number; doneOn: string | null };

function ReportTab({
  items,
  misses,
  events,
  notes,
  users,
  targets,
  open,
}: {
  items: StudioItem[];
  misses: StudioMiss[];
  events: StudioEvent[];
  notes: Record<string, string>;
  users: StudioUser[];
  targets: StudioSettings['targets'];
  open: (id: string) => void;
}) {
  const today = todayET();
  const thisWeek = mondayOf(today);
  const [week, setWeek] = useState(thisWeek);
  const [person, setPerson] = useState(users[0]?.name ?? '');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const end = addDays(week, 6);
  const noteKey = `${person}:${week}`;

  useEffect(() => {
    setNote(notes[noteKey] ?? '');
    setSaved(null);
    // Only when the person or week changes, not on every 30-second refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKey]);

  // Everything due that week: today's due dates plus any deadline already recorded as missed.
  const commitments = useMemo(() => {
    const byKey = new Map<string, Commitment>();
    const judge = (key: string, itemId: string, title: string, brand: Brand, due: string) => {
      const it = items.find((i) => i.id === itemId);
      const doneOn = it && isFinished(it.status) ? it.completedOn : null;
      const result: Commitment['result'] = doneOn ? (doneOn <= due ? 'on time' : 'late') : due < today ? 'missed' : 'upcoming';
      byKey.set(key, { key, itemId, title: it?.title ?? title, brand: it?.brand ?? brand, due, result, daysLate: result === 'late' ? daysBetween(due, doneOn!) : result === 'missed' ? daysBetween(due, today) : 0, doneOn });
    };
    for (const m of misses) if (m.assignee === person && m.due >= week && m.due <= end) judge(m.key, m.itemId, m.title, m.brand, m.due);
    for (const i of items) {
      if (i.kind === 'inspo' || i.assignee !== person || !i.due || i.due < week || i.due > end) continue;
      if (!byKey.has(`${i.id}:${i.due}`)) judge(`${i.id}:${i.due}`, i.id, i.title, i.brand, i.due);
    }
    return [...byKey.values()].sort((a, b) => a.due.localeCompare(b.due));
  }, [items, misses, person, week, end, today]);

  const onTime = commitments.filter((c) => c.result === 'on time');
  const late = commitments.filter((c) => c.result === 'late');
  const missed = commitments.filter((c) => c.result === 'missed');
  const judged = onTime.length + late.length + missed.length;
  const pct = judged ? Math.round((onTime.length / judged) * 100) : null;
  const g = grade(pct);
  const sentBack = events.filter((e) => e.action === 'asked for changes on' && todayET(new Date(e.at)) >= week && todayET(new Date(e.at)) <= end && items.find((i) => i.id === e.itemId)?.assignee === person).length;
  const days = Array.from({ length: 7 }, (_, n) => addDays(week, n)).filter((d) => d <= today);
  const goalDays = days.filter((d) => {
    const done = items.filter((i) => i.assignee === person && i.completedOn === d);
    return done.filter((i) => i.kind === 'post').length >= targets.posts && done.filter((i) => i.kind === 'story').length >= targets.stories;
  }).length;
  const weeks = [thisWeek, addDays(thisWeek, -7), addDays(thisWeek, -14), addDays(thisWeek, -21)];
  const range = `${shortDay(week)} – ${shortDay(end)}`;

  const text = [
    `${person}: weekly report, ${range}`,
    `Grade: ${g.letter}${pct !== null ? ` (${pct}% on time)` : ''}`,
    `On time: ${onTime.length} · Late: ${late.length} · Missed: ${missed.length} · Sent back for changes: ${sentBack} · Daily posting goal hit: ${goalDays} of ${days.length} days`,
    '',
    ...(late.length || missed.length
      ? ['Missed deadlines:', ...[...missed, ...late].sort((a, b) => a.due.localeCompare(b.due)).map((c) => `- ${c.title} (${BRAND_LABEL[c.brand]}), due ${shortDay(c.due)}: ${c.result === 'missed' ? `still not done, ${c.daysLate} day${c.daysLate === 1 ? '' : 's'} late` : `done ${c.daysLate} day${c.daysLate === 1 ? '' : 's'} late`}`)]
      : ['No missed deadlines.']),
    ...(note.trim() ? ['', 'Notes:', note.trim()] : []),
  ].join('\n');

  if (!users.length) {
    return (
      <>
        <LargeTitle title="Report" />
        <Group>
          <Empty>Add a content person under Settings → Team to see their report.</Empty>
        </Group>
      </>
    );
  }

  return (
    <>
      <LargeTitle title="Report" sub="How the week went: what was done on time, what was missed, and your notes. Hand it over at the end of the week.">
        <button type="button" onClick={() => window.print()} className="mb-1 flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[14px] font-semibold ring-1 ring-black/[0.06] print:hidden">
          <Printer className="h-4 w-4" /> Print / PDF
        </button>
      </LargeTitle>
      <div className="space-y-3 px-4 pb-5 lg:flex lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-3 lg:space-y-0 lg:px-0 print:hidden">
        {users.length > 1 && <Chips value={person} onChange={setPerson} options={users.map((u) => ({ value: u.name, label: u.name }))} />}
        <Chips value={week} onChange={setWeek} options={weeks.map((w, n) => ({ value: w, label: n === 0 ? 'This week' : n === 1 ? 'Last week' : `Week of ${new Date(`${w}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` }))} />
      </div>
      <p className="px-5 pb-4 text-[15px] font-semibold lg:px-1">
        {person} · {range}
      </p>

      <div className="grid gap-3 px-4 pb-6 lg:grid-cols-[260px_1fr] lg:px-0">
        <div className="flex items-center gap-4 rounded-[22px] bg-white p-5 lg:flex-col lg:justify-center lg:text-center">
          <p className={cn('text-[72px] font-bold leading-none tracking-[-0.04em]', g.tone)}>{g.letter}</p>
          <div>
            <p className="text-[17px] font-semibold">{pct === null ? 'Nothing due yet' : `${pct}% on time`}</p>
            <p className="text-[13px] text-ink/50">{judged ? `${onTime.length} of ${judged} deadlines met` : 'The grade starts once a due day has passed.'}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { n: onTime.length, label: 'on time', tone: 'text-emerald-700' },
            { n: late.length, label: 'done late', tone: 'text-orange-600' },
            { n: missed.length, label: 'missed, still open', tone: 'text-red-600' },
            { n: sentBack, label: 'sent back for changes', tone: 'text-orange-600' },
            { n: goalDays, label: `days hitting ${targets.posts} posts + ${targets.stories} stories (of ${days.length})`, tone: 'text-ink' },
            { n: commitments.filter((c) => c.result === 'upcoming').length, label: 'still coming up', tone: 'text-ink' },
          ].map((x) => (
            <div key={x.label} className="rounded-[14px] bg-white px-4 py-3">
              <dd className={cn('text-[26px] font-bold leading-none', x.n ? x.tone : 'text-ink/25')}>{x.n}</dd>
              <dt className="mt-1.5 text-[13px] leading-snug text-ink/55">{x.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <Columns>
        <Group title="Missed deadlines" count={late.length + missed.length}>
          {late.length + missed.length === 0 ? (
            <Empty>None this week.</Empty>
          ) : (
            [...missed, ...late]
              .sort((a, b) => a.due.localeCompare(b.due))
              .map((c) => (
                <button key={c.key} type="button" onClick={() => open(c.itemId)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-black/[0.015] [&+&]:border-t [&+&]:border-black/[0.06]">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium leading-snug">{c.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink/50">
                      <BrandTag brand={c.brand} />
                      Due {shortDay(c.due)}
                    </span>
                  </span>
                  <span className={cn('shrink-0 text-right text-[13px] font-semibold', c.result === 'missed' ? 'text-red-600' : 'text-orange-600')}>
                    {c.result === 'missed' ? 'Still not done' : `Done ${shortDay(c.doneOn!)}`}
                    <span className="block font-normal text-ink/45">
                      {c.daysLate} day{c.daysLate === 1 ? '' : 's'} late
                    </span>
                  </span>
                </button>
              ))
          )}
        </Group>

        <Group title="Day by day">
          {days.length === 0 ? (
            <Empty>This week hasn’t started yet.</Empty>
          ) : (
            days.map((d) => {
              const due = commitments.filter((c) => c.due === d);
              const ok = due.filter((c) => c.result === 'on time').length;
              const bad = due.filter((c) => c.result === 'missed' || c.result === 'late');
              return (
                <div key={d} className="px-4 py-3 [&+&]:border-t [&+&]:border-black/[0.06]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[15px] font-semibold">{shortDay(d)}</span>
                    <span className="text-[13px] text-ink/50">
                      {due.length ? `${due.length} due · ${ok} on time${bad.length ? ` · ` : ''}` : 'Nothing due'}
                      {bad.length > 0 && <span className="font-semibold text-red-600">{bad.length} missed</span>}
                    </span>
                  </div>
                  {bad.length > 0 && <p className="mt-1 text-[13px] leading-snug text-ink/55">{bad.map((c) => c.title).join(' · ')}</p>}
                </div>
              );
            })
          )}
        </Group>
      </Columns>

      <section className="break-inside-avoid px-4 pb-6 lg:px-0">
        <h2 className="px-4 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/45">Your notes for {person}</h2>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(null);
          }}
          rows={4}
          placeholder="What went well, what has to change next week. Only you and Mo see this until you hand it over."
          className="w-full resize-none rounded-[14px] bg-white p-4 text-[15px] leading-relaxed outline-none [field-sizing:content] focus:ring-2 focus:ring-butter-deep print:ring-0"
        />
        <div className="mt-2 flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={async () => {
              const r = await saveReportNote(person, week, note);
              setSaved(r.ok ? 'Saved' : r.error);
            }}
            className="h-10 rounded-[10px] bg-ink px-4 text-[14px] font-semibold text-white"
          >
            Save note
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                setSaved('Copy didn’t work here. Use Print / PDF instead.');
              }
            }}
            className="flex h-10 items-center gap-1.5 rounded-[10px] bg-butter px-4 text-[14px] font-semibold"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy report as text
          </button>
          {saved && <span className="self-center text-[13px] text-ink/50">{saved}</span>}
        </div>
      </section>
    </>
  );
}

/* ---------------- Guide ---------------- */

function GuideTab({ settings, canEdit, onSaved }: { settings: StudioSettings; canEdit: boolean; onSaved: (s: StudioSettings) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<GuideSection[]>(settings.guide);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    const r = await saveStudioSettings({ guide: draft.filter((g) => g.title.trim() || g.body.trim()) });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    onSaved(r.data);
    setEditing(false);
  };

  return (
    <>
      <LargeTitle title="Guide" sub="How every Eternal post looks and sounds. Check here before you send anything for review.">
        {canEdit && (
          <button
            type="button"
            onClick={() => (editing ? save() : (setDraft(settings.guide), setEditing(true)))}
            disabled={busy}
            className="mb-1 flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[14px] font-semibold ring-1 ring-black/[0.06]"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? null : <Pencil className="h-3.5 w-3.5" />}
            {editing ? 'Save' : 'Edit'}
          </button>
        )}
      </LargeTitle>
      {error && <p className="mx-4 mb-4 rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-700 lg:mx-0">{error}</p>}
      {editing ? (
        <div className="space-y-3 px-4 pb-6 lg:px-0">
          {draft.map((g, n) => (
            <div key={g.id} className="rounded-[14px] bg-white p-3">
              <div className="flex items-center gap-2">
                <input
                  value={g.title}
                  onChange={(e) => setDraft((d) => d.map((x, j) => (j === n ? { ...x, title: e.target.value } : x)))}
                  placeholder="Section title"
                  className="h-10 min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none"
                />
                <button type="button" aria-label="Remove section" onClick={() => setDraft((d) => d.filter((_, j) => j !== n))} className="grid h-9 w-9 place-items-center text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <textarea
                value={g.body}
                onChange={(e) => setDraft((d) => d.map((x, j) => (j === n ? { ...x, body: e.target.value } : x)))}
                rows={5}
                className="w-full resize-none rounded-[10px] bg-black/[0.03] p-3 text-[15px] leading-relaxed outline-none [field-sizing:content] focus:ring-2 focus:ring-butter-deep"
              />
            </div>
          ))}
          <button type="button" onClick={() => setDraft((d) => [...d, { id: crypto.randomUUID(), title: '', body: '' }])} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] bg-white text-[15px] font-semibold">
            <Plus className="h-4 w-4" /> Add section
          </button>
          <button type="button" onClick={() => setEditing(false)} className="h-11 w-full text-[15px] text-ink/50">
            Cancel
          </button>
        </div>
      ) : settings.guide.length === 0 ? (
        <Group>
          <Empty>No guide yet.</Empty>
        </Group>
      ) : (
        <div className="px-4 pb-6 lg:columns-2 lg:gap-6 lg:px-0">
          {settings.guide.map((g) => (
            <details key={g.id} open className="group mb-3 break-inside-avoid rounded-[14px] bg-white px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[18px] font-semibold">
                {g.title}
                <Minus className="h-4 w-4 text-ink/30 group-[:not([open])]:rotate-90" />
              </summary>
              <Linkified text={g.body} className="mt-2 text-[15px] leading-relaxed text-ink/80" />
            </details>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Settings ---------------- */

const sectionTitle = 'px-4 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/45';

function SettingsSheet({
  settings,
  me,
  onClose,
  onSettings,
  onImported,
}: {
  settings: StudioSettings;
  me: StudioUser;
  onClose: () => void;
  onSettings: (s: StudioSettings) => void;
  onImported: () => void;
}) {
  const router = useRouter();
  const manager = canAssign(me.role);
  const [targets, setTargets] = useState(settings.targets);
  const [json, setJson] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!manager) return onClose();
    setBusy(true);
    const r = await saveStudioSettings({ targets });
    setBusy(false);
    if (!r.ok) return setMsg(r.error);
    onSettings(r.data);
    onClose();
  };

  const step = (k: 'posts' | 'stories', d: number) => setTargets((t) => ({ ...t, [k]: Math.max(0, Math.min(50, t[k] + d)) }));

  return (
    <>
      <SheetBar
        title="Settings"
        left={<BarButton onClick={onClose}>{manager ? 'Cancel' : 'Close'}</BarButton>}
        right={
          manager ? (
            <BarButton onClick={save} bold disabled={busy}>
              Save
            </BarButton>
          ) : undefined
        }
      />
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-5">
        <div className="flex items-center gap-3 rounded-[14px] bg-white p-4">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-ink text-[16px] font-bold text-butter">{initials(me.name)}</span>
          <div>
            <p className="text-[17px] font-semibold">{me.name}</p>
            <p className="text-[14px] text-ink/50">{ROLE_LABEL[me.role]} · signed in for 24 hours on this device</p>
          </div>
        </div>

        {manager && (
          <section>
            <h3 className={sectionTitle}>Daily goal, all accounts</h3>
            <div className="overflow-hidden rounded-[14px] bg-white">
              {(['posts', 'stories'] as const).map((k) => (
                <div key={k} className="flex h-[52px] items-center justify-between px-4 [&+&]:border-t [&+&]:border-black/[0.06]">
                  <span className="text-[16px] capitalize">{k}</span>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-[17px] font-semibold tabular-nums">{targets[k]}</span>
                    <div className="flex overflow-hidden rounded-[8px] bg-black/[0.05]">
                      <button type="button" aria-label={`Fewer ${k}`} onClick={() => step(k, -1)} className="grid h-8 w-11 place-items-center">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="my-1.5 w-px bg-black/10" />
                      <button type="button" aria-label={`More ${k}`} onClick={() => step(k, 1)} className="grid h-8 w-11 place-items-center">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {me.role === 'admin' && <TeamPanel settings={settings} me={me} onSettings={onSettings} />}

        {manager && (
          <section>
            <h3 className={sectionTitle}>Bulk import</h3>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={3}
              placeholder="Paste a studio plan (JSON), or choose the file below"
              className="w-full rounded-[14px] bg-white p-4 font-mono text-[13px] outline-none focus:ring-2 focus:ring-butter-deep"
            />
            <input
              type="file"
              accept="application/json,.json"
              aria-label="Choose a studio plan file"
              onChange={async (e) => setJson((await e.target.files?.[0]?.text()) ?? '')}
              className="mt-2 block w-full text-[14px] text-ink/60 file:mr-3 file:h-9 file:rounded-full file:border-0 file:bg-white file:px-4 file:text-[14px] file:font-semibold"
            />
            <button
              type="button"
              disabled={!json.trim() || busy}
              onClick={async () => {
                setBusy(true);
                const r = await importStudio(json);
                setBusy(false);
                setMsg(r.ok ? `Imported ${r.data} items.` : r.error);
                if (r.ok) {
                  setJson('');
                  onImported();
                }
              }}
              className="mt-2 h-11 w-full rounded-[12px] bg-white text-[15px] font-semibold disabled:opacity-40"
            >
              Import
            </button>
          </section>
        )}
        {msg && <p className="rounded-[12px] bg-butter-soft px-4 py-3 text-[14px]">{msg}</p>}
        <button
          type="button"
          onClick={async () => {
            await lockStudio();
            router.refresh();
          }}
          className="h-12 w-full rounded-[14px] bg-white text-[16px] text-red-600"
        >
          Sign out of this device
        </button>
      </div>
    </>
  );
}

/* ---------------- Team (admin) ---------------- */

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'member', label: 'Content' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

const ROLE_HELP: Record<Role, string> = {
  member: 'Sees their own work, marks it done, sends it for review. Can’t create tasks or approve.',
  manager: 'Issues tasks, approves work, edits the guide.',
  admin: 'Everything, plus who has access.',
};

function TeamPanel({ settings, me, onSettings }: { settings: StudioSettings; me: StudioUser; onSettings: (s: StudioSettings) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [openId, setOpenId] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ name: string; code: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const done = <T,>(r: { ok: true; data: T } | { ok: false; error: string }): T | null => {
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return null;
    }
    setError(null);
    return r.data;
  };

  const add = async () => {
    setBusy(true);
    const d = done(await addStudioUser(name, role));
    if (!d) return;
    onSettings(d.settings);
    setIssued({ name: name.trim(), code: d.code });
    setName('');
    setRole('member');
  };

  const issue = async (u: StudioUser) => {
    if (u.hasCode && !(await confirm({ title: `New code for ${u.name}?`, body: 'Their current code stops working and they are signed out.', confirmLabel: 'Issue new code' }))) return;
    setBusy(true);
    const d = done(await issueStudioCode(u.id));
    if (!d) return;
    onSettings(d.settings);
    setIssued({ name: u.name, code: d.code });
  };

  const change = async (u: StudioUser, c: { role?: Role; active?: boolean; remove?: boolean }) => {
    if (c.remove && !(await confirm({ title: `Remove ${u.name}?`, body: 'Their code stops working. Their tasks and notes stay.', confirmLabel: 'Remove', danger: true }))) return;
    if (c.active === false && !(await confirm({ title: `Turn off ${u.name}’s access?`, body: 'They are signed out and their code stops working until you turn it back on.', confirmLabel: 'Turn off', danger: true }))) return;
    setBusy(true);
    const d = done(await updateStudioUser(u.id, c));
    if (d) onSettings(d);
  };

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError('Copy didn’t work here. Select the code and copy it by hand.');
    }
  };

  const invite = issued
    ? `Hi ${issued.name}, here’s your login for the Eternal Longevity Studio.\n\nOpen: ${typeof window !== 'undefined' ? window.location.origin : 'https://www.etlongevity.com'}/studio\nYour code: ${issued.code}\n\nIt keeps you signed in for 24 hours. Keep the code to yourself.`
    : '';

  return (
    <section>
      {confirmDialog}
      <h3 className={sectionTitle}>Team and access</h3>

      {issued && (
        <div className="mb-3 rounded-[14px] bg-ink p-4 text-white">
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-butter">{issued.name}’s code</p>
          <p className="mt-1 select-all font-mono text-[32px] font-bold tracking-[0.12em]">{issued.code}</p>
          <p className="mt-1 text-[13px] text-white/60">Shown only now. Send it to {issued.name} yourself. Lost it? Issue a new one.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => copy('code', issued.code)} className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-white/10 text-[14px] font-semibold">
              {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy code
            </button>
            <button type="button" onClick={() => copy('invite', invite)} className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-butter text-[14px] font-semibold text-ink">
              {copied === 'invite' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy invite text
            </button>
          </div>
          <button type="button" onClick={() => setIssued(null)} className="mt-2 h-9 w-full text-[13px] text-white/50">
            Done
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-[14px] bg-white">
        {settings.users.map((u) => {
          const self = u.id === me.id;
          const expanded = openId === u.id;
          const status = !u.active ? 'Access off' : !u.hasCode && !self ? 'No code yet' : presence(u).text;
          return (
            <div key={u.id} className="[&+&]:border-t [&+&]:border-black/[0.06]">
              <button type="button" onClick={() => setOpenId(expanded ? null : u.id)} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left hover:bg-black/[0.015]">
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold', u.active ? 'bg-ink text-butter' : 'bg-black/10 text-ink/40')}>{initials(u.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">
                    {u.name}
                    {self && <span className="ml-1.5 text-[13px] font-normal text-ink/40">(you)</span>}
                  </span>
                  <span className={cn('block text-[13px]', !u.active || (!u.hasCode && !self) ? 'text-orange-600' : 'text-ink/45')}>
                    {ROLE_LABEL[u.role]} · {status}
                  </span>
                </span>
              </button>
              {expanded && (
                <div className="space-y-2 border-t border-black/[0.04] bg-black/[0.015] px-4 py-3">
                  {self ? (
                    <p className="text-[14px] text-ink/50">{u.hasCode ? 'You sign in with your own code.' : 'You sign in with the owner code set in Vercel (STUDIO_CODE).'} Another admin can change your access; you can’t change your own.</p>
                  ) : (
                    <>
                      <Segmented value={u.role} onChange={(r) => change(u, { role: r })} options={ROLE_OPTIONS} />
                      <p className="px-1 text-[13px] text-ink/45">{ROLE_HELP[u.role]}</p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button type="button" disabled={busy || !u.active} onClick={() => issue(u)} className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-butter text-[14px] font-semibold disabled:opacity-40">
                          <KeyRound className="h-4 w-4" /> {u.hasCode ? 'New code' : 'Create code'}
                        </button>
                        <button type="button" disabled={busy} onClick={() => change(u, { active: !u.active })} className="h-10 rounded-[10px] bg-white text-[14px] font-semibold ring-1 ring-black/[0.06]">
                          {u.active ? 'Turn off access' : 'Turn on access'}
                        </button>
                      </div>
                      <button type="button" disabled={busy} onClick={() => change(u, { remove: true })} className="h-10 w-full rounded-[10px] text-[14px] text-red-600">
                        Remove from team
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-[14px] bg-white p-3">
        <p className="px-1 pb-2 text-[14px] font-semibold">Add a person</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="h-11 w-full rounded-[10px] bg-black/[0.04] px-3 text-[16px] outline-none focus:ring-2 focus:ring-butter-deep"
        />
        <Segmented className="mt-2" value={role} onChange={setRole} options={ROLE_OPTIONS} />
        <p className="px-1 pt-1.5 text-[13px] text-ink/45">{ROLE_HELP[role]}</p>
        <button type="button" disabled={!name.trim() || busy} onClick={add} className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] bg-ink text-[15px] font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add and create their code
        </button>
      </div>
      {error && <p className="mt-2 rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
    </section>
  );
}
