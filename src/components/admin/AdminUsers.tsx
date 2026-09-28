'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Role } from '@/lib/auth';
import type { AccountStatus } from '@/lib/database.types';
import {
  adminCreateUser,
  adminSetUserStatus,
  adminSetUserRole,
  adminSendPasswordEmail,
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
  member: 'border-butter-deep/70 bg-butter-soft text-ink/85',
  doctor: 'border-sky-600/25 bg-sky-50 text-sky-800',
  pharmacy: 'border-emerald-600/20 bg-emerald-50 text-emerald-800',
  admin: 'border-ink/25 bg-ink/10 text-ink/85',
};

const STATUS_BADGE: Record<AccountStatus, string> = {
  active: 'border-emerald-600/20 bg-emerald-50 text-emerald-800',
  suspended: 'border-amber-600/25 bg-amber-50 text-amber-800',
  deactivated: 'border-ink/10 bg-milk text-ink/60',
};

const inputClass =
  'w-full rounded-inner bg-white px-4 py-3 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/40 focus:outline-none focus:ring-ink/30';

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

  function patchRole(id: string, role: Role) {
    setRows((curr) => curr.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  function patchStatus(id: string, status: AccountStatus) {
    setRows((curr) =>
      curr.map((u) => (u.id === id ? { ...u, status } : u)),
    );
  }

  return (
    <div className="space-y-6">
      {!live && (
        <div className="rounded-inner border border-amber-600/25 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Demo directory. Adding and suspending users goes live once Supabase
          is connected.
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            aria-label="Search users by name or email"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-inner bg-white px-5 py-2.5 text-[16px] text-ink ring-1 ring-ink/10 placeholder:text-ink/40 focus:outline-none focus:ring-ink/30"
          />
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex-shrink-0 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink/85"
        >
          {adding ? 'Close' : '+ Add user'}
        </button>
      </div>

      {adding && (
        <AddUserPanel
          onDone={() => setAdding(false)}
          onCreated={(row) => setRows((curr) => [row, ...curr])}
        />
      )}

      {/* Role filter */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.role}
            type="button"
            onClick={() => setFilter(f.role)}
            className={cn(
              'flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all',
              filter === f.role
                ? 'border-ink bg-ink text-white'
                : 'border-ink/10 bg-white text-ink/70 hover:border-ink/25 hover:text-ink',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-shell bg-milk">
        <div className="max-h-[75vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-milk">
              <tr className="border-b border-ink/10 text-left text-[12px] text-ink/60">
                <th className="px-4 py-3 font-normal md:px-6">User</th>
                <th className="hidden px-4 py-3 font-normal md:table-cell md:px-6">
                  Role
                </th>
                <th className="hidden px-4 py-3 font-normal md:table-cell md:px-6">
                  Joined
                </th>
                <th className="px-4 py-3 font-normal md:px-6">Status</th>
                <th className="px-4 py-3 text-right font-normal md:px-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-ink/55"
                  >
                    No users match.
                  </td>
                </tr>
              ) : (
                visible.map((u) => (
                  <UserRow key={u.id} user={u} onStatus={patchStatus} onRole={patchRole} />
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
  onRole,
}: {
  user: AdminUserRow;
  onStatus: (id: string, status: AccountStatus) => void;
  onRole: (id: string, role: Role) => void;
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
    <tr className="border-t border-ink/10 align-middle first:border-t-0">
      <td className="px-4 py-4 md:px-6">
        {user.role === 'member' ? (
          <Link
            href={`/portal/admin/members/${user.id}`}
            className="text-ink underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-ink/40"
          >
            {user.name}
          </Link>
        ) : (
          <span className="text-ink">{user.name}</span>
        )}
        <div className="max-w-[220px] truncate text-xs text-ink/55">
          {user.email}
        </div>
      </td>
      <td className="hidden px-4 py-4 md:table-cell md:px-6">
        <span
          className={cn(
            'inline-flex rounded-full border px-2 py-0.5 text-[12px]',
            ROLE_BADGE[user.role],
          )}
        >
          {user.role}
        </span>
      </td>
      <td className="hidden whitespace-nowrap px-4 py-4 text-[12px] tabular-nums text-ink/65 md:table-cell md:px-6">
        {user.joinedAt}
      </td>
      <td className="px-4 py-4 md:px-6">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px]',
            STATUS_BADGE[user.status],
          )}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {user.status}
        </span>
        {error && <p className="mt-1 text-[12px] text-red-700">{error}</p>}
      </td>
      <td className="px-4 py-4 text-right md:px-6">
        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
          {/* Role had no control anywhere in the app — adminSetUserRole existed
              and nothing called it, so the only way to make someone a doctor
              was editing the database by hand. */}
          <select
            aria-label={`Role for ${user.name}`}
            value={user.role}
            disabled={busy}
            onChange={async (e) => {
              const next = e.target.value as Role;
              if (next === user.role) return;
              if (
                !window.confirm(
                  `Change ${user.name} from ${user.role} to ${next}? This changes what they can see and do.`,
                )
              ) {
                return;
              }
              setBusy(true);
              setError(null);
              const res = await adminSetUserRole({ userId: user.id, role: next });
              if (!res.ok) setError(res.message);
              else onRole(user.id, next);
              setBusy(false);
            }}
            className="rounded-full border border-ink/10 bg-white px-2.5 py-1 text-[12px] text-ink/80 focus:outline-none focus:ring-ink/30 disabled:opacity-40"
          >
            <option value="member">member</option>
            <option value="doctor">doctor</option>
            <option value="admin">admin</option>
          </select>

          <ActionButton
            busy={busy}
            label="Send password email"
            onClick={async () => {
              setBusy(true);
              setError(null);
              const res = await adminSendPasswordEmail({ userId: user.id });
              setError(res.ok ? null : res.message);
              if (res.ok) window.alert(res.message);
              setBusy(false);
            }}
          />

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
        'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50',
        tone === 'danger'
          ? 'ml-2 border-red-600/20 bg-red-50 text-red-700 hover:bg-red-100'
          : 'border-ink/10 bg-white text-ink/80 hover:border-ink/25 hover:text-ink',
      )}
    >
      {label}
    </button>
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
      className="rounded-shell bg-milk p-5 md:p-6"
    >
      <div className="mb-4 text-[13px] font-medium text-ink/55">
        Add a user
      </div>
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
      <p className="mt-3 text-xs text-ink/55">
        The account is created right away and the user gets a branded welcome
        email with a temporary password to change after signing in. If email
        delivery is not connected yet, the password appears here so you can
        share it.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:ring-ink/25"
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
          <div className="mb-2.5 text-[13px] font-medium text-ink/55">
            Sign-in details
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/55">Email</dt>
              <dd className="text-ink">
                {result.createdEmail}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink/55">Temporary password</dt>
              <dd className="font-semibold text-ink">{result.tempPassword}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={copyDetails}
            className="mt-3 rounded-full bg-milk px-4 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-milk-deep"
          >
            {copied ? 'Copied' : 'Copy details'}
          </button>
        </div>
      )}
    </form>
  );
}
