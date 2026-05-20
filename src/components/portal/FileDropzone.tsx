'use client';

import { useRef, useState, type DragEvent } from 'react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  /** Visible heading inside the zone */
  label: string;
  /** Optional secondary line */
  hint?: string;
  /** Accepted MIME types. Passed to the file input */
  accept?: string;
  /** Max file size in MB. Files larger trigger an inline error. */
  maxMB?: number;
  /** Optional id for the underlying input (useful for testing) */
  id?: string;
}

/**
 * Visual file-drop zone used by the portal upload flows (ID verification,
 * bloodwork). For the demo it accepts a single file, shows a preview row, and
 * lets you remove or replace it. No actual upload. That wires later when the
 * backend is real.
 */
export function FileDropzone({
  label,
  hint,
  accept = 'image/*,application/pdf',
  maxMB = 10,
  id,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function acceptFile(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > maxMB * 1024 * 1024) {
      setError(`File is too large. Max ${maxMB}MB.`);
      return;
    }
    setFile(f);
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    acceptFile(f);
  }

  if (file) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 md:p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-accent text-background">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">
              {file.name}
            </div>
            <div className="text-xs text-foreground/55 mt-0.5">
              {(file.size / 1024).toFixed(0)} KB · Ready to upload
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] tracking-widest text-foreground/85 hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              REPLACE
            </button>
            <button
              type="button"
              onClick={() => acceptFile(null)}
              className="rounded-full border border-red-500/30 bg-red-500/5 px-3 py-1.5 text-[10px] tracking-widest text-red-300 hover:bg-red-500/10 transition-colors"
            >
              REMOVE
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
        />
      </div>
    );
  }

  return (
    <>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all',
          dragging
            ? 'border-accent bg-accent/10'
            : 'border-line bg-surface hover:border-foreground/30'
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
        />
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-3 text-accent"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="mb-1 text-sm font-semibold text-foreground">
          {label}
        </div>
        <div className="text-xs text-foreground/55">
          {hint ?? `PDF or image · up to ${maxMB}MB`}
        </div>
      </label>
      {error && (
        <p className="mt-2 text-xs text-red-300">{error}</p>
      )}
    </>
  );
}
