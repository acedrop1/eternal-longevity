'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLandingPublishedAction } from '@/lib/landing-actions';
import { useConfirm } from '@/components/ui/useConfirm';

/** Publish or unpublish one landing page, with a confirm before it goes public. */
export function PublishToggle({ slug, published }: { slug: string; published: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const flip = () =>
    start(async () => {
      if (
        !published &&
        !(await confirm({
          title: `Publish /${slug}?`,
          body: 'Anyone with the link can see it, and ads can point to it. Make sure the wording is approved.',
          confirmLabel: 'Publish',
        }))
      )
        return;
      const res = await setLandingPublishedAction(slug, !published);
      if (!res.ok) setError(res.message);
      else router.refresh();
    });
  return (
    <>
      {confirmDialog}
      <button
        type="button"
        onClick={flip}
        disabled={busy}
        className={
          published
            ? 'inline-flex min-h-[36px] items-center rounded-thumb bg-white px-3 text-[14px] font-semibold text-ink/70 ring-1 ring-ink/15 hover:bg-milk disabled:opacity-40'
            : 'inline-flex min-h-[36px] items-center rounded-thumb bg-ink px-3 text-[14px] font-semibold text-white hover:bg-ink/85 disabled:opacity-40'
        }
      >
        {busy ? 'Saving…' : published ? 'Unpublish' : 'Publish'}
      </button>
      {error && <span className="text-[13px] text-red-700">{error}</span>}
    </>
  );
}
