'use client';

/* Plain <a> on purpose: the router may be what crashed, so these do a full page load. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from 'react';
import { reloadWhenOnline, reportClientError, shouldAutoReload } from '@/lib/report-client-error';

/**
 * Last-resort boundary: a crash in the root layout itself (the site-wide
 * pieces every page shares). Without this file the browser shows Next's bare
 * "Application error" page. It replaces the whole document, so it carries its
 * own <html>/<body> and inline styles: globals.css may be what failed.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  // A dropped connection heals itself: show "reconnecting" and reload, never a dead page.
  const [healing, setHealing] = useState(true);
  useEffect(() => {
    reportClientError(error, 'global-error');
    setHealing(shouldAutoReload(error) && reloadWhenOnline());
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, "Helvetica Neue", Arial, sans-serif', background: '#fff', color: '#111' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '48px 20px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h1 style={{ fontSize: 40, lineHeight: 1, letterSpacing: '-0.04em', margin: '0 0 16px' }}>
              {healing ? 'Reconnecting…' : 'This page didn\u2019t load.'}
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#555', margin: '0 0 28px' }}>
              Nothing you did is lost. If you just placed an order, tap Continue: it takes you to your next step, usually a few quick health questions.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/portal/visit" style={{ background: '#f1df8f', color: '#111', padding: '12px 22px', borderRadius: 999, fontWeight: 600, textDecoration: 'none' }}>
                Continue
              </a>
              <a href="/" style={{ background: '#f4f3ef', color: '#111', padding: '12px 22px', borderRadius: 999, fontWeight: 600, textDecoration: 'none' }}>
                Back to home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
