'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, Check, FileText, Link2, Loader2, Paperclip, Play, Send, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useConfirm } from '@/components/ui/useConfirm';
import {
  commentOnStudioItem,
  deleteStudioItem,
  saveStudioItem,
  studioFileUrls,
  studioUploadSlot,
} from '@/lib/studio-actions';
import {
  BRAND_LABEL,
  FLOW,
  KINDS,
  KIND_LABEL,
  MEMBER_KINDS,
  PLATFORMS,
  STATUS_LABEL,
  VERDICTS,
  canAssign,
  finishedStatus,
  isFinished,
  type Brand,
  type Kind,
  type Status,
  type StudioFile,
  type StudioItem,
  type StudioUser,
} from '@/lib/studio-types';
import { BarButton, BrandDot, Linkified, Segmented, SheetBar, StatusPill, dayLabel, longDay } from './ui';

export function blankItem(me: string, preset: Partial<StudioItem> = {}): StudioItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    kind: 'task',
    title: '',
    notes: '',
    brand: 'longevity',
    platforms: [],
    due: null,
    status: 'todo',
    assignee: '',
    flagged: false,
    links: [],
    files: [],
    comments: [],
    completedOn: null,
    createdBy: me,
    createdAt: now,
    updatedAt: now,
    ...preset,
  };
}

/** Puts files in the private bucket; returns them with read links. */
export async function uploadFiles(itemId: string, list: FileList | File[]): Promise<{ files: StudioFile[]; error?: string }> {
  const out: StudioFile[] = [];
  const supabase = createSupabaseBrowserClient();
  for (const file of Array.from(list)) {
    const slot = await studioUploadSlot(itemId, file.name);
    if (!slot.ok) return { files: out, error: slot.error };
    const { error } = await supabase.storage
      .from('studio')
      .uploadToSignedUrl(slot.data.path, slot.data.token, file, { contentType: file.type || undefined });
    if (error) {
      const big = /size|large|413/i.test(error.message);
      return {
        files: out,
        error: big ? `${file.name} is too big to upload. Export it smaller, or add a Google Drive link instead.` : error.message,
      };
    }
    out.push({ path: slot.data.path, name: file.name, type: file.type || 'application/octet-stream', size: file.size });
  }
  const urls = await studioFileUrls(out.map((f) => f.path));
  return { files: out.map((f) => ({ ...f, url: urls.ok ? urls.data[f.path] : undefined })) };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-h-[48px] items-center justify-between gap-4 px-4 py-1.5 [&+&]:border-t [&+&]:border-black/[0.06]">
      <span className="text-[16px]">{label}</span>
      {children}
    </label>
  );
}

const Heading = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <h3 className="flex items-center justify-between px-4 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-ink/45">
    {children}
    {right}
  </h3>
);

const selectCls =
  'h-9 max-w-[60%] appearance-none rounded-[8px] bg-black/[0.04] px-3 text-right text-[15px] text-ink/70 outline-none focus:ring-2 focus:ring-butter-deep disabled:opacity-60';

export function FileTile({ file, onRemove }: { file: StudioFile; onRemove?: () => void }) {
  const isImg = file.type.startsWith('image/');
  const isVid = file.type.startsWith('video/');
  return (
    <div className="relative aspect-square overflow-hidden rounded-[12px] bg-black/[0.05]">
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="block h-full w-full" aria-label={`Open ${file.name}`}>
        {file.url && isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.url} alt={file.name} className="h-full w-full object-cover" loading="lazy" />
        ) : file.url && isVid ? (
          <>
            <video src={`${file.url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-white/85 backdrop-blur">
                <Play className="ml-0.5 h-4 w-4 fill-ink" />
              </span>
            </span>
          </>
        ) : (
          <span className="grid h-full w-full place-items-center p-2 text-center text-[12px] text-ink/50">
            <FileText className="mb-1 h-5 w-5" />
            {file.name}
          </span>
        )}
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/60 text-white backdrop-blur"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ItemSheet({
  start,
  isNew,
  me,
  people,
  onClose,
  bindClose,
  onSaved,
  onDeleted,
}: {
  start: StudioItem;
  isNew: boolean;
  me: StudioUser;
  people: string[];
  onClose: () => void;
  bindClose?: (fn: () => void) => void;
  onSaved: (item: StudioItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [item, setItem] = useState(start);
  const [saved, setSaved] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirm, confirmDialog] = useConfirm();
  const [snap, setSnap] = useState(() => JSON.stringify(start));

  const manager = canAssign(me.role);
  // Adam and Mo edit anything; content edits only what they added themselves.
  const editable = manager || isNew || start.createdBy === me.name;
  const set = <K extends keyof StudioItem>(k: K, v: StudioItem[K]) => setItem((i) => ({ ...i, [k]: v }));
  const flow = (FLOW[item.kind].includes(item.status) ? FLOW[item.kind] : [...FLOW[item.kind], item.status]).filter(
    (s) => manager || !VERDICTS.includes(s) || s === item.status,
  );
  const content = item.kind === 'post' || item.kind === 'story';
  const finished = finishedStatus(item.kind);
  const kinds = manager ? [...KINDS] : MEMBER_KINDS;

  const persist = async (next: StudioItem) => {
    const r = await saveStudioItem(next);
    if (!r.ok) {
      setError(r.error);
      return null;
    }
    setSaved(true);
    setItem(r.data);
    setSnap(JSON.stringify(r.data));
    onSaved(r.data);
    return r.data;
  };

  const done = async () => {
    if (!item.title.trim() && !item.files.length && !item.links.length) return onClose();
    setBusy(true);
    const r = await persist(item);
    setBusy(false);
    if (r) onClose();
  };

  // Closing by clicking outside keeps your edits; only Cancel throws them away.
  const dirty = JSON.stringify(item) !== snap;
  // Braces matter: returning the function would make React run it as cleanup on every render.
  useEffect(() => {
    bindClose?.(() => (dirty ? void done() : onClose()));
  });

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    setUploading(list.length);
    const { files, error: e } = await uploadFiles(item.id, list);
    setUploading(0);
    if (e) setError(e);
    if (!files.length) return;
    const next = { ...item, files: [...item.files, ...files], title: item.title || (item.kind === 'inspo' ? 'Inspo' : item.title) };
    setItem(next);
    // A saved item keeps its uploads right away, so closing the sheet cannot lose them.
    if (saved) await persist(next);
  };

  const addLink = () => {
    const url = link.trim().match(/https?:\/\/\S+/)?.[0];
    if (!url) return setError('Paste a full link that starts with https://');
    setError(null);
    setItem((i) => ({ ...i, links: [...i.links, { url }], title: i.title || (i.kind === 'inspo' ? new URL(url).hostname.replace(/^www\./, '') : i.title) }));
    setLink('');
  };

  const comment = async (verdict?: 'approved' | 'changes' | 'review') => {
    if (verdict === 'changes' && !note.trim()) return setError('Write what to change in the note box first.');
    setError(null);
    setBusy(true);
    // Unsaved edits go in first, so the verdict lands on the latest version.
    const base = await persist(item);
    const r = base && (await commentOnStudioItem(item.id, note, verdict));
    setBusy(false);
    if (!r) return;
    if (!r.ok) return setError(r.error);
    setItem(r.data);
    onSaved(r.data);
    setNote('');
  };

  const finish = async () => {
    setBusy(true);
    const next = { ...item, status: isFinished(item.status) ? flow[0] : finished };
    await persist(next);
    setBusy(false);
  };

  const remove = async () => {
    if (!(await confirm({ title: `Delete “${item.title || 'this'}”?`, body: 'Its files and notes go too. This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
    if (saved) {
      const r = await deleteStudioItem(item.id);
      if (!r.ok) return setError(r.error);
    }
    onDeleted(item.id);
    onClose();
  };

  /* ----- the next step, in plain words ----- */
  const nextStep =
    item.kind === 'inspo' || isNew ? null : item.status === 'review' ? (
      manager ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => comment('changes')} className="h-12 rounded-[12px] bg-peach/70 text-[15px] font-semibold">
            Ask for changes
          </button>
          <button type="button" disabled={busy} onClick={() => comment('approved')} className="flex h-12 items-center justify-center gap-1.5 rounded-[12px] bg-emerald-600 text-[15px] font-semibold text-white">
            <Check className="h-4 w-4" strokeWidth={3} /> Approve
          </button>
        </div>
      ) : (
        <p className="rounded-[12px] bg-butter-soft px-4 py-3 text-[15px]">Sent for review. Adam or Mo will approve it or ask for changes.</p>
      )
    ) : (
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy || isFinished(item.status)}
          onClick={() => comment('review')}
          className="flex h-12 items-center justify-center gap-1.5 rounded-[12px] bg-butter text-[15px] font-semibold disabled:opacity-40"
        >
          <Send className="h-4 w-4" /> Send for review
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={finish}
          className={cn('flex h-12 items-center justify-center gap-1.5 rounded-[12px] text-[15px] font-semibold', isFinished(item.status) ? 'bg-black/[0.06]' : 'bg-ink text-white')}
        >
          {isFinished(item.status) ? 'Reopen' : (<><Check className="h-4 w-4" strokeWidth={3} /> {content ? 'Mark posted' : 'Mark done'}</>)}
        </button>
      </div>
    );

  const lastChange = [...item.comments].reverse().find((c) => c.verdict === 'changes');

  return (
    <>
      {confirmDialog}
      <SheetBar
        title={isNew ? `New ${KIND_LABEL[item.kind].toLowerCase()}` : KIND_LABEL[item.kind]}
        left={<BarButton onClick={onClose}>{editable ? 'Cancel' : 'Close'}</BarButton>}
        right={
          <BarButton onClick={done} bold disabled={busy || uploading > 0}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : isNew ? 'Add' : 'Save'}
          </BarButton>
        }
      />
      <div className="flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="space-y-5 px-4 pt-4">
          {/* What it is and what to do */}
          {editable ? (
            <div className="rounded-[14px] bg-white px-4 py-3">
              <textarea
                value={item.title}
                onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))}
                placeholder={item.kind === 'inspo' ? 'What is this? (optional)' : 'Task in a few words'}
                rows={1}
                autoFocus={isNew && item.kind !== 'inspo'}
                className="w-full resize-none bg-transparent text-[20px] font-semibold leading-snug outline-none [field-sizing:content] placeholder:text-ink/25"
              />
              <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink/40">{item.kind === 'inspo' ? 'Why it’s here' : 'What to do'}</p>
              <textarea
                value={item.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder={item.kind === 'inspo' ? 'What to take from it' : 'Spell it out: the steps, what “done” looks like, any links.'}
                rows={3}
                className="mt-1 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink/80 outline-none [field-sizing:content] placeholder:text-ink/25"
              />
            </div>
          ) : (
            <div className="rounded-[14px] bg-white px-4 py-4">
              <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink/50">
                <BrandDot brand={item.brand} />
                {KIND_LABEL[item.kind]} · {BRAND_LABEL[item.brand]}
                <StatusPill status={item.status} />
              </p>
              <h2 className="mt-2 text-[22px] font-bold leading-snug tracking-[-0.01em]">{item.title}</h2>
              <p className="mt-1 text-[14px] text-ink/55">
                From {item.createdBy}
                {item.due && (
                  <>
                    {' · '}
                    <span className="font-semibold text-ink">
                      Due {dayLabel(item.due)}
                      {dayLabel(item.due).length < 10 && ` (${longDay(item.due)})`}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink/40">What to do</p>
              {item.notes.trim() ? (
                <Linkified text={item.notes} className="mt-1 text-[16px] leading-relaxed text-ink/85" />
              ) : (
                <p className="mt-1 text-[15px] text-ink/40">Do what the title says. Ask in the notes below if anything is unclear.</p>
              )}
            </div>
          )}

          {lastChange && item.status === 'changes' && (
            <div className="rounded-[14px] bg-peach/40 px-4 py-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-ink/60">Changes {lastChange.by} asked for</p>
              <Linkified text={lastChange.body || 'See the notes below.'} className="mt-1 text-[15px] leading-relaxed" />
            </div>
          )}

          {nextStep}

          {/* Details */}
          {editable ? (
            <>
              <Segmented<Kind>
                value={item.kind}
                onChange={(k) => setItem((i) => ({ ...i, kind: k, status: FLOW[k].includes(i.status) ? i.status : FLOW[k][0] }))}
                options={kinds.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
              />
              <Segmented<Brand>
                value={item.brand}
                onChange={(b) => set('brand', b)}
                options={(['longevity', 'hair', 'both'] as Brand[]).map((b) => ({ value: b, label: b === 'both' ? 'Collab' : BRAND_LABEL[b].replace('Eternal ', '') }))}
              />
            </>
          ) : null}

          {item.kind !== 'inspo' && (
            <div className="overflow-hidden rounded-[14px] bg-white">
              <Field label="Status">
                <select value={item.status} onChange={(e) => set('status', e.target.value as Status)} className={selectCls}>
                  {flow.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              {editable && (
                <>
                  <Field label={item.kind === 'shoot' ? 'Shoot date' : content ? 'Post date' : 'Due'}>
                    <input type="date" value={item.due ?? ''} onChange={(e) => set('due', e.target.value || null)} className={cn(selectCls, 'min-w-[140px]')} />
                  </Field>
                  <Field label="For">
                    <select value={item.assignee} onChange={(e) => set('assignee', e.target.value)} className={selectCls} disabled={!manager}>
                      <option value="">Anyone</option>
                      {[...new Set([...people, item.assignee].filter(Boolean))].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Urgent">
                    <input type="checkbox" checked={item.flagged} onChange={(e) => set('flagged', e.target.checked)} className="peer sr-only" />
                    <span className="relative h-[31px] w-[51px] rounded-full bg-black/10 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-[27px] after:w-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-butter-deep peer-checked:after:translate-x-[20px] peer-focus-visible:ring-2 peer-focus-visible:ring-ink" />
                  </Field>
                </>
              )}
            </div>
          )}

          {content && (
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = item.platforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('platforms', on ? item.platforms.filter((x) => x !== p) : [...item.platforms, p])}
                    className={cn('h-[34px] rounded-full px-3.5 text-[14px] font-semibold', on ? 'bg-ink text-white' : 'bg-white text-ink/60 ring-1 ring-black/[0.06]')}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          )}

          {/* Files and links */}
          <section>
            <Heading>{editable ? 'Files & links' : 'Files & links (add your work here)'}</Heading>
            <div className="rounded-[14px] bg-white p-3">
              {item.files.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {item.files.map((f) => (
                    <FileTile key={f.path} file={f} onRemove={() => set('files', item.files.filter((x) => x.path !== f.path))} />
                  ))}
                </div>
              )}
              {item.links.map((l, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-black/[0.06] py-2 last:border-0">
                  <Link2 className="h-4 w-4 shrink-0 text-ink/40" />
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[15px] underline decoration-butter-deep decoration-2 underline-offset-2">
                    {l.label || l.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                  <button type="button" aria-label="Remove link" onClick={() => set('links', item.links.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center text-ink/35">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="mt-2 flex gap-2">
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                  inputMode="url"
                  placeholder="Paste a link (Drive, Instagram, Pinterest…)"
                  className="h-10 min-w-0 flex-1 rounded-[10px] bg-black/[0.04] px-3 text-[15px] outline-none focus:ring-2 focus:ring-butter-deep"
                />
                <button type="button" onClick={addLink} disabled={!link.trim()} className="h-10 rounded-[10px] bg-black/[0.06] px-3 text-[15px] font-semibold disabled:opacity-40">
                  Add
                </button>
              </div>
              <input ref={fileInput} type="file" multiple accept="image/*,video/*,application/pdf" hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading > 0}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-butter text-[15px] font-semibold text-ink disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                {uploading ? `Uploading ${uploading} file${uploading > 1 ? 's' : ''}…` : 'Add photos or videos'}
              </button>
            </div>
          </section>

          {error && (
            <p role="alert" className="rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-700">
              {error}
            </p>
          )}

          {/* Notes thread */}
          {item.kind !== 'inspo' && !isNew && (
            <section>
              <Heading>Notes</Heading>
              <div className="rounded-[14px] bg-white p-3">
                {item.comments.length === 0 && <p className="px-1 pb-3 text-[14px] text-ink/40">No notes yet. Questions, feedback and approvals go here.</p>}
                <ul className="space-y-2 pb-3">
                  {item.comments.map((c) => {
                    const mine = c.by === me.name;
                    return (
                      <li key={c.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                        <span className="px-2 pb-0.5 text-[11px] text-ink/40">
                          {c.by} · {new Date(c.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}
                        </span>
                        <div className={cn('max-w-[85%] rounded-[18px] px-3.5 py-2 text-[15px] leading-snug', mine ? 'rounded-br-[6px] bg-ink text-white' : 'rounded-bl-[6px] bg-black/[0.05]')}>
                          {c.verdict && (
                            <p className={cn('text-[12px] font-bold uppercase tracking-[0.04em]', c.verdict === 'approved' ? 'text-emerald-500' : 'text-orange-500')}>
                              {c.verdict === 'approved' ? '✓ Approved' : 'Changes asked'}
                            </p>
                          )}
                          {c.body && <Linkified text={c.body} />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex items-end gap-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={1}
                    placeholder={manager ? 'Add a note or feedback' : 'Ask a question or add a note'}
                    className="max-h-40 min-h-[40px] flex-1 resize-none rounded-[20px] bg-black/[0.04] px-4 py-2.5 text-[15px] outline-none [field-sizing:content] focus:ring-2 focus:ring-butter-deep"
                  />
                  <button
                    type="button"
                    aria-label="Send note"
                    disabled={!note.trim() || busy}
                    onClick={() => comment()}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-butter-deep text-ink disabled:opacity-30"
                  >
                    <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </section>
          )}

          {!isNew && (
            <p className="px-4 text-[12px] text-ink/35">
              Added by {item.createdBy || 'the team'} · {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}
            </p>
          )}

          {editable && !isNew && (
            <button type="button" onClick={remove} className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[16px] text-red-600">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
}
