import type { Role } from '@/lib/auth';
import type { AccountStatus } from '@/lib/database.types';
import type { BadgeTone } from '@/components/admin/IndexTable';

/**
 * Labels shared by the Members list (client) and the member record (server).
 * A plain module: values exported from a 'use client' file are client
 * references on the server and cannot be read there.
 */

export const STATUS_BADGE: Record<AccountStatus, [string, BadgeTone]> = {
  active: ['Active', 'success'],
  suspended: ['Suspended', 'attention'],
  deactivated: ['Deactivated', 'neutral'],
};

export const ROLE_LABEL: Record<Role, string> = {
  member: 'Member',
  doctor: 'Doctor',
  pharmacy: 'Pharmacy',
  admin: 'Admin',
};

/** Members list tabs; also the accepted values of `?tab=`. */
export type UserTab = 'all' | 'members' | 'staff' | 'suspended' | 'deactivated';

export const USER_TABS: { key: UserTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'members', label: 'Members' },
  { key: 'staff', label: 'Staff' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'deactivated', label: 'Deactivated' },
];
