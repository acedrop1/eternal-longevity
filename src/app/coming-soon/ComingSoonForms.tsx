'use client';

import { useActionState } from 'react';
import { joinWaitlistAction, unlockAction, type FormState } from './actions';

const INPUT =
  'h-12 w-full min-w-0 rounded-full bg-white/90 px-5 text-[16px] text-ink placeholder:text-ink/60 focus:outline-none focus:ring-2 focus:ring-butter';

export function WaitlistForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(joinWaitlistAction, {});
  if (state.ok) {
    return (
      <p role="status" className="rounded-full bg-white/20 px-5 py-3 text-[15px] font-medium ring-1 ring-white/35 backdrop-blur-xl">
        You&apos;re on the list. We&apos;ll email you the moment we open.
      </p>
    );
  }
  return (
    <form action={action} className="flex w-full max-w-[480px] flex-col gap-2 sm:flex-row">
      <label htmlFor="email" className="sr-only">Email address</label>
      <input id="email" name="email" type="email" required autoComplete="email" placeholder="Your email" className={INPUT} />
      {/* Honeypot: hidden from people, filled by bots. */}
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button
        type="submit"
        disabled={pending}
        className="h-12 shrink-0 rounded-full bg-butter px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-butter-deep disabled:opacity-60"
      >
        {pending ? 'Adding…' : 'Notify me'}
      </button>
      {state.error && <p role="alert" className="text-[14px] text-white sm:basis-full">{state.error}</p>}
    </form>
  );
}

export function TeamAccess() {
  const [state, action, pending] = useActionState<FormState, FormData>(unlockAction, {});
  return (
    <details className="text-[13px] text-white/70">
      <summary className="cursor-pointer select-none hover:text-white">Team access</summary>
      <form action={action} className="mt-3 flex max-w-[360px] gap-2">
        <label htmlFor="password" className="sr-only">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Password" className={INPUT} />
        <button type="submit" disabled={pending} className="h-12 shrink-0 rounded-full bg-white/20 px-5 text-[14px] font-semibold text-white ring-1 ring-white/35 hover:bg-white/30 disabled:opacity-60">
          {pending ? '…' : 'Enter'}
        </button>
      </form>
      {state.error && <p role="alert" className="mt-2 text-white">{state.error}</p>}
    </details>
  );
}
