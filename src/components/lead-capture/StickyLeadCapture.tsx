'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Sticky bottom-left lead capture pill (POUCH/Saki pattern).
 * Persists site-wide. User can dismiss with X.
 */
export function StickyLeadCapture() {
  const [open, setOpen] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 max-w-[calc(100vw-2rem)] md:right-auto md:max-w-sm anim-fade-up d-6"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="relative flex items-center gap-3 rounded-2xl glass-strong p-3 pr-4 shadow-xl">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-7 w-7 place-items-center rounded-full bg-foreground/10 text-foreground/70 hover:bg-foreground/20 hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} strokeWidth={1.6} />
        </button>

        {!submitted ? (
          <>
            <p className="flex-1 text-xs leading-tight text-foreground/85">
              Get the free Eternal Longevity Protocol Guide.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="pill bg-accent text-black font-semibold text-xs px-4 py-2 hover:bg-accent-soft"
            >
              Get it
            </button>
          </>
        ) : (
          <p className="flex-1 text-xs leading-tight text-foreground">
            Sent. Check your inbox.
          </p>
        )}
      </div>
    </div>
  );
}
