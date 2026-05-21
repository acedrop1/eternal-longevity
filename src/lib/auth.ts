/**
 * Client-safe auth constants. Importable from both server and client components.
 * The actual cookie / session helpers live in auth-server.ts (server-only).
 *
 * NOTE: This is DEMO AUTH for previewing role-specific portal flavors. In
 * production, replace DEMO_USERS with a real identity provider (NextAuth,
 * Clerk, Supabase Auth, etc.) and hash passwords properly.
 */

export type Role = 'member' | 'doctor' | 'admin' | 'pharmacy';

/**
 * The session shape every page consumes. `getSession()` returns this whether
 * the app is running on demo cookie auth or real Supabase Auth, so portal
 * pages never need to know which mode is active.
 */
export interface SessionUser {
  id: string;
  role: Role;
  email: string;
  name: string;
  /** Role's home dashboard. */
  redirectTo: string;
}

/** Each role's landing dashboard. */
export const ROLE_HOME: Record<Role, string> = {
  member: '/portal',
  doctor: '/portal/doctor',
  admin: '/portal/admin',
  pharmacy: '/portal/pharmacy',
};

export function redirectForRole(role: Role): string {
  return ROLE_HOME[role] ?? '/portal';
}

export interface DemoUser {
  role: Role;
  email: string;
  /** Plain-text for demo only. Replace with hashed in prod. */
  password: string;
  name: string;
  /** Where to land after a successful login */
  redirectTo: string;
  /** Short marketing description for the credential card on /login */
  blurb: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    role: 'member',
    email: 'demo@eternal.test',
    password: 'demo',
    name: 'Alex Demo',
    redirectTo: '/portal',
    blurb: 'A member who just finished intake. Sees their protocol status, ID-verify, and checkout.',
  },
  {
    role: 'doctor',
    email: 'doctor@eternal.test',
    password: 'doctor',
    name: 'Dr. M. Reyes',
    redirectTo: '/portal/doctor',
    blurb: 'A licensed physician reviewing the queue, signing prescriptions, and requesting more info.',
  },
  {
    role: 'admin',
    email: 'admin@eternal.test',
    password: 'admin',
    name: 'Ops Admin',
    redirectTo: '/portal/admin',
    blurb: 'Operations dashboard. Members, MRR, review queue, shipments, physician network.',
  },
  {
    role: 'pharmacy',
    email: 'pharmacy@eternal.test',
    password: 'pharmacy',
    name: 'Kaduceus Pharmacy',
    redirectTo: '/portal/pharmacy',
    blurb: 'The compounding pharmacy. Sees submitted orders, accepts them, and adds shipment tracking.',
  },
];

/** Cookie key used by the demo session. */
export const SESSION_COOKIE = 'el_demo_session';

/** Helper to look up a demo user by role (for client-side display). */
export function getDemoUserByRole(role: Role): DemoUser | null {
  return DEMO_USERS.find((u) => u.role === role) ?? null;
}
