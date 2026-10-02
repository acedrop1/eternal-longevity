'use client';

/**
 * Visit photos (photo-upload) and documents (file-upload).
 *
 * Files go straight from the browser to the private `intake-media` bucket at
 * <auth uid>/<visit id>/<field>-<slot>-<stamp>.<ext> (migration 0019). Members
 * can insert but never overwrite, so a retake is a new file. The answer holds
 * storage paths only: { slot, path }[] for photos, string[] for files.
 * Without Supabase (local demo) nothing is uploaded and the path is a
 * `demo/` placeholder; the preview still works.
 */
import { useRef, useState } from 'react';
import { Camera, FileText, Lock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/env';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { MAX_FILES } from '@/lib/intake-rules';
import type { Field } from '@/lib/intakeSchema';

const BUCKET = 'intake-media';
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 1800;
const FAILED = 'Upload failed. Check your connection and try again.';

type Shot = { slot: string; path: string };
/** Takes a value or an updater, so two uploads finishing together don't clobber each other. */
type OnChange = (v: unknown) => void;
type Busy = { pct: number; error?: string; file: File };

// Previews and file names by storage path. Memory only: never saved anywhere.
const previews = new Map<string, string>();
const names = new Map<string, string>();

/** Long edge to 1800px, re-encoded as JPEG (which drops EXIF). Null when the browser can't decode it (HEIC on most non-Apple browsers). */
async function compress(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    // onload, not decode(): decode() can stall in a tab that isn't painting.
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Some browsers leave HEIC's type blank; the bucket only accepts listed types. */
function mimeOf(file: File): string {
  if (file.type) return file.type;
  if (/\.hei[cf]$/i.test(file.name)) return 'image/heic';
  if (/\.pdf$/i.test(file.name)) return 'application/pdf';
  return 'application/octet-stream';
}

function extOf(file: File): string {
  const m = /\.([a-z0-9]{1,5})$/i.exec(file.name);
  return m ? m[1].toLowerCase() : 'bin';
}

const stamp = () => Date.now().toString(36);

/**
 * POST to Storage with XHR for upload progress (supabase-js has none).
 * `name` is the path under the member's own folder; returns the full path.
 */
async function upload(name: string, body: Blob, type: string, onPct: (n: number) => void): Promise<string> {
  if (!supabaseConfigured) {
    onPct(100);
    return `demo/${name}`;
  }
  const { data } = await createSupabaseBrowserClient().auth.getSession();
  const session = data.session;
  if (!session) throw new Error('Please sign in again, then retry.');
  const path = `${session.user.id}/${name}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Content-Type', type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status < 300
        ? resolve()
        : reject(new Error(xhr.status === 413 ? 'That file is over 10 MB.' : xhr.status === 415 ? "That file type isn't supported." : FAILED));
    xhr.onerror = () => reject(new Error(FAILED));
    xhr.send(body);
  });
  return path;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : FAILED);

function PrivacyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-ink/60">
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 flex-none" strokeWidth={2} />
      {children}
    </p>
  );
}

function Progress({ pct }: { pct: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
      <span className="block h-full rounded-full bg-ink transition-[width] duration-200" style={{ width: `${Math.max(pct, 4)}%` }} />
    </span>
  );
}

const SMALL_BTN =
  'inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-white px-4 text-[14px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:bg-milk-deep';

/* ------------------------------------------------------------------------- */

export function PhotoUpload({ field, value, onChange, folder }: { field: Field; value: unknown; onChange: OnChange; folder: string }) {
  const shots = Array.isArray(value) ? (value as Shot[]) : [];
  const [busy, setBusy] = useState<Record<string, Busy>>({});

  async function take(slot: string, file: File) {
    setBusy((b) => ({ ...b, [slot]: { pct: 0, file } }));
    try {
      const small = await compress(file);
      const body = small ?? file;
      if (body.size > MAX_BYTES) throw new Error('That photo is over 10 MB. Try another.');
      const path = await upload(
        `${folder}/${field.id}-${slot}-${stamp()}.${small ? 'jpg' : extOf(file)}`,
        body,
        small ? 'image/jpeg' : mimeOf(file),
        (pct) => setBusy((b) => ({ ...b, [slot]: { pct, file } })),
      );
      if (small) previews.set(path, URL.createObjectURL(small));
      onChange((prev: unknown) => [...(Array.isArray(prev) ? (prev as Shot[]) : []).filter((s) => s.slot !== slot), { slot, path }]);
      setBusy(({ [slot]: _done, ...rest }) => rest);
    } catch (e) {
      setBusy((b) => ({ ...b, [slot]: { pct: 0, file, error: errMsg(e) } }));
    }
  }

  function remove(slot: string) {
    onChange((prev: unknown) => (Array.isArray(prev) ? (prev as Shot[]).filter((s) => s.slot !== slot) : []));
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {(field.slots ?? []).map((s) => (
          <SlotCard
            key={s.id}
            label={s.label}
            hint={s.hint}
            shot={shots.find((x) => x.slot === s.id)}
            busy={busy[s.id]}
            onPick={(f) => take(s.id, f)}
            onRemove={() => remove(s.id)}
          />
        ))}
      </div>
      <PrivacyNote>Your photos are stored privately and shared only with your care team.</PrivacyNote>
    </div>
  );
}

function SlotCard({
  label,
  hint,
  shot,
  busy,
  onPick,
  onRemove,
}: {
  label: string;
  hint: string;
  shot?: Shot;
  busy?: Busy;
  onPick: (f: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pick = () => input.current?.click();
  const preview = shot ? previews.get(shot.path) : undefined;

  return (
    <div className={cn('flex flex-col rounded-inner p-3 transition-shadow', shot ? 'bg-white ring-2 ring-ink' : 'bg-milk')}>
      <div className="px-1 pb-3 pt-1">
        <p className="text-[15px] font-semibold leading-snug text-ink">{label}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink/60">{hint}</p>
      </div>

      {busy && !busy.error ? (
        <div aria-live="polite" className="flex min-h-[112px] flex-col items-center justify-center gap-3 rounded-thumb bg-white px-4 ring-1 ring-ink/10 md:aspect-[4/5] md:min-h-0">
          <span className="text-[14px] font-medium text-ink/70">Uploading… {busy.pct}%</span>
          <Progress pct={busy.pct} />
        </div>
      ) : shot ? (
        <>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img src={preview} alt={`${label}, your photo`} className="aspect-[4/3] w-full rounded-thumb object-cover md:aspect-[4/5]" />
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center rounded-thumb bg-milk text-[14px] font-medium text-ink/70 md:aspect-[4/5]">
              Photo added
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={pick} className={SMALL_BTN}>
              Retake
            </button>
            <button type="button" onClick={onRemove} className={SMALL_BTN}>
              Remove
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={pick}
          className="flex min-h-[112px] w-full flex-col items-center justify-center gap-2 rounded-thumb border border-dashed border-ink/25 bg-white px-4 py-5 text-center transition-colors hover:border-ink/50 hover:bg-milk-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 md:aspect-[4/5] md:min-h-0"
        >
          <Camera aria-hidden className="h-6 w-6 text-ink/70" strokeWidth={1.6} />
          <span className="text-[15px] font-semibold text-ink">Take or choose photo</span>
        </button>
      )}

      {busy?.error && (
        <div role="alert" className="mt-3 flex min-h-[44px] items-center justify-between gap-3 rounded-thumb bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <span>{busy.error}</span>
          {busy.error === FAILED && (
            <button type="button" onClick={() => onPick(busy.file)} className="min-h-[44px] flex-none font-semibold underline underline-offset-[3px]">
              Retry
            </button>
          )}
        </div>
      )}

      {/* No `capture`: phones offer camera or library. Reset so the same file can be picked again. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------- */

export function FileUpload({ field, value, onChange, folder }: { field: Field; value: unknown; onChange: OnChange; folder: string }) {
  const paths = Array.isArray(value) ? (value as string[]) : [];
  const [busy, setBusy] = useState<Busy | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function add(file: File) {
    setBusy({ pct: 0, file });
    try {
      if (file.size > MAX_BYTES) throw new Error('That file is over 10 MB.');
      const path = await upload(`${folder}/${field.id}-${stamp()}.${extOf(file)}`, file, mimeOf(file), (pct) => setBusy({ pct, file }));
      names.set(path, file.name);
      onChange((prev: unknown) => [...(Array.isArray(prev) ? (prev as string[]) : []), path].slice(0, MAX_FILES));
      setBusy(null);
    } catch (e) {
      setBusy({ pct: 0, file, error: errMsg(e) });
    }
  }

  return (
    <div>
      {paths.length > 0 && (
        <ul className="mb-3 grid gap-2">
          {paths.map((p) => (
            <li key={p} className="flex min-h-[56px] items-center gap-3 rounded-inner bg-milk py-1.5 pl-4 pr-1.5">
              <FileText aria-hidden className="h-5 w-5 flex-none text-ink/60" strokeWidth={1.6} />
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{names.get(p) ?? p.split('/').pop()}</span>
              <button
                type="button"
                aria-label={`Remove ${names.get(p) ?? 'file'}`}
                onClick={() => onChange((prev: unknown) => (Array.isArray(prev) ? (prev as string[]).filter((x) => x !== p) : []))}
                className="grid h-11 w-11 flex-none place-items-center rounded-full text-ink/60 transition-colors hover:bg-white hover:text-ink"
              >
                <X aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {busy && !busy.error && (
        <div aria-live="polite" className="mb-3 grid gap-2 rounded-inner bg-milk px-4 py-3">
          <span className="truncate text-[14px] text-ink/70">Uploading {busy.file.name}… {busy.pct}%</span>
          <Progress pct={busy.pct} />
        </div>
      )}
      {busy?.error && (
        <div role="alert" className="mb-3 flex min-h-[44px] items-center justify-between gap-3 rounded-inner bg-red-50 px-4 py-2 text-[13px] text-red-700">
          <span>{busy.error}</span>
          {busy.error === FAILED && (
            <button type="button" onClick={() => add(busy.file)} className="min-h-[44px] flex-none font-semibold underline underline-offset-[3px]">
              Retry
            </button>
          )}
        </div>
      )}

      {paths.length < MAX_FILES && !(busy && !busy.error) && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex min-h-[64px] w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-inner py-3 text-center border border-dashed border-ink/25 bg-milk px-4 text-[15px] font-semibold text-ink transition-colors hover:border-ink/50 hover:bg-milk-deep"
        >
          <FileText aria-hidden className="h-5 w-5 text-ink/70" strokeWidth={1.6} />
          {paths.length ? 'Add another file' : 'Add a file'}
          <span className="font-normal text-ink/65">· PDF or image, up to 10 MB</span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={field.accept ?? 'application/pdf,image/*'}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) add(f);
        }}
      />
      <PrivacyNote>Stored privately and shared only with your care team.</PrivacyNote>
    </div>
  );
}
