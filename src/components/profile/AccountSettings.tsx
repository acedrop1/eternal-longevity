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
import { SavedCardsManager } from './SavedCardsManager';
import {
  DEFAULT_NOTIFICATIONS,
  NOTIFICATION_DEFS,
} from '@/lib/memberProfile';
import { cn } from '@/lib/utils';

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
      className={cn(
        'inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out',
        'active:scale-[0.97]',
        status === 'done'
          ? 'bg-accent text-black shadow-[0_8px_28px_-10px_#d5a850]'
          : 'bg-foreground text-background hover:bg-accent hover:text-black',
        disabled &&
          status === 'idle' &&
          'cursor-not-allowed opacity-35 hover:bg-foreground hover:text-background',
      )}
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
      className="scroll-mt-28 rounded-3xl border border-line bg-surface p-6 md:p-8"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground/55">
            {description}
          </p>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

const inputClass =
  'w-full rounded-2xl border border-line bg-background px-4 py-3 text-base text-foreground placeholder-foreground/30 transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30';

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
      <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
        {label}
      </label>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={!onChange || disabled}
        placeholder={placeholder}
        className={cn(
          inputClass,
          disabled && 'cursor-not-allowed text-foreground/55 opacity-70',
        )}
      />
      {hint && (
        <p className="mt-1.5 text-[11px] text-foreground/45">{hint}</p>
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
}: {
  userName: string;
  userEmail: string;
}) {
  const { profile, patchProfile } = useMemberProfile();

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
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ===================== LEFT NAV ===================== */}
      <aside className="lg:col-span-1">
        <nav className="sticky top-24 rounded-3xl border border-line bg-surface p-3">
          {SECTIONS.map((item) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(item.id)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-all duration-200',
                  active
                    ? 'bg-foreground/10 font-medium text-foreground'
                    : 'text-foreground/65 hover:bg-foreground/5 hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all duration-200',
                    active
                      ? 'bg-accent scale-100'
                      : 'bg-foreground/20 scale-75 group-hover:bg-foreground/40',
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="my-2 h-px bg-line" />
          <Link
            href="/portal/subscriptions"
            className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-foreground/65 transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
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
          <SavedCardsManager />
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
          label="FULL NAME"
          value={form.fullName}
          onChange={(v) => edit({ fullName: v })}
          autoComplete="name"
        />
        <Field
          label="EMAIL"
          value={userEmail}
          type="email"
          disabled
          hint="Contact your care team to change your sign-in email."
        />
        <Field
          label="PHONE"
          value={form.phone}
          onChange={(v) => edit({ phone: v })}
          placeholder="(555) 555-5555"
          type="tel"
          autoComplete="tel"
        />
        <Field
          label="DATE OF BIRTH"
          value={form.dob}
          onChange={(v) => edit({ dob: v })}
          placeholder="MM / DD / YYYY"
        />
      </div>
      <div className="mt-6 flex items-center justify-end gap-4">
        <span
          className={cn(
            'text-xs transition-opacity duration-300',
            dirty && status === 'idle'
              ? 'text-foreground/45 opacity-100'
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
  const { status, run } = useAction();
  const twoFa = useAction();
  const { profile, patchProfile } = useMemberProfile();
  const twoFaOn = !!profile.twoFactorEnabled;

  const tooShort = pw.next.length > 0 && pw.next.length < 8;
  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.next;
  const valid =
    pw.current.length > 0 &&
    pw.next.length >= 8 &&
    pw.confirm === pw.next;

  const handleUpdate = () => {
    if (!valid || status !== 'idle') return;
    run(() => setPw({ current: '', next: '', confirm: '' }));
  };

  return (
    <SectionCard
      id="password"
      title="Password & two-factor"
      description="Use a unique password. Two-factor adds an extra layer."
    >
      <div className="grid gap-5">
        <Field
          label="CURRENT PASSWORD"
          value={pw.current}
          onChange={(v) => setPw((p) => ({ ...p, current: v }))}
          type="password"
          autoComplete="current-password"
        />
        <Field
          label="NEW PASSWORD"
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
            label="CONFIRM NEW PASSWORD"
            value={pw.confirm}
            onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
            type="password"
            autoComplete="new-password"
          />
          {mismatch && (
            <p className="mt-1.5 text-[11px] text-red-300">
              Passwords don&apos;t match yet.
            </p>
          )}
        </div>
      </div>

      {/* Two-factor row */}
      <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-line bg-background p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            Two-factor authentication
            {twoFaOn && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] tracking-widest text-accent">
                <Check className="h-2.5 w-2.5" />
                ON
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-foreground/55">
            Authenticator app or SMS code at sign-in.
          </p>
        </div>
        <button
          type="button"
          disabled={twoFa.status !== 'idle'}
          onClick={() =>
            twoFa.run(() => patchProfile({ twoFactorEnabled: !twoFaOn }))
          }
          className={cn(
            'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium tracking-wider transition-all duration-200 active:scale-[0.96]',
            twoFaOn
              ? 'border-line bg-surface text-foreground/70 hover:border-foreground/30 hover:text-foreground'
              : 'border-accent/40 bg-accent/5 text-accent hover:bg-accent/10',
          )}
        >
          {twoFa.status === 'busy' && <Spinner className="h-3 w-3" />}
          {twoFa.status === 'busy'
            ? twoFaOn
              ? 'DISABLING'
              : 'ENABLING'
            : twoFaOn
              ? 'DISABLE'
              : 'ENABLE'}
        </button>
      </div>

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
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] tracking-wider text-accent transition-opacity duration-300',
            flash ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Check className="h-3 w-3" />
          SAVED
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
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-background p-4 transition-colors duration-200"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {n.title}
                  {n.required && (
                    <span className="ml-2 text-[10px] tracking-widest text-foreground/45">
                      REQUIRED
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-foreground/55">{n.body}</p>
              </div>
              <button
                type="button"
                disabled={n.required}
                aria-pressed={on}
                aria-label={`Toggle ${n.title}`}
                onClick={() => !n.required && toggle(n.key)}
                className={cn(
                  'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-300 ease-out',
                  on ? 'bg-accent' : 'bg-foreground/15',
                  n.required
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer active:scale-95',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-foreground shadow-sm transition-transform duration-300 ease-out',
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
  const download = useAction(900, 6000);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closed, setClosed] = useState(false);

  return (
    <SectionCard
      id="privacy"
      title="Privacy & data"
      description="Manage your medical record and account data."
    >
      <div className="space-y-2">
        {/* Download */}
        <div className="rounded-2xl border border-line bg-background p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                Download my data
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-foreground/55">
                A copy of everything we have on file. Labs, intake, orders,
                messages. Exported as a ZIP.
              </p>
            </div>
            <button
              type="button"
              disabled={download.status !== 'idle'}
              onClick={() => download.run(() => {})}
              className={cn(
                'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[10px] font-semibold tracking-widest transition-all duration-200 active:scale-[0.96]',
                download.status === 'done'
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-line bg-surface text-foreground/85 hover:border-foreground/30 hover:text-foreground',
              )}
            >
              {download.status === 'busy' && <Spinner className="h-3 w-3" />}
              {download.status === 'done' && <Check className="h-3 w-3" />}
              {download.status === 'busy'
                ? 'PREPARING'
                : download.status === 'done'
                  ? 'REQUESTED'
                  : 'REQUEST'}
            </button>
          </div>
          {download.status === 'done' && (
            <p className="mt-3 rounded-xl bg-accent/5 px-3 py-2 text-xs text-foreground/70">
              We&apos;re assembling your export. A secure download link will be
              emailed to{' '}
              <span className="text-foreground/90">{userEmail}</span> within 24
              hours.
            </p>
          )}
        </div>

        {/* Close account */}
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.03] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                Close my account
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-foreground/55">
                Stops all future billing. Medical records are retained per
                state law.
              </p>
            </div>
            <button
              type="button"
              disabled={closed}
              onClick={() => setCloseOpen(true)}
              className={cn(
                'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[10px] font-semibold tracking-widest transition-all duration-200 active:scale-[0.96]',
                closed
                  ? 'cursor-default border-line bg-surface text-foreground/45'
                  : 'border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/10',
              )}
            >
              {closed ? 'REQUESTED' : 'CLOSE ACCOUNT'}
            </button>
          </div>
          {closed && (
            <p className="mt-3 rounded-xl bg-red-500/[0.06] px-3 py-2 text-xs text-foreground/70">
              Account closure requested. Our team will confirm by email and
              process it within 3 business days. You can keep using your
              account until then.
            </p>
          )}
        </div>
      </div>

      {closeOpen && (
        <CloseAccountModal
          onCancel={() => setCloseOpen(false)}
          onConfirm={() => {
            setClosed(true);
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
        className="absolute inset-0 bg-background/70 backdrop-blur-sm anim-fade-in"
      />
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl anim-fade-up">
        <div className="mb-1 text-[10px] tracking-widest text-red-300">
          CONFIRM
        </div>
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          Close your account?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/65">
          This stops all future billing and cancels active subscriptions. Your
          medical records are retained per state law. Our team confirms by
          email before anything is finalized.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={status !== 'idle'}
            className="rounded-full border border-line bg-background px-5 py-2.5 text-sm font-medium text-foreground/85 transition-colors duration-200 hover:border-foreground/30 hover:text-foreground"
          >
            Keep my account
          </button>
          <button
            type="button"
            disabled={status !== 'idle'}
            onClick={() => run(onConfirm)}
            className="inline-flex min-w-[11rem] items-center justify-center gap-2 rounded-full bg-red-500/90 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-500 active:scale-[0.97] disabled:opacity-70"
          >
            {status === 'busy' && <Spinner />}
            {status === 'busy' ? 'Submitting' : 'Yes, close my account'}
          </button>
        </div>
      </div>
    </div>
  );
}
