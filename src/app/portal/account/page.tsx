import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/PortalShell';
import { SavedAddressesManager } from '@/components/profile/SavedAddressesManager';
import { SavedCardsManager } from '@/components/profile/SavedCardsManager';
import { getSession } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Account | Eternal Longevity',
};

export default async function AccountPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'member') redirect(user.redirectTo);

  return (
    <PortalShell
      user={user}
      nav={[
        { label: 'Dashboard', href: '/portal' },
        { label: 'Shop', href: '/portal/shop' },
        { label: 'Orders', href: '/portal/orders' },
      ]}
    >
      <div className="mb-10">
        <p className="mb-2 text-[11px] tracking-widest text-foreground/55">
          ACCOUNT
        </p>
        <h1
          className="font-semibold tracking-tight text-foreground"
          style={{
            fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          Your settings.
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* === LEFT NAV === */}
        <aside className="lg:col-span-1">
          <nav className="rounded-3xl border border-line bg-surface p-3 sticky top-24">
            {[
              { label: 'Profile', anchor: 'profile', active: true },
              { label: 'Password', anchor: 'password' },
              { label: 'Payment methods', anchor: 'payment' },
              { label: 'Shipping addresses', anchor: 'addresses' },
              { label: 'Notifications', anchor: 'notifications' },
              { label: 'Subscriptions', href: '/portal/subscriptions' },
              { label: 'Privacy & data', anchor: 'privacy' },
            ].map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors"
                >
                  <span>{item.label}</span>
                  <span aria-hidden>→</span>
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={`#${item.anchor}`}
                  className={`block rounded-2xl px-4 py-3 text-sm transition-colors ${
                    item.active
                      ? 'bg-foreground/10 text-foreground font-medium'
                      : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
                  }`}
                >
                  {item.label}
                </a>
              )
            )}
          </nav>
        </aside>

        {/* === RIGHT CONTENT === */}
        <div className="lg:col-span-2 space-y-6">
          {/* PROFILE */}
          <section
            id="profile"
            className="rounded-3xl border border-line bg-surface p-6 md:p-8 scroll-mt-24"
          >
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                Profile
              </h2>
              <p className="text-sm text-foreground/55 mt-1">
                Visible only to you and your care team.
              </p>
            </div>
            <form className="grid gap-5 sm:grid-cols-2">
              <Field label="FULL NAME" value={user.name} />
              <Field label="EMAIL" value={user.email} type="email" />
              <Field label="PHONE" placeholder="(555) 555-5555" type="tel" />
              <Field label="DATE OF BIRTH" placeholder="MM / DD / YYYY" />
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  className="rounded-full bg-foreground text-background font-semibold px-5 py-2.5 text-sm hover:bg-accent hover:text-black transition-colors"
                >
                  Save changes
                </button>
              </div>
            </form>
          </section>

          {/* PASSWORD */}
          <section
            id="password"
            className="rounded-3xl border border-line bg-surface p-6 md:p-8 scroll-mt-24"
          >
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                Password &amp; two-factor
              </h2>
              <p className="text-sm text-foreground/55 mt-1">
                Use a unique password. Two-factor adds an extra layer.
              </p>
            </div>
            <div className="grid gap-5">
              <Field label="CURRENT PASSWORD" type="password" />
              <Field label="NEW PASSWORD" type="password" />
              <Field label="CONFIRM NEW PASSWORD" type="password" />
            </div>
            <div className="mt-6 rounded-2xl border border-line bg-background p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">
                  Two-factor authentication
                </div>
                <p className="text-xs text-foreground/55 mt-0.5">
                  Authenticator app or SMS code at sign-in.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-accent/40 bg-accent/5 text-accent px-4 py-2 text-xs tracking-wider font-medium hover:bg-accent/10 transition-colors flex-shrink-0"
              >
                ENABLE
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-full bg-foreground text-background font-semibold px-5 py-2.5 text-sm hover:bg-accent hover:text-black transition-colors"
              >
                Update password
              </button>
            </div>
          </section>

          {/* PAYMENT METHODS */}
          <section
            id="payment"
            className="rounded-3xl border border-line bg-surface p-6 md:p-8 scroll-mt-24"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                  Payment methods
                </h2>
                <p className="text-sm text-foreground/55 mt-1">
                  Cards saved here pre-fill at checkout. We never store the full
                  number. Only the brand and last four for display.
                </p>
              </div>
            </div>
            <SavedCardsManager />
          </section>

          {/* ADDRESSES */}
          <section
            id="addresses"
            className="rounded-3xl border border-line bg-surface p-6 md:p-8 scroll-mt-24"
          >
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                Shipping addresses
              </h2>
              <p className="text-sm text-foreground/55 mt-1">
                Addresses saved here appear at checkout so you can ship in one
                tap. Mark a primary and it&apos;s selected by default.
              </p>
            </div>
            <SavedAddressesManager />
          </section>

          {/* NOTIFICATIONS */}
          <section
            id="notifications"
            className="rounded-3xl border border-line bg-surface p-6 md:p-8 scroll-mt-24"
          >
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                Notifications
              </h2>
              <p className="text-sm text-foreground/55 mt-1">
                What we email or text you. Order updates can&apos;t be turned off.
              </p>
            </div>
            <div className="space-y-2">
              {[
                {
                  title: 'Shipment + order updates',
                  body: 'Tracking numbers, delivery confirmations.',
                  required: true,
                  on: true,
                },
                {
                  title: 'Clinical messages',
                  body: 'Replies from your care team.',
                  required: true,
                  on: true,
                },
                {
                  title: 'Cycle reminders',
                  body: 'When to dose, when an off-cycle starts.',
                  on: true,
                },
                {
                  title: 'Product updates',
                  body: 'New peptides, formulary changes.',
                  on: false,
                },
                {
                  title: 'Marketing & offers',
                  body: 'Promotions, member-only pricing.',
                  on: false,
                },
              ].map((n, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-background p-4"
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
                    <p className="text-xs text-foreground/55 mt-0.5">
                      {n.body}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={n.required}
                    aria-pressed={n.on}
                    className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                      n.on ? 'bg-accent' : 'bg-foreground/15'
                    } ${n.required ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition-transform ${
                        n.on ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* PRIVACY */}
          <section
            id="privacy"
            className="rounded-3xl border border-line bg-surface p-6 md:p-8 scroll-mt-24"
          >
            <div className="mb-6">
              <h2 className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
                Privacy &amp; data
              </h2>
              <p className="text-sm text-foreground/55 mt-1">
                Manage your medical record and account data.
              </p>
            </div>
            <div className="space-y-2">
              <ActionRow
                title="Download my data"
                body="A copy of everything we have on file. Labs, intake, orders, messages. Exported as a ZIP."
                cta="REQUEST"
              />
              <ActionRow
                title="Close my account"
                body="Stops all future billing. Medical records are retained per state law."
                cta="CLOSE ACCOUNT"
                destructive
              />
            </div>
          </section>
        </div>
      </div>
    </PortalShell>
  );
}

function Field({
  label,
  value,
  placeholder,
  type = 'text',
}: {
  label: string;
  value?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] tracking-wider text-foreground/60">
        {label}
      </label>
      <input
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-line bg-background px-4 py-3 text-base text-foreground placeholder-foreground/30 transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </div>
  );
}

function ActionRow({
  title,
  body,
  cta,
  destructive,
}: {
  title: string;
  body: string;
  cta: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-background p-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <p className="text-xs text-foreground/55 mt-0.5 leading-relaxed">
          {body}
        </p>
      </div>
      <button
        type="button"
        className={`rounded-full px-4 py-2 text-[10px] tracking-widest font-semibold border transition-colors flex-shrink-0 ${
          destructive
            ? 'border-red-500/30 bg-red-500/5 text-red-300 hover:bg-red-500/10'
            : 'border-line bg-surface text-foreground/85 hover:text-foreground hover:border-foreground/30'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
