'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseConfigured } from '@/lib/env';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { btnPrimary, btnSecondary, errorBox, panel } from '@/components/portal/ui';

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
      <section role="status" className={cn(panel, 'p-6 text-center md:p-8')}>
        <p className="mb-3 inline-flex items-center gap-1.5 font-mono text-[13px] text-black/70">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#D5A850]" />
          Submitted
        </p>
        <h2
          className="mb-2 font-display font-normal text-black"
          style={{ fontSize: '1.5rem', fontStretch: '75%', lineHeight: 1.1 }}
        >
          Your ID is under review.
        </h2>
        <p className="mx-auto mb-5 max-w-md text-[15px] leading-relaxed text-black/65">
          {message} Verification usually completes within one business day.
          We&apos;ll email you the moment it clears.
        </p>
        <Link
          href="/portal"
          className={btnPrimary}
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
        <p role="alert" className={errorBox}>
          {message}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/portal"
          className={btnSecondary}
        >
          Save &amp; finish later
        </Link>
        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className={btnPrimary}
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
      <h2 className="mb-1 text-[16px] font-medium text-black">{title}</h2>
      <p className="mb-3 text-[14px] text-black/60">{hint}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex w-full items-center gap-4 rounded-[4px] px-4 py-4 text-left transition-colors md:px-5 md:py-5',
          file
            ? 'border border-black/30 bg-[#F2F2F0]'
            : 'border border-dashed border-black/25 bg-[#F2F2F0] hover:bg-[#EAEAE7]',
        )}
      >
        <span
          className={cn(
            'grid h-10 w-10 flex-shrink-0 place-items-center rounded-[2px]',
            file ? 'bg-black text-white' : 'bg-white text-black/60 ring-1 ring-black/10',
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
          <span className="block truncate text-[15px] font-medium text-black">
            {file ? file.name : `Upload the ${title.toLowerCase()}`}
          </span>
          <span className="block font-mono text-[12px] text-black/55">
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
