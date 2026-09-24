'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useMemberProfile } from './MemberProfileProvider';
import { SavedAddressesManager } from './SavedAddressesManager';
import { StripeCardsManager } from './StripeCardsManager';
import { SavedCardsManager } from './SavedCardsManager';
import {
  DEFAULT_NOTIFICATIONS,
  NOTIFICATION_DEFS,
} from '@/lib/memberProfile';
import { cn } from '@/lib/utils';
import {
  btnPrimary,
  btnSecondary,
  btnSmall,
  errorBox,
  field,
  fieldLabel,
  inset,
  panel,
  SectionTitle,
} from '@/components/portal/ui';
import {
  changePasswordAction,
  requestDataExportAction,
  requestAccountClosureAction,
} from '@/lib/account-actions';

/* ------------------------------------------------------------------ */
/*  Section registry — drives the scroll-spy left nav                  */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'password', label: 'Password' },
  { id: 'payment', label: 'Payment methods' },
  { id: 'addresses', label: 'Shipping addresses' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy & data' },
] as const;

/* ------------------------------------------------------------------ */
/*  Small shared pieces                                                */
/* ------------------------------------------------------------------ */

type ActionStatus = 'idle' | 'busy' | 'done';

/** Drives a button through idle -> busy -> done -> idle with feedback. */
function useAction(commitDelay = 620, holdDelay = 2100) {
  const [status, setStatus] = useState<ActionStatus>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const run = useCallback(
    (commit: () => void) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setStatus('busy');
      timers.current.push(
        setTimeout(() => {
          commit();
          setStatus('done');
          timers.current.push(
            setTimeout(() => setStatus('idle'), holdDelay),
          );
        }, commitDelay),
      );
    },
    [commitDelay, holdDelay],
  );

  return { status, run };
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Primary save/submit button with built-in busy + done states. */
function SaveButton({
  status,
  disabled,
  onClick,
  idleLabel,
  busyLabel = 'Saving',
  doneLabel = 'Saved',
}: {
  status: ActionStatus;
  disabled?: boolean;
  onClick: () => void;
  idleLabel: string;
  busyLabel?: string;
  doneLabel?: string;
}) {
  const locked = disabled || status !== 'idle';
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      className={cn(btnPrimary, 'min-w-[9.5rem]')}
    >
      {status === 'busy' && <Spinner />}
      {status === 'done' && <Check />}
      <span>
        {status === 'busy'
          ? busyLabel
          : status === 'done'
            ? doneLabel
            : idleLabel}
      </span>
    </button>
  );
}

function SectionCard({
  id,
  title,
  description,
  children,
  action,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(panel, 'scroll-mt-28 p-5 md:p-8')}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <SectionTitle>{title}</SectionTitle>
          <p className="mt-1.5 text-[15px] leading-relaxed text-black/60">
            {description}
          </p>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}


function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  hint,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      <input
        aria-label={label}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={!onChange || disabled}
        placeholder={placeholder}
        className={cn(
          field,
          disabled && 'cursor-not-allowed bg-white/60 text-black/55',
        )}
      />
      {hint && (
        <p className="mt-1.5 text-[13px] text-black/55">{hint}</p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

export function AccountSettings({
  userName,
  userEmail,
  stripePublishableKey,
}: {
  userName: string;
  userEmail: string;
  /** Empty when Stripe is not configured for this environment. */
  stripePublishableKey?: string;
}) {
  const { profile, patchProfile, syncError } = useMemberProfile();

  /* ---- scroll-spy left nav ------------------------------------- */
  const [activeId, setActiveId] = useState<string>('profile');
  const clickLockRef = useRef(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < clickLockRef.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const goTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Lock the observer briefly so the clicked item wins immediately.
    clickLockRef.current = Date.now() + 700;
    setActiveId(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      {/* Every write on this page is optimistic — the field updates before the
          server answers — so a failure has to say so rather than leave a tick
          standing over a change that never landed. */}
      {syncError && (
        <p role="alert" className={cn(errorBox, 'mb-4')}>
          {syncError} Refresh the page and try again.
        </p>
      )}
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ===================== LEFT NAV ===================== */}
      <aside className="lg:col-span-1">
        <nav
          aria-label="Account sections"
          className="rounded-[4px] bg-white p-2 ring-1 ring-black/10 lg:sticky lg:top-24"
        >
          {SECTIONS.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'group relative flex min-h-[44px] w-full items-center gap-3 rounded-[2px] px-3 py-2.5 text-left text-[15px] transition-colors',
                  active
                    ? 'bg-[#F2F2F0] text-black'
                    : 'text-black/65 hover:bg-black/[0.03] hover:text-black',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors',
                    active
                      ? 'bg-[#D5A850]'
                      : 'bg-black/20 group-hover:bg-black/40',
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="mx-3 my-2 h-px bg-black/10" />
          <Link
            href="/portal/subscriptions"
            className="group flex min-h-[44px] items-center justify-between rounded-[2px] px-3 py-2.5 text-[15px] text-black/65 transition-colors hover:bg-black/[0.03] hover:text-black"
          >
            <span>Subscriptions</span>
            <span
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </nav>
      </aside>

      {/* ===================== RIGHT CONTENT ===================== */}
      <div className="space-y-6 lg:col-span-2">
        <ProfileSection
          profile={profile}
          patchProfile={patchProfile}
          userName={userName}
          userEmail={userEmail}
        />
        <PasswordSection />
        <SectionCard
          id="payment"
          title="Payment methods"
          description="Cards saved here pre-fill at checkout. We never store the full number. Only the brand and last four for display."
        >
          {/* Real cards go through Stripe. The local-only manager remains as
              the fallback so a preview environment without keys still renders. */}
          {stripePublishableKey ? (
            <StripeCardsManager publishableKey={stripePublishableKey} />
          ) : (
            <SavedCardsManager />
          )}
        </SectionCard>
        <SectionCard
          id="addresses"
          title="Shipping addresses"
          description="Addresses saved here appear at checkout so you can ship in one tap. Mark a primary and it's selected by default."
        >
          <SavedAddressesManager />
        </SectionCard>
        <NotificationsSection
          profile={profile}
          patchProfile={patchProfile}
        />
        <PrivacySection userEmail={userEmail} />
      </div>
    </div>
    </>
  );
}

/* ================================================================== */
/*  Profile                                                            */
/* ================================================================== */

type Patcher = ReturnType<typeof useMemberProfile>['patchProfile'];
type Profile = ReturnType<typeof useMemberProfile>['profile'];

function ProfileSection({
  profile,
  patchProfile,
  userName,
  userEmail,
}: {
  profile: Profile;
  patchProfile: Patcher;
  userName: string;
  userEmail: string;
}) {
  const baseline = useMemo(
    () => ({
      fullName: profile.fullName ?? userName,
      phone: profile.phone ?? '',
      dob: profile.dateOfBirth ?? '',
    }),
    [profile.fullName, profile.phone, profile.dateOfBirth, userName],
  );

  const [form, setForm] = useState(baseline);
  const [dirty, setDirty] = useState(false);
  const { status, run } = useAction();

  // Re-sync with the profile (e.g. after localStorage hydration) while clean.
  useEffect(() => {
    if (!dirty) setForm(baseline);
  }, [baseline, dirty]);

  const edit = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const valid = form.fullName.trim().length > 1;
  const canSave = dirty && valid && status === 'idle';

  const handleSave = () => {
    if (!canSave) return;
    run(() => {
      patchProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dob.trim(),
      });
      setDirty(false);
    });
  };

  return (
    <SectionCard
      id="profile"
      title="Profile"
      description="Visible only to you and your care team."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Full name"
          value={form.fullName}
          onChange={(v) => edit({ fullName: v })}
          autoComplete="name"
        />
        <Field
          label="Email"
          value={userEmail}
          type="email"
          disabled
          hint="Contact your care team to change your sign-in email."
        />
        <Field
          label="Phone"
          value={form.phone}
          onChange={(v) => edit({ phone: v })}
          placeholder="(555) 555-5555"
          type="tel"
          autoComplete="tel"
        />
        <Field
          label="Date of birth"
          value={form.dob}
          onChange={(v) => edit({ dob: v })}
          placeholder="MM / DD / YYYY"
        />
      </div>
      <div className="mt-6 flex items-center justify-end gap-4">
        <span
          className={cn(
            'font-mono text-[12px] transition-opacity duration-300',
            dirty && status === 'idle'
              ? 'text-black/55 opacity-100'
              : 'opacity-0',
          )}
        >
          Unsaved changes
        </span>
        <SaveButton
          status={status}
          disabled={!dirty || !valid}
          onClick={handleSave}
          idleLabel="Save changes"
        />
      </div>
    </SectionCard>
  );
}

/* ================================================================== */
/*  Password + two-factor                                              */
/* ================================================================== */

function PasswordSection() {
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const tooShort = pw.next.length > 0 && pw.next.length < 8;
  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.next;
  const valid =
    pw.current.length > 0 &&
    pw.next.length >= 8 &&
    pw.confirm === pw.next;

  /*
   * This used to clear the three fields, show a tick, and leave the password
   * exactly as it was. It now actually changes it, and the current password is
   * verified server-side before it will.
   */
  const handleUpdate = async () => {
    if (!valid || status !== 'idle') return;
    setStatus('busy');
    setError(null);
    const res = await changePasswordAction({
      current: pw.current,
      next: pw.next,
    });
    if (res.ok) {
      setPw({ current: '', next: '', confirm: '' });
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2100);
    } else {
      setError(res.message ?? 'Could not update your password.');
      setStatus('idle');
    }
  };

  return (
    <SectionCard
      id="password"
      title="Password"
      description="Use a password you do not use anywhere else."
    >
      <div className="grid gap-5">
        <Field
          label="Current password"
          value={pw.current}
          onChange={(v) => setPw((p) => ({ ...p, current: v }))}
          type="password"
          autoComplete="current-password"
        />
        <Field
          label="New password"
          value={pw.next}
          onChange={(v) => setPw((p) => ({ ...p, next: v }))}
          type="password"
          autoComplete="new-password"
          hint={
            tooShort ? 'Use at least 8 characters.' : 'At least 8 characters.'
          }
        />
        <div>
          <Field
            label="Confirm new password"
            value={pw.confirm}
            onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
            type="password"
            autoComplete="new-password"
          />
          {mismatch && (
            <p className="mt-1.5 text-[13px] text-red-800">
              Passwords don&apos;t match yet.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className={cn(errorBox, 'mt-4')}>
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <SaveButton
          status={status}
          disabled={!valid}
          onClick={handleUpdate}
          idleLabel="Update password"
          busyLabel="Updating"
          doneLabel="Updated"
        />
      </div>
    </SectionCard>
  );
}

/* ================================================================== */
/*  Notifications                                                      */
/* ================================================================== */

function NotificationsSection({
  profile,
  patchProfile,
}: {
  profile: Profile;
  patchProfile: Patcher;
}) {
  const prefs = profile.notifications ?? DEFAULT_NOTIFICATIONS;
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const toggle = (key: string) => {
    const current = prefs[key] ?? DEFAULT_NOTIFICATIONS[key] ?? false;
    patchProfile({
      notifications: { ...DEFAULT_NOTIFICATIONS, ...prefs, [key]: !current },
    });
    setFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 1600);
  };

  return (
    <SectionCard
      id="notifications"
      title="Notifications"
      description="What we email or text you. Order updates can't be turned off."
      action={
        <span
          role="status"
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-[12px] text-black/70 transition-opacity duration-300',
            flash ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Check className="h-3 w-3 text-[#A8843A]" />
          Saved
        </span>
      }
    >
      <div className="space-y-2">
        {NOTIFICATION_DEFS.map((n) => {
          const on = n.required
            ? true
            : (prefs[n.key] ?? DEFAULT_NOTIFICATIONS[n.key] ?? false);
          return (
            <div
              key={n.key}
              className={cn(inset, 'flex items-center justify-between gap-3 p-4')}
            >
              <div className="min-w-0">
                <div className="text-[15px] font-medium text-black">
                  {n.title}
                  {n.required && (
                    <span className="ml-2 font-mono text-[12px] font-normal text-black/50">
                      Required
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[14px] text-black/60">{n.body}</p>
              </div>
              <button
                type="button"
                disabled={n.required}
                aria-pressed={on}
                aria-label={`Toggle ${n.title}`}
                onClick={() => !n.required && toggle(n.key)}
                className={cn(
                  'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-300 ease-out',
                  on ? 'bg-black' : 'bg-black/15',
                  n.required
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer',
                )}
              >
                <span
                  className={cn(
                    'absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out',
                    on ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ================================================================== */
/*  Privacy & data                                                     */
/* ================================================================== */

function PrivacySection({ userEmail }: { userEmail: string }) {
  const [exportStatus, setExportStatus] = useState<ActionStatus>('idle');
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closedNote, setClosedNote] = useState<string | null>(null);

  const requestExport = async () => {
    if (exportStatus !== 'idle') return;
    setExportStatus('busy');
    const res = await requestDataExportAction();
    setExportNote(res.message ?? null);
    setExportStatus(res.ok ? 'done' : 'idle');
  };

  return (
    <SectionCard
      id="privacy"
      title="Privacy & data"
      description="Manage your medical record and account data."
    >
      <div className="space-y-2">
        {/* Download */}
        <div className={cn(inset, 'p-4')}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-black">
                Download my data
              </div>
              <p className="mt-0.5 text-[14px] leading-relaxed text-black/60">
                A copy of everything we have on file. Labs, intake, orders,
                messages. Exported as a ZIP.
              </p>
            </div>
            <button
              type="button"
              disabled={exportStatus !== 'idle'}
              onClick={requestExport}
              className={cn(btnSecondary, 'self-start sm:self-auto')}
            >
              {exportStatus === 'busy' && <Spinner className="h-3 w-3" />}
              {exportStatus === 'done' && <Check className="h-3 w-3" />}
              {exportStatus === 'busy'
                ? 'Sending'
                : exportStatus === 'done'
                  ? 'Requested'
                  : 'Request'}
            </button>
          </div>
          {exportNote && (
            <p role="status" className="mt-3 rounded-[2px] bg-[#F2F2F0] px-3 py-2 text-[14px] text-black/70">
              {exportNote} We will send it to{' '}
              <span className="text-black">{userEmail}</span>.
            </p>
          )}
        </div>

        {/* Close account */}
        <div className={cn(inset, 'p-4')}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-black">
                Close my account
              </div>
              <p className="mt-0.5 text-[14px] leading-relaxed text-black/60">
                Stops all future billing. Medical records are retained per
                state law.
              </p>
            </div>
            <button
              type="button"
              disabled={!!closedNote}
              onClick={() => setCloseOpen(true)}
              className={cn(
                btnSmall,
                'self-start px-4 sm:self-auto',
                closedNote
                  ? 'cursor-default text-black/45 ring-black/10'
                  : 'bg-white text-red-800 ring-red-700/30 hover:bg-red-50',
              )}
            >
              {closedNote ? 'Requested' : 'Close account'}
            </button>
          </div>
          {closedNote && (
            <p role="status" className="mt-3 rounded-[2px] bg-[#F2F2F0] px-3 py-2 text-[14px] text-black/70">
              {closedNote} You can keep using your account until then.
            </p>
          )}
        </div>
      </div>

      {closeOpen && (
        <CloseAccountModal
          onCancel={() => setCloseOpen(false)}
          onConfirm={async () => {
            const res = await requestAccountClosureAction();
            setClosedNote(
              res.message ?? 'Could not send that. Please email support.',
            );
            setCloseOpen(false);
          }}
        />
      )}
    </SectionCard>
  );
}

function CloseAccountModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { status, run } = useAction(700, 400);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm anim-fade-in"
      />
      <div className="relative w-full max-w-md rounded-[4px] bg-white p-6 text-black shadow-[0_20px_50px_-15px_rgba(0,0,0,0.45)] ring-1 ring-black/10 anim-fade-up md:p-8">
        <h3
          className="font-display font-normal"
          style={{ fontSize: '1.5rem', fontStretch: '75%', lineHeight: 1.1 }}
        >
          Close your account?
        </h3>
        <p className="mt-3 text-[15px] leading-relaxed text-black/70">
          This stops all future billing and cancels active subscriptions. Your
          medical records are retained per state law. Our team confirms by
          email before anything is finalized.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={status !== 'idle'}
            className={btnSecondary}
          >
            Keep my account
          </button>
          <button
            type="button"
            disabled={status !== 'idle'}
            onClick={() => run(() => { void onConfirm(); })}
            className={cn(btnPrimary, 'min-w-[11rem] bg-red-700 hover:bg-red-800')}
          >
            {status === 'busy' && <Spinner />}
            {status === 'busy' ? 'Submitting' : 'Yes, close my account'}
          </button>
        </div>
      </div>
    </div>
  );
}
