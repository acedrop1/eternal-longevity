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
 * Should this crash heal itself with a reload? A dropped connection ("Load
 * failed" on iPhone Safari, "Failed to fetch" in Chrome, a stale code chunk
 * after a deploy) always; anything on /checkout too, because reloading
 * checkout lands a member whose order went through on their health questions
 * (the page redirects there) and anyone else back on their basket.
 */
export function shouldAutoReload(error: Error): boolean {
  const msg = `${error?.name ?? ''} ${error?.message ?? ''}`;
  const network = /load failed|failed to fetch|networkerror|network error|chunkloaderror|loading chunk|connection/i.test(msg);
  return network || (typeof window !== 'undefined' && window.location.pathname.startsWith('/checkout'));
}

/**
 * Reload once the connection is back. Up to 5 tries in 2 minutes per page, so
 * a real outage shows the fallback screen instead of looping. Returns true
 * while it is (or will be) reloading.
 */
export function reloadWhenOnline(): boolean {
  try {
    const key = `el-reload:${window.location.pathname}`;
    const now = Date.now();
    const tries = (JSON.parse(window.sessionStorage.getItem(key) ?? '[]') as number[]).filter((t) => now - t < 120_000);
    if (tries.length >= 5) return false;
    window.sessionStorage.setItem(key, JSON.stringify([...tries, now]));
    const go = () => window.location.reload();
    if (navigator.onLine === false) window.addEventListener('online', go, { once: true });
    else window.setTimeout(go, tries.length ? 1500 * tries.length : 300);
    return true;
  } catch {
    return false;
  }
}
