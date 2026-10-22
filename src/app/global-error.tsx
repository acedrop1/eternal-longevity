'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-client-error';

/**
 * Last-resort boundary: a crash in the root layout itself (the site-wide
 * pieces every page shares). Without this file the browser shows Next's bare
 * "Application error" page. It replaces the whole document, so it carries its
 * own <html>/<body> and inline styles: globals.css may be what failed.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    reportClientError(error, 'global-error');
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, "Helvetica Neue", Arial, sans-serif', background: '#fff', color: '#111' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '48px 20px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <h1 style={{ fontSize: 40, lineHeight: 1, letterSpacing: '-0.04em', margin: '0 0 16px' }}>This page didn&apos;t load.</h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#555', margin: '0 0 28px' }}>
              Nothing you did is lost. If you just placed an order, it went through and you can see it in your portal.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="/portal" style={{ background: '#f1df8f', color: '#111', padding: '12px 22px', borderRadius: 999, fontWeight: 600, textDecoration: 'none' }}>
                Go to your portal
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
