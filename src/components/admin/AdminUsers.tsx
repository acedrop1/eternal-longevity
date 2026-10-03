'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Role } from '@/lib/auth';
import type { AccountStatus } from '@/lib/database.types';
import { adminCreateUser, type AdminUserResult } from '@/lib/admin-users-actions';
import { cn } from '@/lib/utils';
import { useOrders } from '@/components/orders/OrdersProvider';
import {
  AdminPageHeader,
  IndexFooter,
  IndexTabs,
  IndexToolbar,
  StatusBadge,
  fromControl,
  headerButton,
  indexCard,
  row as rowClass,
  table,
  tbody,
  td,
  th,
  thead,
  toolbarSelect,
} from '@/components/admin/IndexTable';
import { ROLE_LABEL, STATUS_BADGE, USER_TABS, type UserTab } from '@/components/admin/user-labels';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  joinedAt: string;
}

const inputClass =
  'w-full rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/55 focus:outline-none focus:ring-ink/30';

type Tab = UserTab;

const TAB_TEST: Record<Tab, (u: AdminUserRow) => boolean> = {
  all: () => true,
  members: (u) => u.role === 'member',
  staff: (u) => u.role !== 'member',
  suspended: (u) => u.status === 'suspended',
  deactivated: (u) => u.status === 'deactivated',
};


export function AdminUsers({
  users,
  live,
  sample = false,
  initialTab = 'all',
}: {
  users: AdminUserRow[];
  live: boolean;
  /** Dev-only fixture rows are showing. */
  sample?: boolean;
  /** From `?tab=`; the page has already checked it is a known key. */
  initialTab?: Tab;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState(users);
  const [tab, setTabState] = useState<Tab>(initialTab);
  /** Keep `?tab=` in step so the view can be linked and survives a refresh. */
  const setTab = (next: Tab) => {
    setTabState(next);
    router.replace(next === 'all' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  };
  const [role, setRole] = useState<Role | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  // Orders per member, from the orders the portal already loaded.
  const { orders } = useOrders();
  const orderCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) if (o.userId) m.set(o.userId, (m.get(o.userId) ?? 0) + 1);
    return m;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Rows arrive newest first.
    const list = rows.filter((u) => {
      if (!TAB_TEST[tab](u)) return false;
      if (role !== 'all' && u.role !== role) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    });
    if (sort === 'oldest') list.reverse();
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [rows, tab, role, sort, query]);

  const memberCount = rows.filter((u) => u.role === 'member').length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Members"
        subtitle={`${rows.length} people · ${memberCount} members. Members, doctors, the pharmacy and admins.`}
        actions={
          <button type="button" onClick={() => setAdding((v) => !v)} className={headerButton}>
            {adding ? 'Close' : 'Add user'}
          </button>
        }
      />

      {!live && (
        <p className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-2.5 text-[14px] text-amber-900">
          {sample ? 'Sample data (dev only). ' : 'Demo directory. '}
          Adding and suspending users goes live once Supabase is connected.
        </p>
      )}

      {adding && (
        <AddUserPanel
          onDone={() => setAdding(false)}
          onCreated={(row) => setRows((curr) => [row, ...curr])}
        />
      )}

      <div className={indexCard}>
        <IndexTabs
          label="User filter"
          tabs={USER_TABS.map((t) => ({ ...t, count: t.key === 'all' ? undefined : rows.filter(TAB_TEST[t.key]).length }))}
          value={tab}
          onChange={setTab}
        />
        <IndexToolbar query={query} onQuery={setQuery} placeholder="Search by name or email">
          <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as Role | 'all')} className={toolbarSelect}>
            <option value="all">All roles</option>
            <option value="member">Members</option>
            <option value="doctor">Doctors</option>
            <option value="pharmacy">Pharmacies</option>
            <option value="admin">Admins</option>
          </select>
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={toolbarSelect}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
          </select>
        </IndexToolbar>

        <div className="md:overflow-x-auto">
        <table className={table}>
          <thead className={thead}>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Email</th>
              <th className={th}>Role</th>
              <th className={th}>Status</th>
              <th className={cn(th, 'text-right')}>Orders</th>
              <th className={th}>Joined</th>
            </tr>
          </thead>
          <tbody className={tbody}>
            {visible.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={6} className="block px-4 py-10 text-center text-[14px] text-ink/65 md:table-cell">
                  No users match.
                </td>
              </tr>
            ) : (
              visible.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  orders={u.role === 'member' ? orderCount.get(u.id) ?? 0 : null}
                  onOpen={() => router.push(userHref(u.id))}
                />
              ))
            )}
          </tbody>
        </table>
        </div>
        <IndexFooter shown={visible.length} total={rows.length} noun="users" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Every user's record (members, staff and the pharmacy) lives on the member page. */
const userHref = (id: string) => `/portal/admin/members/${id}`;

function UserRow({
  user,
  orders,
  onOpen,
}: {
  user: AdminUserRow;
  orders: number | null;
  onOpen: () => void;
}) {
  const [statusLabel, statusTone] = STATUS_BADGE[user.status];

  return (
    <tr
      className={cn(rowClass, 'pr-4')}
      onClick={(e) => {
        if (!fromControl(e.target)) onOpen();
      }}
    >
      <td className={cn(td, 'order-1 min-w-0 font-medium text-ink')}>
        <div className="truncate md:max-w-[220px]">
          <Link
            href={userHref(user.id)}
            className="underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-ink/40"
          >
            {user.name}
          </Link>
        </div>
      </td>
      <td className={cn(td, 'order-3 min-w-0 basis-full text-ink/65')}>
        <div className="truncate md:max-w-[260px]">{user.email}</div>
      </td>
      <td className={cn(td, 'order-4 text-[13px] text-ink/65 md:text-[14px] md:text-ink/80')}>{ROLE_LABEL[user.role]}</td>
      <td className={cn(td, 'order-2 ml-auto md:ml-0')}>
        <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
      </td>
      <td className={cn(td, 'hidden tabular-nums text-ink/80 md:text-right')}>
        {orders ?? <span className="text-ink/35">—</span>}
      </td>
      <td className={cn(td, 'order-5 whitespace-nowrap text-[13px] tabular-nums text-ink/65 md:text-[14px] md:text-ink/65')}>
        <span className="md:hidden">· Joined </span>
        {user.joinedAt}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */

function AddUserPanel({
  onDone,
  onCreated,
}: {
  onDone: () => void;
  onCreated: (row: AdminUserRow) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminUserResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    setCopied(false);
    try {
      const res = await adminCreateUser({ email, fullName: name, role });
      setResult(res);
      if (res.ok && res.userId) {
        onCreated({
          id: res.userId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          status: 'active',
          joinedAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        });
        setName('');
        setEmail('');
        setRole('member');
      }
    } catch {
      setResult({ ok: false, message: 'Request failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  async function copyDetails() {
    if (!result?.tempPassword) return;
    try {
      await navigator.clipboard.writeText(
        `Email: ${result.createdEmail ?? email}\n` +
          `Temporary password: ${result.tempPassword}\n` +
          `Sign in: ${window.location.origin}/login`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable; the details are visible on screen anyway */
    }
  }

  return (
    <form
      onSubmit={submit}
      className={cn(indexCard, 'p-5')}
    >
      <h2 className="mb-4 text-[14px] font-semibold text-ink">Add a user</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          aria-label="New user full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          className={inputClass}
        />
        <input
          aria-label="New user email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          className={inputClass}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className={cn(inputClass, 'appearance-none')}
        >
          <option value="member">Member</option>
          <option value="doctor">Doctor</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <p className="mt-3 text-xs text-ink/65">
        The account is created right away and the user gets a branded welcome
        email with a temporary password to change after signing in. If email
        delivery is not connected yet, the password appears here so you can
        share it.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25"
        >
          Close
        </button>
      </div>
      {result && (
        <p
          className={cn(
            'mt-3 text-sm',
            result.ok ? 'text-emerald-700' : 'text-red-700',
          )}
        >
          {result.message}
        </p>
      )}
      {result?.tempPassword && (
        <div className="mt-3 rounded-inner border border-ink/10 bg-white p-4">
          <div className="mb-2.5 text-[14px] font-medium text-ink/65">
            Sign-in details
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/65">Email</dt>
              <dd className="text-ink">
                {result.createdEmail}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/65">Temporary password</dt>
              <dd className="font-semibold text-ink">{result.tempPassword}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={copyDetails}
            className="mt-3 rounded-full bg-milk px-4 py-1.5 text-[14px] font-semibold text-ink transition-colors hover:bg-milk-deep"
          >
            {copied ? 'Copied' : 'Copy details'}
          </button>
        </div>
      )}
    </form>
  );
}
