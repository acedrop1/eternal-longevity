'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Wordmark } from '@/components/nav/Wordmark';
import { unlockStudio } from '@/lib/studio-actions';

export function Lock({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await unlockStudio(code);
      if (r.ok) router.refresh();
      else {
        setError(r.error);
        setCode('');
      }
    });
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-[340px] text-center">
        <span className="mx-auto mb-8 grid h-[88px] w-[88px] place-items-center rounded-[22px] bg-ink text-butter shadow-[0_18px_40px_-18px_rgba(17,17,17,0.55)]">
          <Wordmark href={null} className="text-[17px]" />
        </span>
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">Studio</h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          {configured ? 'Enter the team code. You stay signed in for 24 hours.' : 'The team code has not been set up yet.'}
        </p>
        {configured && (
          <form onSubmit={submit} className="mt-8">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              type="password"
              autoComplete="current-password"
              autoFocus
              aria-label="Team code"
              placeholder="Team code"
              className="h-[52px] w-full rounded-[14px] bg-white px-4 text-center text-[17px] tracking-[0.2em] outline-none ring-1 ring-black/[0.06] placeholder:tracking-normal placeholder:text-ink/30 focus:ring-2 focus:ring-butter-deep"
            />
            {error && (
              <p role="alert" className="mt-3 text-[14px] text-red-600">
                {error}
              </p>
            )}
            <button
              disabled={!code || pending}
              className="mt-4 h-[50px] w-full rounded-[14px] bg-ink text-[17px] font-semibold text-white transition-opacity disabled:opacity-30"
            >
              {pending ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
