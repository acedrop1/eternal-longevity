/**
 * Staff portals live on their own addresses (admin.etlongevity.com,
 * doctor.etlongevity.com). Sign-in cookies are per address, so staff sign in
 * there separately from the public site.
 */
export const STAFF_APEX = 'etlongevity.com';
export const STAFF_PORTALS = { admin: '/portal/admin', doctor: '/portal/doctor' } as const;
export type StaffPortal = keyof typeof STAFF_PORTALS;

/** The request's public host. Vercel puts the custom domain in x-forwarded-host. */
export function requestHost(headers: Headers): string {
  return (headers.get('x-forwarded-host') ?? headers.get('host') ?? '').split(',')[0].trim().split(':')[0].toLowerCase();
}

/** 'admin' on admin.etlongevity.com, 'doctor' on doctor.etlongevity.com, else null. */
export function staffPortalFor(host: string): StaffPortal | null {
  const sub = host.endsWith(`.${STAFF_APEX}`) ? host.slice(0, -STAFF_APEX.length - 1) : '';
  return Object.hasOwn(STAFF_PORTALS, sub) ? (sub as StaffPortal) : null;
}
