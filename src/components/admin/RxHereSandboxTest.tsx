'use client';

import { useState, useTransition } from 'react';
import { rxhereSandboxTestAction } from '@/lib/settings-actions';

/** Admin → Settings: one made-up prescription to RxHere's sandbox; shows what it said. */
export function RxHereSandboxTest() {
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              setNote(await rxhereSandboxTestAction());
            } catch {
              setNote({ ok: false, message: 'Request failed. Try again.' });
            }
          })
        }
        className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink/85 disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send sandbox test'}
      </button>
      <span className="text-[13px] text-ink/60">A made-up patient ordering enclomiphene; RxHere checks every field and creates nothing.</span>
      {note && <p role={note.ok ? 'status' : 'alert'} className={`w-full text-[13px] ${note.ok ? 'text-emerald-800' : 'text-red-700'}`}>{note.message}</p>}
    </div>
  );
}
