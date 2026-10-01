-- =============================================================================
-- 0021_pharmacy_orders — orders sent to the pharmacy over its partner API.
--
-- orders.pharmacy_*: what the pharmacy told us about this order. Our order
-- number is the partnerOrderId, so the pharmacy's ids are stored only to show
-- staff and to reconcile. pharmacy_status holds the pharmacy's own status
-- words (AWAITING_VERIFICATION, COMPOUNDING, SHIPPED…) plus three of ours:
-- SENDING (a submit is in flight — the claim that stops a double submit),
-- ERROR (it did not go; pharmacy_error says why, staff can retry) and MANUAL /
-- DRY_RUN (no SKU yet or dry-run mode: placed by hand as before).
-- pharmacy_error is written by the server from fixed text, never from patient
-- data.
--
-- prescriptions.directions: the sig. The pharmacist verifies the compound
-- against it, so the prescriber writes it when he signs; refills ship on the
-- same prescription and so reuse it.
--
-- pharmacy_events: one row per webhook delivery, written before it is acted
-- on. unique (reference, event, occurred_at) is the idempotency key the
-- pharmacy documents — its retries (up to 6) and replays insert nothing and
-- change nothing. reason holds the pharmacist's hold / cancel note, so it is
-- staff-only: members never read this table.
--
-- Safe to re-run.
--
-- Verify after running:
--   select column_name from information_schema.columns
--   where table_name = 'orders' and column_name like 'pharmacy_%' order by 1;
--   -- expect 6: pharmacy_batch_id, pharmacy_error, pharmacy_order_id,
--   -- pharmacy_status, pharmacy_submitted_at, pharmacy_updated_at
--   select column_name from information_schema.columns
--   where table_name = 'prescriptions' and column_name = 'directions';  -- 1 row
--   select count(*) from pharmacy_events;                               -- 0 or more
--   select relrowsecurity from pg_class where relname = 'pharmacy_events'; -- true
--   select policyname, cmd from pg_policies where tablename = 'pharmacy_events';
--   -- expect one SELECT policy, nothing else
-- =============================================================================

alter table orders
  add column if not exists pharmacy_order_id     text,
  add column if not exists pharmacy_batch_id     text,
  add column if not exists pharmacy_status       text,
  add column if not exists pharmacy_submitted_at timestamptz,
  add column if not exists pharmacy_updated_at   timestamptz,
  add column if not exists pharmacy_error        text
    check (pharmacy_error is null or char_length(pharmacy_error) <= 500);

create index if not exists orders_pharmacy_order_id_idx
  on orders(pharmacy_order_id) where pharmacy_order_id is not null;

alter table prescriptions
  add column if not exists directions text
    check (directions is null or char_length(directions) <= 1000);

create table if not exists pharmacy_events (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null check (char_length(reference) <= 100),
  event            text not null check (char_length(event) <= 40),
  occurred_at      timestamptz not null,
  tracking_number  text,
  carrier          text,
  reason           text check (reason is null or char_length(reason) <= 2000),
  processed_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (reference, event, occurred_at)
);

create index if not exists pharmacy_events_reference_idx
  on pharmacy_events(reference, occurred_at desc);

alter table pharmacy_events enable row level security;

-- Clinical staff (doctor, admin) read. Writes come only from the webhook
-- through the service role, so there is no insert, update or delete policy.
drop policy if exists "pharmacy_events: clinical reads" on pharmacy_events;
create policy "pharmacy_events: clinical reads"
  on pharmacy_events for select using (is_clinical());
