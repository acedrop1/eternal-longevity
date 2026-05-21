'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseConfigured } from '@/lib/env';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT = 'image/*,application/pdf';

type Status = 'idle' | 'uploading' | 'done' | 'error';

export function IdVerificationForm() {
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const ready = !!front && !!back && status !== 'uploading';

  function ext(file: File): string {
    const parts = file.name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
  }

  async function submit() {
    if (!front || !back) return;
    if (front.size > MAX_BYTES || back.size > MAX_BYTES) {
      setStatus('error');
      setMessage('Each file must be 10 MB or smaller.');
      return;
    }

    setStatus('uploading');
    setMessage('');

    // Demo mode — simulate a successful submission.
    if (!supabaseConfigured) {
      await new Promise((r) => setTimeout(r, 900));
      setStatus('done');
      setMessage('Submitted. Your ID is queued for review.');
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus('error');
        setMessage('Please sign in again, then resubmit.');
        return;
      }

      const folder = `${user.id}/${Date.now()}`;
      const bucket = supabase.storage.from('id-verifications');

      const f = await bucket.upload(`${folder}/front.${ext(front)}`, front);
      if (f.error) throw new Error(f.error.message);
      const b = await bucket.upload(`${folder}/back.${ext(back)}`, back);
      if (b.error) throw new Error(b.error.message);

      const { error } = await supabase
        .from('id_verifications')
        .insert({ user_id: user.id, storage_path: folder });
      if (error) throw new Error(error.message);

      setStatus('done');
      setMessage('Submitted. Your ID is now under review.');
    } catch (err) {
      setStatus('error');
      setMessage(
        err instanceof Error
          ? err.message
          : 'Upload failed. Please try again.',
      );
    }
  }

  if (status === 'done') {
    return (
      <section className="rounded-3xl border border-accent/30 bg-accent/5 p-6 md:p-8 text-center">
        <div className="mb-2 text-[10px] tracking-widest text-accent">
          SUBMITTED
        </div>
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
          Your ID is under review.
        </h2>
        <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-foreground/65">
          {message} Verification usually completes within one business day.
          We&apos;ll email you the moment it clears.
        </p>
        <Link
          href="/portal"
          className="inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-accent-soft"
        >
          Back to dashboard
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <FilePick
        title="Front of ID"
        hint="Clear and well-lit. All four corners visible, no glare."
        file={front}
        onPick={setFront}
      />
      <FilePick
        title="Back of ID"
        hint="We use the back to confirm the address and barcode."
        file={back}
        onPick={setBack}
      />

      {status === 'error' && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {message}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/portal"
          className="rounded-full border border-line bg-surface px-5 py-3 text-center text-sm text-foreground/85 transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          Save &amp; finish later
        </Link>
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className={cn(
            'rounded-full px-7 py-3 text-sm font-semibold transition-all duration-200',
            ready
              ? 'bg-accent text-black hover:bg-accent-soft active:scale-[0.98]'
              : 'cursor-not-allowed bg-foreground/15 text-foreground/40',
          )}
        >
          {status === 'uploading'
            ? 'Uploading…'
            : 'Submit for verification →'}
        </button>
      </div>
    </section>
  );
}

function FilePick({
  title,
  hint,
  file,
  onPick,
}: {
  title: string;
  hint: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mb-3 text-xs text-foreground/55">{hint}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl border border-dashed px-5 py-5 text-left transition-colors',
          file
            ? 'border-accent/50 bg-accent/5'
            : 'border-line bg-background hover:border-foreground/30',
        )}
      >
        <span
          className={cn(
            'grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl',
            file ? 'bg-accent/15 text-accent' : 'bg-foreground/10 text-foreground/55',
          )}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {file ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </>
            )}
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {file ? file.name : `Upload the ${title.toLowerCase()}`}
          </span>
          <span className="block text-xs text-foreground/55">
            {file ? 'Tap to replace' : 'PDF or image, up to 10 MB'}
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
