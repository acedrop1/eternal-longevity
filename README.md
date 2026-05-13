# Eternal Longevity

Physician-supervised peptide telehealth platform — marketing site, intake, member shop & checkout, and three role-based portals (member / doctor / admin) in a single Next.js app.

The current build is a **functional demo** running on `localStorage` for orders, profile, and cart. Auth is a demo cookie with three role logins. Phase 2 wires Supabase, Stripe, and Postmark for the real backend.

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** strict
- **Tailwind CSS 3.4** — design tokens drive a `theme-light` variant for product pages
- **lucide-react** icons
- Demo state: React Context + `localStorage` (CartProvider, OrdersProvider, MemberProfileProvider)
- Demo auth: cookie-based session (`src/lib/auth-server.ts`)

Planned production stack (Phase 2 — see roadmap):
- **Supabase** — Postgres + Auth + Storage (Pro tier for HIPAA BAA)
- **Stripe** — Checkout + Billing for subscriptions
- **Postmark** — transactional email (HIPAA BAA available)
- **Vercel** — hosting (already Next.js-native)

---

## Getting started

```bash
# install
npm install

# copy env template (most values can stay blank for the demo)
cp .env.example .env.local

# dev server at http://localhost:3000
npm run dev

# production build
npm run build && npm run start

# typecheck
npx tsc --noEmit
```

The site runs end-to-end without any env vars set — every flow is demo-data driven.

---

## Demo logins

Visit `/login` and tap any of the three demo cards to auto-fill:

| Role   | Email                    | Password | Lands at          |
| ------ | ------------------------ | -------- | ----------------- |
| Member | `demo@eternal.test`      | `demo`   | `/portal`         |
| Doctor | `doctor@eternal.test`    | `doctor` | `/portal/doctor`  |
| Admin  | `admin@eternal.test`     | `admin`  | `/portal/admin`   |

**Full demo loop** to walk a stakeholder through:

1. `/start` → complete the 7-step intake → submit
2. Log in as Member → `/portal/shop` → tap a product → Subscribe → drawer slides in → Continue to checkout → fill in card → Pay
3. Log out, log in as Admin → `/portal/admin/queue` → see the new order → **Approve & assign** → pick a physician
4. Log out, log in as Doctor → `/portal/doctor` → see the assigned case → **Sign Rx** → flips to Active Cases → **Add tracking & ship**
5. Log out, log in as Member → `/portal/orders` → see the live timeline of physician updates

Everything persists in `localStorage` so you can refresh and pick up where you left off. To wipe demo state, open DevTools → Application → Local Storage → clear `el_orders_v1`, `el_member_profile_v1`, `el_cart_v1`, and the `el_demo_session` cookie.

---

## Architecture map

```
src/
├── app/                          Next.js routes
│   ├── (marketing pages)         Home, Protocols, Science, About, FAQ, Contact
│   ├── login/                    Demo auth + role picker
│   ├── start/                    Intake wizard
│   ├── protocols/[id]/           Protocol PDPs (theme-light)
│   ├── portal/                   Three role-based portals
│   │   ├── (member pages)        Dashboard, Shop, Orders, Verify, Bloodwork, …
│   │   ├── doctor/               Queue + active cases + signed Rx history
│   │   └── admin/                Overview, Members, Queue, Pharmacy, Settings
│   ├── checkout/                 One-page Shopify-style checkout
│   └── legal/                    Terms / Privacy / Telehealth / Refunds
├── components/
│   ├── sections/                 Homepage sections (Hero, Pillars, Science, …)
│   ├── nav/                      Header + mobile menu
│   ├── portal/                   PortalShell, PortalNav (left sidebar)
│   ├── shop/                     Catalog grid + PDP
│   ├── cart/                     Drawer + provider
│   ├── checkout/                 CheckoutFlow with saved-address/card pickers
│   ├── orders/                   OrdersProvider + member/admin/doctor renderers
│   └── profile/                  MemberProfileProvider + address/card managers
└── lib/
    ├── auth.ts / auth-server.ts  Demo session + role types
    ├── orders.ts                 Order state machine + seed data
    ├── memberProfile.ts          Saved addresses + cards
    ├── intakeSchema.ts           7-step intake form definition
    ├── shopProducts.ts           Catalog of 12 peptide products
    └── protocols.ts              4 signature protocols (Recover, Sculpt, …)
```

---

## Deployment (Vercel + GitHub)

```bash
# 1. Initialize git and push to GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-org>/eternal-longevity.git
git push -u origin main

# 2. Import the repo in vercel.com
#    - Vercel auto-detects Next.js
#    - Default build command + output settings will work
#    - No env vars are strictly required for the demo

# 3. Set environment variables in Vercel
#    Project → Settings → Environment Variables
#    Paste anything you've added to .env.local
#    At minimum: NEXT_PUBLIC_SITE_URL = https://<your-domain>

# 4. Set up a custom domain
#    Project → Settings → Domains
#    Add eternallongevity.com → follow the DNS instructions

# 5. Push to deploy
git push   # auto-deploys
```

---

## Roadmap

### Phase 0 — locally polished demo  ✅ current
Everything visible works. localStorage. Demo logins. No real payments.

### Phase 1 — public demo URL
Deploy to Vercel. Hand the URL to stakeholders. Still demo-data backed.

### Phase 2 — real backend
- **Supabase** — schema for members, orders, profiles, prescriptions, updates, addresses, cards. Row Level Security so members only read their own data. Replace `localStorage` providers with Supabase queries.
- **Supabase Auth** — drop the demo cookie. Email/password + magic links + MFA. Role stored in `auth.users.app_metadata`.
- **Stripe Checkout + Stripe Billing** — `startCheckoutAction` creates a real Stripe Checkout Session; webhooks promote `pending-admin` orders only after successful payment.
- **Postmark** — replace `submitIntakeAction` console logging with real emails: intake confirmation, physician sign-off notice, shipment tracking, mid-cycle check-in.

### Phase 3 — compliance hardening (pre-launch)
- Upgrade Supabase to Pro and sign BAA
- Sign BAAs with Stripe, Postmark, Twilio, Sentry — every vendor that touches PHI
- Audit logging on every PHI access
- Penetration test
- Healthcare-attorney review of the four `/legal/*` pages
- Compliance attestation

### Phase 4 — launch
- Custom domain DNS
- Sentry + Posthog wired
- HIPAA Notice of Privacy Practices generated
- Real founder photos + testimonials
- State licensure documentation for each operating state

---

## Brand assets

These live in `/public/`. Replace as needed.

| File                       | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `/public/logo.svg`         | Wordmark — header + footer + login + checkout |
| `/public/favicon.svg`      | Browser tab icon                         |
| `/public/2.mp4`            | Hero video (faststart-encoded)           |
| `/public/videos/`          | Looping micro-videos for ambient sections |
| `/public/images/`          | Lifestyle + lab photography              |
| `/public/fonts/`           | Proxima Nova .woff2 files (Mulish fallback when absent) |

---

## Scripts

```bash
npm run dev        # local dev (http://localhost:3000)
npm run build      # production build
npm run start      # serve the production build
npm run lint       # next lint
npx tsc --noEmit   # type check
```

---

## Notes

- **All four legal pages** under `/legal/*` need attorney review before launch.
- The four-protocol formulary in `src/lib/protocols.ts` and the 12-product catalog in `src/lib/shopProducts.ts` are placeholders — sync with the medical director before any real customers see them.
- Pharmacy partner data on `/portal/admin/pharmacy` is stubbed — wire to a real 503A API when those partnerships are signed.

