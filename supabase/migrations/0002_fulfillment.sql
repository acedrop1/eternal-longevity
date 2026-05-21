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
