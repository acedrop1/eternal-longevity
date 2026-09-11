/**
 * How long a signed-in session survives.
 *
 * HIPAA's Security Rule asks for automatic logoff after "a predetermined time
 * of inactivity" without naming a number, so the number comes from practice:
 * clinical systems sit at 10–15 minutes, back-office systems with access to
 * other people's records at 15–30, and patient portals at 15–30 because the
 * only record at risk is the reader's own.
 *
 * Staff get the tighter limit for the reason the tiering exists at all: an
 * unattended doctor or admin laptop exposes every patient, an unattended
 * member's exposes one.
 */

/** Idle minutes before the session ends, by what the person can reach. */
export const IDLE_MINUTES = {
  staff: 15,
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
