# Backend setup

This project ships with a complete backend **scaffold**: a Supabase schema,
typed clients, a Stripe webhook, and email/SMS helpers. None of it is active
until you create the accounts below and add their keys.

## How the two modes work

The app checks for environment variables at runtime:

- **Demo mode** (no keys set) — auth is three hardcoded accounts, and cart,
  orders, subscriptions, and profile data live in the browser's localStorage.
  Everything works for previewing; nothing is saved server-side.
- **Live mode** (keys set) — each service turns on as soon as its keys are
  present. You can switch them on one at a time.

Copy `.env.example` to `.env.local` and fill values in as you go.

---

## 1. Supabase (database, auth, file storage)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the migrations in order: first
   `supabase/migrations/0001_initial_schema.sql` (tables, enums, RLS, the
   new-user trigger, the private `id-verifications` storage bucket), then
   `supabase/migrations/0002_fulfillment.sql` (the `pharmacy` role and the
   `fulfillment_orders` queue), then `supabase/migrations/0003_account_status.sql`
   (the `account_status` column for suspend / deactivate).
3. Go to **Project Settings -> API** and copy into `.env.local`:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key -> `SUPABASE_SERVICE_ROLE_KEY` (server-only, secret)
4. Under **Authentication -> Providers**, keep Email enabled. Under
   **Authentication -> URL Configuration**, set the Site URL to your domain and
   add `https://<your-domain>/auth/callback` (and the localhost equivalent) to
   the Redirect URLs allow-list — signup confirmation and password reset both
   land there.
5. Roles: every new signup gets a `profiles` row with role `member`. To make
   someone a doctor or admin, edit their `role` column in the **Table Editor**
   (or via SQL: `update profiles set role = 'admin' where email = '...';`).

The typed schema lives in `src/lib/database.types.ts`. If you change the SQL,
regenerate it: `supabase gen types typescript --project-id <id> --schema public`.

## 2. Stripe (payments + subscriptions)

1. Create an account at [stripe.com](https://stripe.com). Stay in **test mode**
   until launch.
2. **Developers -> API keys** -> copy into `.env.local`:
   - Publishable key -> `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key -> `STRIPE_SECRET_KEY`
3. Create a Product + recurring Price for each protocol/peptide cycle. Store the
   Stripe price IDs alongside your catalog when you wire checkout.
4. **Webhook:** Developers -> Webhooks -> add endpoint
   `https://<your-domain>/api/webhooks/stripe`. Select at least
   `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `checkout.session.completed`, `invoice.paid`, and the
   `customer.subscription.*` events.
   Copy the signing secret -> `STRIPE_WEBHOOK_SECRET`.
5. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   — it prints a `whsec_...` secret to use locally.

> Peptides and compounded medications are a restricted category. Stripe may
> require underwriting or decline the account; you may need a high-risk
> processor. Resolve this before launch.

## 3. Resend (email)

1. Create an account at [resend.com](https://resend.com) and verify your
   sending domain (DNS records).
2. **API Keys** -> create one -> `RESEND_API_KEY`.
3. Set `RESEND_FROM_EMAIL` to a verified address and `CARE_TEAM_EMAIL` to the
   inbox that should receive new-intake notifications.
4. Sign a BAA with Resend before any email contains patient health info.

## 4. Twilio (SMS — optional)

1. Create an account at [twilio.com](https://twilio.com) and buy a number.
2. Copy Account SID, Auth Token, and the number into `TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.

## 5. Deploy

Add every key from `.env.local` to **Vercel -> Project -> Settings ->
Environment Variables**, then redeploy. The webhook endpoint is live at
`/api/webhooks/stripe` automatically.

---

## What's wired vs. what still needs wiring

**Wired and working in live mode:**

- Database schema + RLS (`supabase/migrations/`)
- Supabase clients — browser, server, service-role admin (`src/lib/supabase/`)
- Session-refresh middleware (`src/middleware.ts`) — no-op until Supabase is set
- Stripe client + webhook handler (`src/lib/stripe.ts`, `src/app/api/webhooks/`)
- Email + SMS helpers (`src/lib/email.ts`, `src/lib/sms.ts`)
- **Intake submission** — `submitIntakeAction` persists to `intake_submissions`
  and emails the patient + care team when configured.
- **Auth** — dual-mode. `getSession()` plus the login / signup / logout /
  password-reset actions all use Supabase Auth when configured and fall back to
  the demo cookie otherwise. `/login`, `/signup`, `/forgot-password`,
  `/auth/reset`, and the `/auth/callback` code-exchange route are all built.
  New signups get the `member` role; promote to `doctor` / `admin` in Supabase.
- **Checkout** — `createCheckoutSessionAction` creates a Stripe Checkout
  Session plus a pending `orders` row; the webhook flips it to paid. The
  checkout flow redirects to Stripe automatically once keys are set.
- **Admin billing** — `/portal/admin/billing` lets an admin create
  subscriptions, charge a one-off amount, issue refunds, and send a secure
  add-a-card link. All token-based via Stripe (`src/lib/billing.ts`) — the app
  never collects or stores a raw card number.
- **Pharmacy fulfillment** — a `pharmacy` role + portal (`/portal/pharmacy`).
  The admin submits signed prescriptions from `/portal/admin/fulfillment`; the
  pharmacy accepts each order and adds tracking, which notifies the patient.
  Set `PHARMACY_EMAIL` so the pharmacy gets new-order alerts. Each recurring
  paid cycle (`invoice.paid`) auto-creates a refill draft in the admin queue.

**Still on demo data — the next wiring tasks:**

- **Portal data** — `CartProvider`, `OrdersProvider`, `MemberProfileProvider`,
  and the doctor/admin pages read localStorage / mock arrays. Point them at the
  matching Supabase tables.
- **ID verification** — `/portal/verify` should upload to the `id-verifications`
  bucket and insert an `id_verifications` row.

## Compliance reminders

This is a physician-supervised compounded-medication telehealth business. Before
accepting real orders you also need: licensed prescribers per operating state, a
503A compounding pharmacy contract, a telehealth/PC-MSO legal structure,
LegitScript certification, and signed BAAs with every vendor touching PHI
(Supabase, Resend, Twilio). The code is necessary but not sufficient.
