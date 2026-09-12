'use client';

import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * Submit button for a server-action form.
 *
 * A plain form posting to a server action gives no feedback at all: the page
 * sits still while the round trip happens, so pressing Log in looked like
 * pressing nothing. useFormStatus is the one thing that knows the form is in
 * flight, and it only works from inside the form — hence a component rather
 * than a prop.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-base font-semibold text-black transition-colors hover:bg-accent-soft disabled:cursor-wait disabled:opacity-75',
        className,
      )}
    >
      {pending && (
        <svg
          className="animate-spin"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.25"
          />
          <path
            d="M22 12a10 10 0 0 0-10-10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
