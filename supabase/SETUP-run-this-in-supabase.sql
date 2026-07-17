-- ============================================================
-- ETERNAL LONGEVITY - full database setup
-- HOW TO USE: open the Supabase SQL Editor, paste this ENTIRE
-- file, and click Run. Run once on a brand-new project.
-- ============================================================

-- ========== PART 1 of 3: core schema ==========
-- =============================================================================
-- Eternal Longevity — initial database schema
-- =============================================================================
-- Run this once against your Supabase project. Either:
--   • paste it into the Supabase dashboard SQL editor and run, or
--   • use the Supabase CLI:  supabase db push
--
-- It is idempotent-ish for enums/extensions but assumes a fresh database for
-- the tables. RLS (row-level security) is enabled on every table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role           as enum ('member', 'doctor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type intake_status       as enum ('submitted', 'in_review', 'needs_info', 'approved', 'declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prescription_status as enum ('pending', 'signed', 'declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status        as enum ('pending', 'paid', 'compounding', 'shipped', 'delivered', 'canceled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'paused', 'pending_review', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Keeps an updated_at column fresh on every UPDATE.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- profiles  — one row per auth.users row, created automatically on signup
-- =============================================================================
create table if not exists profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  role                user_role   not null default 'member',
  full_name           text,
  email               text,
  phone               text,
  date_of_birth       date,
  stripe_customer_id  text,
  two_factor_enabled  boolean     not null default false,
  notification_prefs  jsonb       not null default
                        '{"shipment":true,"clinical":true,"cycle":true,"product":false,"marketing":false}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- New auth user -> matching profile row. SECURITY DEFINER so it bypasses RLS.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Role helpers. SECURITY DEFINER so RLS policies can call them without
-- recursively triggering profiles' own RLS.
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function is_clinical()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('doctor', 'admin'));
$$;

-- =============================================================================
-- addresses  — saved shipping addresses
-- =============================================================================
create table if not exists addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  label       text not null default 'Home',
  full_name   text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  state       text not null,
  zip         text not null,
  phone       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists addresses_user_id_idx on addresses(user_id);

-- =============================================================================
-- payment_methods  — display metadata only. The card itself lives in Stripe.
-- =============================================================================
create table if not exists payment_methods (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references profiles(id) on delete cascade,
  stripe_payment_method_id text,
  brand                    text not null,
  last4                    text not null,
  exp_month                text not null,
  exp_year                 text not null,
  name_on_card             text,
  is_primary               boolean not null default false,
  created_at               timestamptz not null default now()
);
create index if not exists payment_methods_user_id_idx on payment_methods(user_id);

-- =============================================================================
-- intake_submissions  — completed intake wizard answers
-- =============================================================================
create table if not exists intake_submissions (
  id                  uuid primary key default gen_random_uuid(),
  case_id             text unique not null,
  user_id             uuid references profiles(id) on delete set null,
  email               text not null,
  answers             jsonb not null,
  status              intake_status not null default 'submitted',
  assigned_doctor_id  uuid references profiles(id) on delete set null,
  review_notes        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists intake_user_id_idx  on intake_submissions(user_id);
create index if not exists intake_status_idx   on intake_submissions(status);

drop trigger if exists intake_updated_at on intake_submissions;
create trigger intake_updated_at before update on intake_submissions
  for each row execute function set_updated_at();

-- =============================================================================
-- prescriptions  — a physician-signed protocol
-- =============================================================================
create table if not exists prescriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  intake_id      uuid references intake_submissions(id) on delete set null,
  doctor_id      uuid references profiles(id) on delete set null,
  protocol_name  text not null,
  items          jsonb not null default '[]'::jsonb,   -- [{ name, dose }]
  status         prescription_status not null default 'pending',
  notes          text,
  signed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists prescriptions_user_id_idx on prescriptions(user_id);

drop trigger if exists prescriptions_updated_at on prescriptions;
create trigger prescriptions_updated_at before update on prescriptions
  for each row execute function set_updated_at();

-- =============================================================================
-- orders  + order_items + order_updates
-- =============================================================================
create table if not exists orders (
  id                       uuid primary key default gen_random_uuid(),
  order_number             text unique not null,
  user_id                  uuid not null references profiles(id) on delete cascade,
  status                   order_status not null default 'pending',
  subtotal_cents           integer not null default 0,
  shipping_cents           integer not null default 0,
  total_cents              integer not null default 0,
  stripe_payment_intent_id text,
  shipping_address         jsonb,
  tracking_carrier         text,
  tracking_number          text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists orders_user_id_idx on orders(user_id);
create index if not exists orders_status_idx  on orders(status);

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id) on delete cascade,
  product_id       text not null,
  product_name     text not null,
  quantity         integer not null default 1,
  unit_price_cents integer not null default 0
);
create index if not exists order_items_order_id_idx on order_items(order_id);

create table if not exists order_updates (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  label      text not null,
  body       text,
  created_at timestamptz not null default now()
);
create index if not exists order_updates_order_id_idx on order_updates(order_id);

-- =============================================================================
-- subscriptions  — recurring cycles, mirrored from Stripe
-- =============================================================================
create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references profiles(id) on delete cascade,
  product_id             text not null,
  product_name           text not null,
  stripe_subscription_id text,
  status                 subscription_status not null default 'pending_review',
  cadence_label          text,
  per_cycle_cents        integer not null default 0,
  next_billing_date      date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists subscriptions_user_id_idx on subscriptions(user_id);

drop trigger if exists subscriptions_updated_at on subscriptions;
create trigger subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();

-- =============================================================================
-- id_verifications  — uploaded photo ID, file stored in Storage
-- =============================================================================
create table if not exists id_verifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  status       verification_status not null default 'pending',
  reviewed_by  uuid references profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists id_verifications_user_id_idx on id_verifications(user_id);

-- =============================================================================
-- messages  — care-team / member messaging
-- =============================================================================
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  thread_user_id  uuid not null references profiles(id) on delete cascade,  -- the member the thread belongs to
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists messages_thread_idx on messages(thread_user_id);

-- =============================================================================
-- Row-Level Security
-- =============================================================================
alter table profiles           enable row level security;
alter table addresses          enable row level security;
alter table payment_methods     enable row level security;
alter table intake_submissions  enable row level security;
alter table prescriptions       enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table order_updates       enable row level security;
alter table subscriptions       enable row level security;
alter table id_verifications    enable row level security;
alter table messages            enable row level security;

-- profiles -------------------------------------------------------------------
create policy "profiles: read own or clinical"
  on profiles for select using (id = auth.uid() or is_clinical());
create policy "profiles: update own or admin"
  on profiles for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- addresses ------------------------------------------------------------------
create policy "addresses: owner full access"
  on addresses for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- payment_methods ------------------------------------------------------------
create policy "payment_methods: owner full access"
  on payment_methods for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- intake_submissions ---------------------------------------------------------
create policy "intake: read own or clinical"
  on intake_submissions for select using (user_id = auth.uid() or is_clinical());
create policy "intake: member inserts own"
  on intake_submissions for insert with check (user_id = auth.uid());
create policy "intake: clinical updates"
  on intake_submissions for update using (is_clinical()) with check (is_clinical());

-- prescriptions --------------------------------------------------------------
create policy "rx: read own or clinical"
  on prescriptions for select using (user_id = auth.uid() or is_clinical());
create policy "rx: clinical writes"
  on prescriptions for insert with check (is_clinical());
create policy "rx: clinical updates"
  on prescriptions for update using (is_clinical()) with check (is_clinical());

-- orders ---------------------------------------------------------------------
create policy "orders: read own or clinical"
  on orders for select using (user_id = auth.uid() or is_clinical());
create policy "orders: admin writes"
  on orders for insert with check (is_admin());
create policy "orders: admin updates"
  on orders for update using (is_admin()) with check (is_admin());

-- order_items ----------------------------------------------------------------
create policy "order_items: read via parent order"
  on order_items for select using (
    exists (select 1 from orders o
            where o.id = order_items.order_id
              and (o.user_id = auth.uid() or is_clinical()))
  );
create policy "order_items: admin writes"
  on order_items for all using (is_admin()) with check (is_admin());

-- order_updates --------------------------------------------------------------
create policy "order_updates: read via parent order"
  on order_updates for select using (
    exists (select 1 from orders o
            where o.id = order_updates.order_id
              and (o.user_id = auth.uid() or is_clinical()))
  );
create policy "order_updates: clinical writes"
  on order_updates for all using (is_clinical()) with check (is_clinical());

-- subscriptions --------------------------------------------------------------
create policy "subs: read own or clinical"
  on subscriptions for select using (user_id = auth.uid() or is_clinical());
create policy "subs: owner or admin updates"
  on subscriptions for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy "subs: admin inserts"
  on subscriptions for insert with check (is_admin());

-- id_verifications -----------------------------------------------------------
create policy "idv: read own or clinical"
  on id_verifications for select using (user_id = auth.uid() or is_clinical());
create policy "idv: member inserts own"
  on id_verifications for insert with check (user_id = auth.uid());
create policy "idv: clinical updates"
  on id_verifications for update using (is_clinical()) with check (is_clinical());

-- messages -------------------------------------------------------------------
create policy "messages: read own thread or clinical"
  on messages for select using (thread_user_id = auth.uid() or is_clinical());
create policy "messages: send to own thread or clinical"
  on messages for insert with check (
    sender_id = auth.uid()
    and (thread_user_id = auth.uid() or is_clinical())
  );

-- =============================================================================
-- Storage — private bucket for uploaded photo IDs
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('id-verifications', 'id-verifications', false)
on conflict (id) do nothing;

-- Members read/write only files under a folder named after their own uid:
--   id-verifications/<auth.uid()>/<filename>
create policy "idv storage: member manages own folder"
  on storage.objects for all
  using (
    bucket_id = 'id-verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'id-verifications'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "idv storage: clinical reads all"
  on storage.objects for select
  using (bucket_id = 'id-verifications' and is_clinical());

-- =============================================================================
-- End of schema
-- =============================================================================


-- ========== PART 2 of 3: pharmacy fulfillment ==========
-- =============================================================================
-- Eternal Longevity — migration 0002: pharmacy fulfillment
-- =============================================================================
-- Adds the drop-ship fulfillment workflow: a `pharmacy` role, prescriber NPI,
-- and a fulfillment_orders queue the admin submits to the pharmacy (Kaduceus),
-- which the pharmacy then accepts and adds tracking to.
--
-- Run AFTER 0001_initial_schema.sql, in the Supabase SQL editor or via the CLI.
-- =============================================================================

-- New role for pharmacy partner accounts. (Safe to re-run.)
alter type user_role add value if not exists 'pharmacy';

-- Prescriber NPI, needed on every order sent to the pharmacy.
alter table profiles add column if not exists npi text;

-- Fulfillment lifecycle.
do $$ begin
  create type fulfillment_status as enum (
    'draft',      -- created from a signed Rx, not yet sent
    'submitted',  -- sent to the pharmacy
    'accepted',   -- pharmacy acknowledged the order
    'shipped',    -- tracking added
    'delivered',
    'canceled'
  );
exception when duplicate_object then null; end $$;

-- Is the current user a pharmacy account? `role::text` avoids referencing the
-- freshly-added enum value as a literal.
create or replace function is_pharmacy()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role::text = 'pharmacy'
  );
$$;

-- =============================================================================
-- fulfillment_orders
-- =============================================================================
-- A patient-specific drop-ship order. The pharmacy ships straight to the
-- patient; the clinic never touches product. Patient + prescriber details are
-- snapshotted onto the row so the order is self-contained.
create table if not exists fulfillment_orders (
  id                 uuid primary key default gen_random_uuid(),
  order_ref          text unique not null,
  user_id            uuid references profiles(id) on delete set null,   -- the patient
  prescription_id    uuid references prescriptions(id) on delete set null,
  pharmacy_id        uuid references profiles(id) on delete set null,   -- assigned pharmacy account
  status             fulfillment_status not null default 'draft',
  patient_name       text not null,
  patient_dob        date,
  shipping_address   jsonb,                       -- { line1, line2, city, state, zip }
  prescriber_name    text,
  prescriber_npi     text,
  items              jsonb not null default '[]'::jsonb,  -- [{ product, strength, size, quantity }]
  cycle_label        text,                        -- e.g. "Month 1 of 6"
  tracking_carrier   text,
  tracking_number    text,
  notes              text,
  submitted_at       timestamptz,
  shipped_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists fulfillment_user_id_idx  on fulfillment_orders(user_id);
create index if not exists fulfillment_status_idx   on fulfillment_orders(status);

drop trigger if exists fulfillment_updated_at on fulfillment_orders;
create trigger fulfillment_updated_at before update on fulfillment_orders
  for each row execute function set_updated_at();

-- =============================================================================
-- Row-Level Security
-- =============================================================================
alter table fulfillment_orders enable row level security;

-- Patients see their own orders; clinical staff and the pharmacy see all.
create policy "fulfillment: read own / clinical / pharmacy"
  on fulfillment_orders for select
  using (user_id = auth.uid() or is_clinical() or is_pharmacy());

-- Only the admin creates/submits orders.
create policy "fulfillment: admin inserts"
  on fulfillment_orders for insert with check (is_admin());

-- Admin manages; the pharmacy updates its own queue (accept, tracking).
create policy "fulfillment: admin or pharmacy updates"
  on fulfillment_orders for update
  using (is_admin() or is_pharmacy())
  with check (is_admin() or is_pharmacy());

-- =============================================================================
-- End of migration 0002
-- =============================================================================


-- ========== PART 3 of 3: account status ==========
-- =============================================================================
-- Eternal Longevity — migration 0003: account status
-- =============================================================================
-- Adds an account status to every profile so the admin can suspend or
-- deactivate users (members, doctors, pharmacies) without deleting their
-- records — important for a medical practice with retention obligations.
--
-- Run AFTER 0002_fulfillment.sql.
-- =============================================================================

do $$ begin
  create type account_status as enum (
    'active',       -- normal
    'suspended',    -- sign-in blocked, can be reactivated
    'deactivated'   -- account closed, record retained
  );
exception when duplicate_object then null; end $$;

alter table profiles
  add column if not exists account_status account_status not null default 'active';
