'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  Clapperboard,
  Images,
  Link2,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Settings,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Wordmark } from '@/components/nav/Wordmark';
import { importStudio, lockStudio, saveStudioItem, saveStudioSettings, setStudioName } from '@/lib/studio-actions';
import {
  BRAND_LABEL,
  FLOW,
  STATUS_LABEL,
  finishedStatus,
  isFinished,
  todayET,
  type Brand,
  type GuideSection,
  type StudioData,
  type StudioItem,
  type StudioSettings,
} from '@/lib/studio-types';
import { FileTile, ItemSheet, blankItem, uploadFiles } from './ItemSheet';
import { BrandDot, Chips, Empty, Group, ItemRow, LargeTitle, Linkified, Segmented, Sheet, SheetBar, BarButton, dayLabel } from './ui';

type Tab = 'today' | 'tasks' | 'content' | 'inspo' | 'guide';
type BrandFilter = 'all' | Brand;

const TABS: { id: Tab; label: string; icon: typeof Sun }[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2 },
  { id: 'content', label: 'Content', icon: Clapperboard },
  { id: 'inspo', label: 'Inspo', icon: Images },
  { id: 'guide', label: 'Guide', icon: BookOpen },
];

const BRAND_CHIPS: { value: BrandFilter; label: string; dot?: Brand }[] = [
  { value: 'all', label: 'All' },
  { value: 'longevity', label: 'Longevity', dot: 'longevity' },
  { value: 'hair', label: 'Hair', dot: 'hair' },
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

export function Studio({ initial, who }: { initial: StudioData; who: string | null }) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const [settings, setSettings] = useState(initial.settings);
  const [me, setMe] = useState(who);
  const [tab, setTab] = useState<Tab>('today');
  const [sheet, setSheet] = useState<{ item: StudioItem; isNew: boolean } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setItems((prev) => merge(prev, initial.items));
    setSettings(initial.settings);
  }, [initial]);

  // Stay in step with the other person: refresh when the app comes back and every 30 s while open.
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
      if (t && TABS.some((x) => x.id === t)) setTab(t);
    } catch {}
  }, []);

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
  const create = (preset: Partial<StudioItem> = {}) => setSheet({ item: blankItem(me ?? 'Team', preset), isNew: true });

  const toggle = async (item: StudioItem) => {
    const done = isFinished(item.status);
    const next = { ...item, status: done ? FLOW[item.kind][0] : finishedStatus(item.kind), completedOn: done ? null : todayET() };
    upsert(next);
    const r = await saveStudioItem(next);
    upsert(r.ok ? r.data : item);
  };

  const row = (i: StudioItem, opts: { check?: boolean; status?: boolean } = {}) => (
    <ItemRow key={i.id} item={i} onOpen={() => open(i)} onToggle={opts.check === false ? undefined : () => toggle(i)} showStatus={opts.status} />
  );

  const addFor: Record<Tab, () => void> = {
    today: () => create(),
    tasks: () => create({ kind: 'task', assignee: me === 'Jacob' ? 'Jacob' : '' }),
    content: () => create({ kind: 'post', platforms: ['Instagram', 'TikTok'] }),
    inspo: () => create({ kind: 'inspo' }),
    guide: () => {},
  };

  if (!me) return <WhoAreYou people={settings.people} onPick={setMe} />;

  return (
    <div className="mx-auto min-h-dvh max-w-[720px] pb-[calc(env(safe-area-inset-bottom)+96px)]">
      {/* Toolbar */}
      <div className="sticky top-0 z-30 flex h-[52px] items-center justify-between bg-milk/85 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl [box-sizing:content-box]">
        <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" className="grid h-11 w-11 place-items-center rounded-full text-ink/70">
          <Settings className="h-[22px] w-[22px]" />
        </button>
        <span className="flex items-center gap-2 text-ink">
          <Wordmark href={null} className="text-[15px]" />
          <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-butter">Studio</span>
        </span>
        {tab !== 'guide' ? (
          <button type="button" onClick={addFor[tab]} aria-label="Add" className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white shadow-[0_6px_16px_-8px_rgba(17,17,17,0.6)]">
            <Plus className="h-[22px] w-[22px]" strokeWidth={2.5} />
          </button>
        ) : (
          <span className="w-11" />
        )}
      </div>

      {!initial.live && (
        <p className="mx-4 mb-2 rounded-[12px] bg-butter-soft px-4 py-2 text-[13px] text-ink/70">Local copy: changes are not saved to the live studio.</p>
      )}

      {tab === 'today' && <TodayTab items={items} me={me} settings={settings} row={row} create={create} go={go} />}
      {tab === 'tasks' && <TasksTab items={items} people={settings.people} me={me} row={row} />}
      {tab === 'content' && <ContentTab items={items} row={row} />}
      {tab === 'inspo' && <InspoTab items={items} me={me} open={open} upsert={upsert} />}
      {tab === 'guide' && <GuideTab settings={settings} onSaved={setSettings} />}

      {/* Tab bar */}
      <nav
        aria-label="Studio"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-[720px]">
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id;
            const badge = id === 'today' ? items.filter((i) => i.status === 'review' || i.status === 'changes').length : 0;
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
                {badge > 0 && (
                  <span className="absolute left-1/2 top-1.5 ml-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[11px] text-white">{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={!!sheet} onClose={() => setSheet(null)} label="Edit item">
        {sheet && (
          <ItemSheet
            key={sheet.item.id}
            start={sheet.item}
            isNew={sheet.isNew}
            me={me}
            people={settings.people}
            onClose={() => setSheet(null)}
            onSaved={upsert}
            onDeleted={(id) => setItems((l) => l.filter((i) => i.id !== id))}
          />
        )}
      </Sheet>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} label="Settings">
        <SettingsSheet
          settings={settings}
          me={me}
          onClose={() => setSettingsOpen(false)}
          onMe={setMe}
          onSettings={setSettings}
          onImported={() => router.refresh()}
        />
      </Sheet>
    </div>
  );
}

/* ---------------- Who are you ---------------- */

function WhoAreYou({ people, onPick }: { people: string[]; onPick: (p: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <h1 className="text-[28px] font-bold tracking-[-0.02em]">Who’s this?</h1>
      <p className="mt-1.5 text-[15px] text-ink-soft">So notes and approvals carry your name.</p>
      <div className="mt-8 w-full max-w-[320px] overflow-hidden rounded-[14px] bg-white">
        {people.map((p) => (
          <button
            key={p}
            type="button"
            disabled={!!busy}
            onClick={async () => {
              setBusy(p);
              const r = await setStudioName(p);
              setBusy(null);
              if (r.ok) onPick(p);
            }}
            className="flex h-[54px] w-full items-center justify-between px-4 text-[17px] active:bg-black/[0.03] [&+&]:border-t [&+&]:border-black/[0.06]"
          >
            {p}
            {busy === p && <Loader2 className="h-4 w-4 animate-spin text-ink/40" />}
          </button>
        ))}
      </div>
    </main>
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
      {p > 0 && <circle
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
      />}
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
  me: string;
  settings: StudioSettings;
  row: RowFn;
  create: (p?: Partial<StudioItem>) => void;
  go: (t: Tab) => void;
}) {
  const today = todayET();
  const work = items.filter((i) => i.kind !== 'inspo');
  const posts = work.filter((i) => i.kind === 'post' && i.completedOn === today).length;
  const stories = work.filter((i) => i.kind === 'story' && i.completedOn === today).length;
  const open = work.filter((i) => !isFinished(i.status));
  const review = open.filter((i) => i.status === 'review').sort(byDue);
  const changes = open.filter((i) => i.status === 'changes').sort(byDue);
  const rest = open.filter((i) => i.status !== 'review' && i.status !== 'changes');
  const late = rest.filter((i) => i.due && i.due < today).sort(byDue);
  const due = rest.filter((i) => i.due === today).sort(byDue);
  const week = rest.filter((i) => i.due && i.due > today && i.due <= addDays(today, 7)).sort(byDue);
  const mine = (l: StudioItem[]) => [...l.filter((i) => i.assignee === me), ...l.filter((i) => i.assignee !== me)];
  const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }));
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });

  return (
    <>
      <LargeTitle eyebrow={date} title={`${hello}, ${me}`} />

      <section className="px-4 pb-6">
        <div className="flex items-center gap-5 rounded-[22px] bg-white p-5">
          <svg viewBox="0 0 120 120" className="h-[112px] w-[112px] shrink-0" role="img" aria-label={`${posts} of ${settings.targets.posts} posts, ${stories} of ${settings.targets.stories} stories today`}>
            <Ring value={posts} goal={settings.targets.posts} r={50} color="#E6C54F" />
            <Ring value={stories} goal={settings.targets.stories} r={34} color="#111111" />
          </svg>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/40">Posted today</p>
            <div>
              <p className="text-[24px] font-bold leading-none tracking-[-0.02em] text-[#C9A82E]">
                {posts}
                <span className="text-[16px] text-ink/30">/{settings.targets.posts}</span>
                <span className="ml-1.5 text-[14px] font-semibold text-ink/50">posts</span>
              </p>
            </div>
            <div>
              <p className="text-[24px] font-bold leading-none tracking-[-0.02em]">
                {stories}
                <span className="text-[16px] text-ink/30">/{settings.targets.stories}</span>
                <span className="ml-1.5 text-[14px] font-semibold text-ink/50">stories</span>
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => create({ kind: 'post', status: 'posted', due: today, completedOn: today, assignee: me, platforms: ['Instagram', 'TikTok'] })}
            className="flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-white text-[15px] font-semibold"
          >
            <Plus className="h-4 w-4" /> Log a post
          </button>
          <button
            type="button"
            onClick={() => create({ kind: 'story', status: 'posted', due: today, completedOn: today, assignee: me, platforms: ['Instagram'] })}
            className="flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-white text-[15px] font-semibold"
          >
            <Plus className="h-4 w-4" /> Log a story
          </button>
        </div>
      </section>

      {review.length > 0 && (
        <Group title="Needs review" count={review.length} footer="Open one to approve it or ask for changes.">
          {review.map((i) => row(i, { check: false, status: false }))}
        </Group>
      )}
      {changes.length > 0 && (
        <Group title="Changes asked" count={changes.length}>
          {changes.map((i) => row(i, { check: false, status: false }))}
        </Group>
      )}
      {late.length > 0 && (
        <Group title="Overdue" count={late.length}>
          {mine(late).map((i) => row(i))}
        </Group>
      )}
      <Group title="Due today" count={due.length}>
        {due.length ? mine(due).map((i) => row(i)) : <Empty>Nothing else due today.</Empty>}
      </Group>
      {week.length > 0 && (
        <Group title="Next 7 days" count={week.length}>
          {week.map((i) => row(i))}
        </Group>
      )}
      <div className="px-4 pb-4">
        <button type="button" onClick={() => go('tasks')} className="h-11 w-full rounded-[12px] text-[15px] font-semibold text-ink/50">
          See every task
        </button>
      </div>
    </>
  );
}

/* ---------------- Tasks ---------------- */

function TasksTab({ items, people, me, row }: { items: StudioItem[]; people: string[]; me: string; row: RowFn }) {
  const [view, setView] = useState<'open' | 'done'>('open');
  const [who, setWho] = useState<string>(people.includes(me) && me === 'Jacob' ? 'Jacob' : 'all');
  const today = todayET();
  const list = items.filter((i) => (i.kind === 'task' || i.kind === 'shoot') && (who === 'all' || i.assignee === who || !i.assignee));

  const groups = useMemo(() => {
    if (view === 'done') {
      const done = list.filter((i) => isFinished(i.status)).sort((a, b) => (b.completedOn ?? '').localeCompare(a.completedOn ?? ''));
      return [{ title: 'Done', items: done }];
    }
    const open = list.filter((i) => !isFinished(i.status)).sort(byDue);
    const week = addDays(today, 7);
    return [
      { title: 'Overdue', items: open.filter((i) => i.due && i.due < today) },
      { title: 'Today', items: open.filter((i) => i.due === today) },
      { title: 'This week', items: open.filter((i) => i.due && i.due > today && i.due <= week) },
      { title: 'Later', items: open.filter((i) => i.due && i.due > week) },
      { title: 'No date', items: open.filter((i) => !i.due) },
    ];
  }, [list, view, today]);

  return (
    <>
      <LargeTitle title="Tasks" />
      <div className="space-y-3 px-4 pb-5">
        <Segmented value={view} onChange={setView} options={[{ value: 'open', label: 'To do' }, { value: 'done', label: 'Done' }]} />
        <Chips value={who} onChange={setWho} options={[{ value: 'all', label: 'Everyone' }, ...people.map((p) => ({ value: p, label: p }))]} />
      </div>
      {groups.every((g) => !g.items.length) && (
        <Group>
          <Empty>{view === 'open' ? 'All clear. Tap + to add a task.' : 'Nothing finished yet.'}</Empty>
        </Group>
      )}
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <Group key={g.title} title={g.title} count={g.items.length}>
            {g.items.map((i) => row(i))}
          </Group>
        ))}
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
    groups = FLOW.post
      .filter((s) => s !== 'posted')
      .map((s) => ({ title: STATUS_LABEL[s], items: open.filter((i) => i.status === s).sort(byDue) }));
  } else {
    const dated = open.filter((i) => i.due).sort(byDue);
    const days = [...new Set(dated.map((i) => i.due!))].sort();
    groups = [
      ...days.map((d) => ({
        title: d < today ? `${dayLabel(d, today)} · late` : `${dayLabel(d, today)}${d > today ? ` · ${new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}`,
        items: dated.filter((i) => i.due === d),
      })),
      { title: 'Not scheduled', items: open.filter((i) => !i.due).sort(byDue) },
    ];
  }

  return (
    <>
      <LargeTitle title="Content" />
      <div className="space-y-3 px-4 pb-5">
        <Segmented
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
          <Empty>No content here yet. Tap + to plan a post.</Empty>
        </Group>
      )}
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <Group key={g.title} title={g.title} count={g.items.length}>
            {g.items.map((i) => row(i, { status: view !== 'pipeline' }))}
          </Group>
        ))}
    </>
  );
}

/* ---------------- Inspo ---------------- */

function InspoTab({
  items,
  me,
  open,
  upsert,
}: {
  items: StudioItem[];
  me: string;
  open: (i: StudioItem) => void;
  upsert: (i: StudioItem) => void;
}) {
  const [brand, setBrand] = useState<BrandFilter>('all');
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = items
    .filter((i) => i.kind === 'inspo' && (brand === 'all' || i.brand === brand))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Each photo or video picked becomes its own tile, straight from the camera roll.
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(files.length);
    for (const f of Array.from(files)) {
      const item = blankItem(me, { kind: 'inspo', brand: brand === 'all' ? 'longevity' : brand, title: f.name.replace(/\.[^.]*$/, '').slice(0, 60) });
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
      <LargeTitle title="Inspo">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy > 0}
          className="mb-1 flex h-9 items-center gap-1.5 rounded-full bg-butter px-3.5 text-[14px] font-semibold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? `${busy} left` : 'Upload'}
        </button>
      </LargeTitle>
      <input ref={input} type="file" multiple accept="image/*,video/*,application/pdf" hidden onChange={(e) => (upload(e.target.files), (e.target.value = ''))} />
      <div className="space-y-3 px-4 pb-4">
        <Chips value={brand} onChange={setBrand} options={BRAND_CHIPS} />
        {error && <p className="rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
      </div>
      {list.length === 0 ? (
        <Group>
          <Empty>Upload photos and videos, or tap + to save a link.</Empty>
        </Group>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-6 sm:grid-cols-3">
          {list.map((i) => {
            const file = i.files[0];
            const link = i.links[0];
            return (
              <button key={i.id} type="button" onClick={() => open(i)} className="group text-left">
                {file ? (
                  <div className="pointer-events-none">
                    <FileTile file={file} />
                  </div>
                ) : (
                  <div className="flex aspect-square flex-col justify-between rounded-[12px] bg-white p-3">
                    <Link2 className="h-5 w-5 text-ink/30" />
                    <p className="line-clamp-4 text-[14px] font-semibold leading-snug">{i.title}</p>
                    {link && <p className="truncate text-[12px] text-ink/40">{new URL(link.url).hostname.replace(/^www\./, '')}</p>}
                  </div>
                )}
                <p className="mt-1.5 flex items-center gap-1.5 px-0.5 text-[13px]">
                  <BrandDot brand={i.brand} className="h-2 w-2" />
                  <span className="truncate">{file ? i.title : (link ? BRAND_LABEL[i.brand] : '')}</span>
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

/* ---------------- Guide ---------------- */

function GuideTab({ settings, onSaved }: { settings: StudioSettings; onSaved: (s: StudioSettings) => void }) {
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
      <LargeTitle title="Guide">
        <button
          type="button"
          onClick={() => (editing ? save() : (setDraft(settings.guide), setEditing(true)))}
          disabled={busy}
          className="mb-1 flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[14px] font-semibold ring-1 ring-black/[0.06]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? null : <Pencil className="h-3.5 w-3.5" />}
          {editing ? 'Save' : 'Edit'}
        </button>
      </LargeTitle>
      <p className="px-5 pb-4 text-[15px] text-ink-soft">How every Eternal post looks and sounds. Check here before you send for review.</p>
      {error && <p className="mx-4 mb-4 rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
      {editing ? (
        <div className="space-y-3 px-4 pb-6">
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
          <button
            type="button"
            onClick={() => setDraft((d) => [...d, { id: crypto.randomUUID(), title: '', body: '' }])}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] bg-white text-[15px] font-semibold"
          >
            <Plus className="h-4 w-4" /> Add section
          </button>
          <button type="button" onClick={() => setEditing(false)} className="h-11 w-full text-[15px] text-ink/50">
            Cancel
          </button>
        </div>
      ) : settings.guide.length === 0 ? (
        <Group>
          <Empty>No guide yet. Tap Edit to write one.</Empty>
        </Group>
      ) : (
        <div className="space-y-3 px-4 pb-6">
          {settings.guide.map((g) => (
            <details key={g.id} open className="group rounded-[14px] bg-white px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[17px] font-semibold">
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

function SettingsSheet({
  settings,
  me,
  onClose,
  onMe,
  onSettings,
  onImported,
}: {
  settings: StudioSettings;
  me: string;
  onClose: () => void;
  onMe: (m: string) => void;
  onSettings: (s: StudioSettings) => void;
  onImported: () => void;
}) {
  const router = useRouter();
  const [people, setPeople] = useState(settings.people.join(', '));
  const [targets, setTargets] = useState(settings.targets);
  const [json, setJson] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const r = await saveStudioSettings({ people: people.split(',').map((p) => p.trim()), targets });
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
        left={<BarButton onClick={onClose}>Cancel</BarButton>}
        right={
          <BarButton onClick={save} bold disabled={busy}>
            Save
          </BarButton>
        }
      />
      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-5">
        <section>
          <h3 className="px-4 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/45">You are</h3>
          <Segmented
            value={me}
            onChange={async (p) => {
              const r = await setStudioName(p);
              if (r.ok) onMe(p);
            }}
            options={settings.people.map((p) => ({ value: p, label: p }))}
          />
        </section>
        <section>
          <h3 className="px-4 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/45">Daily goal, all accounts</h3>
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
        <section>
          <h3 className="px-4 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/45">Team</h3>
          <input
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            className="h-[48px] w-full rounded-[14px] bg-white px-4 text-[16px] outline-none focus:ring-2 focus:ring-butter-deep"
          />
          <p className="px-4 pt-1.5 text-[13px] text-ink/40">Names, separated by commas.</p>
        </section>
        <section>
          <h3 className="px-4 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/45">Bulk import</h3>
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
        {msg && <p className="rounded-[12px] bg-butter-soft px-4 py-3 text-[14px]">{msg}</p>}
        <button
          type="button"
          onClick={async () => {
            await lockStudio();
            router.refresh();
          }}
          className="h-12 w-full rounded-[14px] bg-white text-[16px] text-red-600"
        >
          Lock studio on this device
        </button>
        <p className="px-4 text-center text-[12px] text-ink/35">The code keeps this device signed in for 24 hours.</p>
      </div>
    </>
  );
}
