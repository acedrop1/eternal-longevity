'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/auth';
import type { AccountStatus } from '@/lib/database.types';
import { adminSendPasswordEmail, adminSetUserRole, adminSetUserStatus } from '@/lib/admin-users-actions';
import { useConfirm } from '@/components/ui/useConfirm';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/admin/IndexTable';
import { STATUS_BADGE } from '@/components/admin/user-labels';

/**
 * The account controls that used to live in the Members list's expanded row:
 * role, password email, suspend / reactivate / deactivate. Same server actions
 * and the same confirmations.
 */
export function AdminMemberActions({
  userId,
  name,
  role: initialRole,
  status: initialStatus,
  joinedAt,
}: {
  userId: string;
  name: string;
  role: Role;
  status: AccountStatus;
  joinedAt: string;
}) {
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(next: AccountStatus) {
    const verb = next === 'active' ? 'Reactivate' : next === 'suspended' ? 'Suspend' : 'Deactivate';
    if (!(await confirm({ title: `${verb} ${name}'s account?`, confirmLabel: verb, danger: next !== 'active' }))) return;

    setBusy(true);
    setError(null);
    const previous = status;
    setStatus(next); // optimistic
    try {
      const res = await adminSetUserStatus({ userId, status: next });
      if (!res.ok) {
        setStatus(previous);
        setError(res.message);
      } else {
        router.refresh();
      }
    } catch {
      setStatus(previous);
      setError('Request failed.');
    } finally {
      setBusy(false);
    }
  }

  const [statusLabel, statusTone] = STATUS_BADGE[status];

  return (
    <div className="space-y-3">
      <dl className="-my-1.5">
        <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
          <dt className="text-ink/60">Status</dt>
          <dd>
            <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
          <dt className="text-ink/60">Member since</dt>
          <dd className="text-ink">{joinedAt}</dd>
        </div>
        {/* Role had no control anywhere in the app — adminSetUserRole existed
            and nothing called it, so the only way to make someone a doctor
            was editing the database by hand. */}
        <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
          <dt>
            <label htmlFor={`role-${userId}`} className="text-ink/60">
              Role
            </label>
          </dt>
          <dd>
            <select
              id={`role-${userId}`}
              aria-label={`Role for ${name}`}
              value={role}
              disabled={busy}
              onChange={async (e) => {
                const next = e.target.value as Role;
                if (next === role) return;
                if (
                  !(await confirm({
                    title: `Change ${name} from ${role} to ${next}?`,
                    body: 'This changes what they can see and do.',
                    confirmLabel: 'Change role',
                  }))
                ) {
                  return;
                }
                setBusy(true);
                setError(null);
                const res = await adminSetUserRole({ userId, role: next });
                if (!res.ok) setError(res.message);
                else {
                  setRole(next);
                  router.refresh();
                }
                setBusy(false);
              }}
              className="min-h-[40px] rounded-thumb bg-white px-2.5 text-[16px] text-ink ring-1 ring-ink/15 focus:outline-none focus:ring-2 focus:ring-ink/30 disabled:opacity-40 md:min-h-[32px] md:text-[13px]"
            >
              <option value="member">member</option>
              <option value="doctor">doctor</option>
              <option value="admin">admin</option>
              {role === 'pharmacy' && (
                <option value="pharmacy" disabled>
                  pharmacy
                </option>
              )}
            </select>
          </dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className="text-[13px] text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-ink/10 pt-3">
        <ActionButton
          busy={busy}
          label="Send password email"
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await adminSendPasswordEmail({ userId });
            setError(res.ok ? null : res.message);
            if (res.ok) void confirm({ title: 'Email sent', body: res.message, alert: true });
            setBusy(false);
          }}
        />
        {status !== 'active' && <ActionButton busy={busy} label="Reactivate" onClick={() => changeStatus('active')} />}
        {status === 'active' && <ActionButton busy={busy} label="Suspend" onClick={() => changeStatus('suspended')} />}
        {status !== 'deactivated' && (
          <ActionButton busy={busy} label="Deactivate" tone="danger" onClick={() => changeStatus('deactivated')} />
        )}
      </div>
      {confirmDialog}
    </div>
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
        'min-h-[40px] w-full rounded-full px-3.5 text-[13px] font-medium ring-1 transition-colors disabled:opacity-50 md:min-h-[34px]',
        tone === 'danger'
          ? 'bg-white text-red-700 ring-red-600/25 hover:bg-red-50'
          : 'bg-white text-ink/85 ring-ink/15 hover:bg-milk hover:text-ink',
      )}
    >
      {label}
    </button>
  );
}
