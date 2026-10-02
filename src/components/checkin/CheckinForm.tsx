'use client';

import { useState, useTransition } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { submitCheckinAction } from '@/lib/checkin-actions';
import { cn } from '@/lib/utils';

// HomeSections' ArrowDot, copied: that module pulls in server-only catalogue code.
function ArrowDot() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110">
      <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
    </span>
  );
}

const ERRORS: Record<string, string> = {
  invalid_link: 'This link has expired or isn’t valid any more.',
  not_configured: 'Check-ins aren’t available right now.',
};

/**
 * One question, a 1–5 score and an optional comment. Everyone who answers sees
 * the same thank-you and the same review link, whatever their score: gating
 * the review ask on a good rating is against the FTC's rule and Google's
 * policy.
 */
export function CheckinForm({
  token,
  initialRating,
  answered,
  googleReviewUrl,
}: {
  token: string;
  initialRating: number | null;
  answered: boolean;
  googleReviewUrl: string;
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(answered);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="rounded-shell bg-milk p-6 md:p-8">
        <h2 className="mb-3 text-[28px] font-semibold leading-[1] tracking-[-0.04em] text-ink md:text-[36px]">
          Thank you.
        </h2>
        <p className="text-[16px] leading-relaxed text-ink-soft">
          Your answer goes straight to your care team. If anything needs a
          follow-up, we’ll be in touch.
        </p>
        {googleReviewUrl && (
          <>
            <p className="mt-6 text-[16px] leading-relaxed text-ink-soft">
              If you have a minute, a Google review helps other people find us.
            </p>
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-4 inline-flex items-center gap-2 rounded-full bg-butter py-2 pl-6 pr-2 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              Leave a Google review
              <ArrowDot />
            </a>
          </>
        )}
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError('Pick a number from 1 to 5.');
      return;
    }
    setError(null);
    start(async () => {
      const res = await submitCheckinAction({ token, rating, comment });
      if (res.ok) setDone(true);
      else setError(ERRORS[res.error ?? ''] ?? res.error ?? 'Something went wrong. Please try again.');
    });
  };

  return (
    <form onSubmit={submit} className="rounded-shell bg-milk p-6 md:p-8">
      <fieldset>
        <legend className="mb-3 text-[13px] font-medium text-ink/70">
          1 = not well, 5 = very well
        </legend>
        <div role="radiogroup" aria-label="Your rating" className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onClick={() => setRating(n)}
              className={cn(
                'grid h-12 w-12 place-items-center rounded-full text-[17px] font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 md:h-14 md:w-14',
                rating === n ? 'bg-butter text-ink' : 'bg-white text-ink ring-1 ring-ink/10 hover:bg-milk-deep',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="checkin-comment" className="mb-2 mt-6 block text-[13px] font-medium text-ink/70">
        Anything you’d like us to know? (optional)
      </label>
      <textarea
        id="checkin-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        rows={4}
        className="w-full rounded-inner bg-white px-4 py-3.5 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30"
      />

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group mt-6 inline-flex items-center gap-2 rounded-full bg-butter py-2 pl-6 pr-2 text-[15px] font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Submit'}
        <ArrowDot />
      </button>
      <p className="mt-4 text-[13px] leading-relaxed text-ink/65">
        Questions about dosing or side effects go to your prescriber through
        your portal messages.
      </p>
    </form>
  );
}
