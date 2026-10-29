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

/**
 * A dropped connection ("Load failed" on iPhone Safari, "Failed to fetch" in
 * Chrome, a stale code chunk after a deploy) is not a real crash: reload the
 * page once and it heals. On /checkout that reload lands a member whose order
 * went through straight on their health questions (the checkout page
 * redirects there). At most one reload a minute, so a real outage can't loop.
 * Returns true when it is reloading.
 */
export function reloadOnNetworkError(error: Error): boolean {
  try {
    const msg = `${error?.name ?? ''} ${error?.message ?? ''}`;
    if (!/load failed|failed to fetch|networkerror|network error|chunkloaderror|loading chunk|connection/i.test(msg)) return false;
    const last = Number(window.sessionStorage.getItem('el-net-reload') ?? 0);
    if (Date.now() - last < 60_000) return false;
    window.sessionStorage.setItem('el-net-reload', String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}
