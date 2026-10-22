/**
 * Send a browser crash to our server log (Vercel runtime logs), so a crash a
 * member hits can be read without their console. Message, first stack lines
 * and the page path only: no form values, no query string.
 */
export function reportClientError(error: Error & { digest?: string }, where: string): void {
  try {
    const body = JSON.stringify({
      where,
      message: String(error?.message ?? error).slice(0, 500),
      stack: String(error?.stack ?? '').split('\n').slice(0, 6).join('\n').slice(0, 1500),
      digest: error?.digest,
      path: window.location.pathname,
    });
    if (!navigator.sendBeacon?.('/api/client-error', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/client-error', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
    }
  } catch {
    // Reporting must never throw from an error screen.
  }
}
