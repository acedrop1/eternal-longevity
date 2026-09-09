/**
 * Display formatting. One place, because the same phone number was being
 * rendered three different ways depending on which screen you were on.
 *
 * Every function here takes whatever is actually in the database — which is
 * frequently null, an empty string, or a value someone typed by hand — and
 * returns something safe to put on screen. None of them throw.
 */

/** (201) 887-8847. Falls back to the raw input if it is not a 10-digit US number. */
export function formatPhone(raw?: string | null): string {
  if (!raw) return '';
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return formatPhone(d.slice(1));
  if (d.length !== 10) return String(raw);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** tel: href for a stored number. Empty string when there is nothing to call. */
export function phoneHref(raw?: string | null): string {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (!d) return '';
  return `tel:+${d.length === 10 ? '1' + d : d}`;
}

/**
 * Feb 10, 2000 from a stored date.
 *
 * A `date` column comes back as 'YYYY-MM-DD'. Passing that to `new Date()`
 * parses it as UTC midnight, which renders as the *previous day* anywhere west
 * of Greenwich — so a birthday shows up a day early for every US member. The
 * date-only branch below builds the date in local time instead.
 */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  const d = dateOnly
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Feb 10, 2000 · 3:24 PM */
export function formatDateTime(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/** Age in whole years from a date of birth. Null when it cannot be computed. */
export function ageFrom(dob?: string | null): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const b = new Date(Number(dob.slice(0, 4)), Number(dob.slice(5, 7)) - 1, Number(dob.slice(8, 10)));
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** $1,234.56 from cents. */
export function formatMoney(cents?: number | null): string {
  const n = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;
  return (n / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** 07512 — five digits, or the raw value if it is not a US ZIP. */
export function formatZip(raw?: string | null): string {
  if (!raw) return '';
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 9) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d.length === 5 ? d : String(raw);
}

/** Title Case A Name, leaving initials and hyphenated names intact. */
export function formatName(raw?: string | null): string {
  if (!raw) return '';
  return String(raw)
    .trim()
    .split(/\s+/)
    .map((w) =>
      w
        .split('-')
        .map((part) =>
          part.length <= 1
            ? part.toUpperCase()
            : part[0].toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join('-'),
    )
    .join(' ');
}

/** •••• 4242 */
export function formatCardLast4(last4?: string | null): string {
  const d = String(last4 ?? '').replace(/\D/g, '').slice(-4);
  return d ? `•••• ${d}` : '—';
}

/** A full US address on one line, skipping the parts that are missing. */
export function formatAddress(a?: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
} | null): string {
  if (!a) return '—';
  const street = [a.line1, a.line2].filter(Boolean).join(', ');
  const region = [a.city, [a.state, formatZip(a.zip)].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [street, region].filter(Boolean).join(' · ') || '—';
}
