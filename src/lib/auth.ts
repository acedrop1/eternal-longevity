/**
 * Client-safe auth constants. Importable from both server and client components.
 * The actual cookie / session helpers live in auth-server.ts (server-only).
 *
 * NOTE: This is DEMO AUTH for previewing role-specific portal flavors. In
 * production, replace DEMO_USERS with a real identity provider (NextAuth,
 * Clerk, Supabase Auth, etc.) and hash passwords properly.
 */

export type Role = 'member' | 'doctor' | 'admin';

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
    blurb: 'A member who just finished intake — sees their protocol status, ID-verify, and checkout.',
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
    blurb: 'Operations dashboard — members, MRR, review queue, shipments, physician network.',
  },
];

/** Cookie key used by the demo session. */
export const SESSION_COOKIE = 'el_demo_session';

/** Helper to look up a demo user by role (for client-side display). */
export function getDemoUserByRole(role: Role): DemoUser | null {
  return DEMO_USERS.find((u) => u.role === role) ?? null;
}
