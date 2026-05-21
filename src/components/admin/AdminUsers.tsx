'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Role } from '@/lib/auth';
import type { AccountStatus } from '@/lib/database.types';
import {
  adminInviteUser,
  adminSetUserStatus,
  type AdminUserResult,
} from '@/lib/admin-users-actions';
import { cn } from '@/lib/utils';

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  joinedAt: string;
}

const ROLE_BADGE: Record<Role, string> = {
  member: 'border-accent/40 bg-accent/10 text-accent',
  doctor: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  pharmacy: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
  admin: 'border-foreground/25 bg-foreground/10 text-foreground/85',
};

const STATUS_BADGE: Record<AccountStatus, string> = {
  active: 'border-accent/40 bg-accent/10 text-accent',
  suspended: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
  deactivated: 'border-line bg-surface text-foreground/45',
};

const inputClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3 text-sm text-foreground placeholder-foreground/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

const FILTERS: { label: string; role: Role | 'all' }[] = [
  { label: 'All', role: 'all' },
  { label: 'Members', role: 'member' },
  { label: 'Doctors', role: 'doctor' },
  { label: 'Pharmacies', role: 'pharmacy' },
  { label: 'Admins', role: 'admin' },
];

export function AdminUsers({
  users,
  live,
}: {
  users: AdminUserRow[];
  live: boolean;
}) {
  const [rows, setRows] = useState(users);
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((u) => {
      if (filter !== 'all' && u.role !== filter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  function patchStatus(id: string, status: AccountStatus) {
    setRows((curr) =>
      curr.map((u) => (u.id === id ? { ...u, status } : u)),
    );
  }

  return (
    <div className="space-y-6">
      {!live && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Demo directory. Inviting and suspending users goes live once Supabase
          is connected.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-full border border-line bg-surface px-5 py-2.5 text-sm text-foreground placeholder-foreground/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex-shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-soft"
        >
          {adding ? 'Close' : '+ Add user'}
        </button>
      </div>

      {adding && <AddUserPanel onDone={() => setAdding(false)} />}

      {/* Role filter */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.role}
            type="button"
            onClick={() => setFilter(f.role)}
            className={cn(
              'flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wider transition-all',
              filter === f.role
                ? 'border-foreground/30 bg-foreground/10 text-foreground'
                : 'border-line bg-surface text-foreground/65 hover:border-foreground/30',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] tracking-widest text-foreground/45">
                <th className="px-4 py-3 font-medium md:px-6">USER</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell md:px-6">
                  ROLE
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell md:px-6">
                  JOINED
                </th>
                <th className="px-4 py-3 font-medium md:px-6">STATUS</th>
                <th className="px-4 py-3 text-right font-medium md:px-6">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-foreground/55"
                  >
                    No users match.
                  </td>
                </tr>
              ) : (
                visible.map((u) => (
                  <UserRow key={u.id} user={u} onStatus={patchStatus} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function UserRow({
  user,
  onStatus,
}: {
  user: AdminUserRow;
  onStatus: (id: string, status: AccountStatus) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(status: AccountStatus) {
    const verb =
      status === 'active'
        ? 'Reactivate'
        : status === 'suspended'
          ? 'Suspend'
          : 'Deactivate';
    if (!window.confirm(`${verb} ${user.name}'s account?`)) return;

    setBusy(true);
    setError(null);
    const previous = user.status;
    onStatus(user.id, status); // optimistic
    try {
      const res = await adminSetUserStatus({ userId: user.id, status });
      if (!res.ok) {
        onStatus(user.id, previous);
        setError(res.message);
      }
    } catch {
      onStatus(user.id, previous);
      setError('Request failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-line align-middle">
      <td className="px-4 py-4 md:px-6">
        {user.role === 'member' ? (
          <Link
            href={`/portal/admin/members/${user.id}`}
            className="text-foreground hover:text-accent transition-colors"
          >
            {user.name}
          </Link>
        ) : (
          <span className="text-foreground">{user.name}</span>
        )}
        <div className="max-w-[220px] truncate text-xs text-foreground/55">
          {user.email}
        </div>
      </td>
      <td className="hidden px-4 py-4 md:table-cell md:px-6">
        <span
          className={cn(
            'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-widest',
            ROLE_BADGE[user.role],
          )}
        >
          {user.role.toUpperCase()}
        </span>
      </td>
      <td className="hidden px-4 py-4 text-foreground/65 md:table-cell md:px-6">
        {user.joinedAt}
      </td>
      <td className="px-4 py-4 md:px-6">
        <span
          className={cn(
            'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-widest',
            STATUS_BADGE[user.status],
          )}
        >
          {user.status.toUpperCase()}
        </span>
        {error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
      </td>
      <td className="px-4 py-4 text-right md:px-6">
        <div className="inline-flex flex-wrap justify-end gap-1.5">
          {user.status !== 'active' && (
            <ActionButton
              busy={busy}
              label="Reactivate"
              onClick={() => setStatus('active')}
            />
          )}
          {user.status === 'active' && (
            <ActionButton
              busy={busy}
              label="Suspend"
              onClick={() => setStatus('suspended')}
            />
          )}
          {user.status !== 'deactivated' && (
            <ActionButton
              busy={busy}
              label="Deactivate"
              tone="danger"
              onClick={() => setStatus('deactivated')}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

function ActionButton({
  label,
  busy,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  busy: boolean;
  tone?: 'neutral' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-widest transition-colors disabled:opacity-50',
        tone === 'danger'
          ? 'border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/10'
          : 'border-line bg-surface text-foreground/80 hover:border-foreground/30 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */

function AddUserPanel({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdminUserResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await adminInviteUser({ email, fullName: name, role });
      setResult(res);
      if (res.ok) {
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

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-accent/30 bg-accent/5 p-5 md:p-6"
    >
      <div className="mb-4 text-[10px] tracking-widest text-accent">
        INVITE A USER
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          className={inputClass}
        />
        <input
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
      <p className="mt-3 text-xs text-foreground/55">
        The user gets an email invite and sets their own password. You never
        handle their credentials.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-soft disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send invite'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-line bg-surface px-4 py-2 text-xs tracking-wider text-foreground/85 transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {result && (
        <p
          className={cn(
            'mt-3 text-sm',
            result.ok ? 'text-accent' : 'text-red-300',
          )}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
