-- Eternal Longevity — migration 0004: order workflow
--
-- The app models a clinical order lifecycle that the original `orders` table
-- did not cover: a member places an order, an admin approves it, a physician
-- signs it (which is when billing starts), and the pharmacy compounds and
-- ships it. This migration extends the schema so that flow can live in
-- Postgres instead of each browser's localStorage.
--
-- Safe to re-run.

-- 1) Workflow states -----------------------------------------------------
-- Postgres cannot add enum values inside a transaction block that also uses
-- them, so each is added separately and guarded.
do $$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'order_status' and e.enumlabel = 'pending-admin') then
    alter type order_status add value 'pending-admin';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'order_status' and e.enumlabel = 'denied-admin') then
    alter type order_status add value 'denied-admin';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'order_status' and e.enumlabel = 'assigned') then
    alter type order_status add value 'assigned';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'order_status' and e.enumlabel = 'signed') then
    alter type order_status add value 'signed';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'order_status' and e.enumlabel = 'declined-clinical') then
    alter type order_status add value 'declined-clinical';
  end if;
end$$;

-- 2) Order columns the workflow needs ------------------------------------
alter table orders add column if not exists member_name          text;
alter table orders add column if not exists member_email         text;
alter table orders add column if not exists ship_state           text;
alter table orders add column if not exists assigned_physician_id text;
alter table orders add column if not exists admin_note           text;
alter table orders add column if not exists physician_note       text;
alter table orders add column if not exists paid_at              timestamptz;
alter table orders add column if not exists first_charge_cents   integer;
alter table orders add column if not exists card_last4           text;
alter table orders add column if not exists tax_cents            integer not null default 0;

-- 3) Line-item presentation fields ---------------------------------------
alter table order_items add column if not exists cadence       text;
alter table order_items add column if not exists cadence_label text;
alter table order_items add column if not exists image         text;
alter table order_items add column if not exists swatch        text;

-- 4) Timeline authorship --------------------------------------------------
alter table order_updates add column if not exists author        text;
alter table order_updates add column if not exists author_role   text;
alter table order_updates add column if not exists status_change text;

-- 5) Indexes for the queue views -----------------------------------------
create index if not exists orders_status_idx     on orders(status);
create index if not exists orders_created_at_idx on orders(created_at desc);
create index if not exists orders_member_idx     on orders(member_email);

-- 6) Let clinical staff update orders they are working -------------------
-- The base schema only allowed admins to update. Doctors need to sign and
-- decline; the pharmacy portal writes tracking through the service role.
drop policy if exists "orders: clinical updates" on orders;
create policy "orders: clinical updates"
  on orders for update
  using (is_clinical())
  with check (is_clinical());
