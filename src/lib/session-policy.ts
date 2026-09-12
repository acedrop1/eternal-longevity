/**
 * How long a signed-in session survives.
 *
 * HIPAA's Security Rule asks for automatic logoff after "a predetermined time
 * of inactivity" without naming a number, so the number comes from practice:
 * clinical systems sit at 10–15 minutes, back-office systems with access to
 * other people's records at 15–30, and patient portals at 15–30 because the
 * only record at risk is the reader's own.
 *
 * Both sit at thirty. Fifteen is the tighter clinical number and the practice
 * chose against it deliberately: a prescriber who loses a half-reviewed chart
 * twice a morning starts leaving the screen unlocked instead, which is the
 * outcome the control exists to prevent. The second factor and the thirty-day
 * device trust carry the weight the shorter idle window would have.
 */

/** Idle minutes before the session ends, by what the person can reach. */
export const IDLE_MINUTES = {
  staff: 30,
  member: 30,
} as const;

/**
 * A session ends this many hours after sign-in however busy it has been. Idle
 * timeout alone never closes a tab left open under a finger.
 */
export const ABSOLUTE_HOURS = 12;

/** Warn this long before the idle cut, so a half-typed note is not lost. */
export const WARN_SECONDS = 120;

/** Staff areas hold other people's records; everything else under /portal is the member's own. */
export function isStaffPath(pathname: string): boolean {
  return (
    pathname.startsWith('/portal/admin') ||
    pathname.startsWith('/portal/doctor') ||
    pathname.startsWith('/portal/pharmacy')
  );
}

export function idleMinutesForPath(pathname: string): number {
  return isStaffPath(pathname) ? IDLE_MINUTES.staff : IDLE_MINUTES.member;
}

export const ACTIVITY_COOKIE = 'el_seen';
export const SESSION_START_COOKIE = 'el_since';
