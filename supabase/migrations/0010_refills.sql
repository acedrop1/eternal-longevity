-- =============================================================================
-- 0010_refills — make a prescription something a refill can actually ship on.
--
-- Until now nothing wrote a prescriptions row when a doctor signed an order, so
-- a plan reaching its second cycle had nothing to renew against. A prescription
-- also had no end: no expiry, no refill count, no link back to the order it was
-- written for. These four columns are what a renewal has to check before it
-- charges anyone.
-- =============================================================================

alter table prescriptions
  add column if not exists order_id          uuid references orders(id) on delete set null,
  add column if not exists cadence           text,          -- monthly | quarterly | once
  add column if not exists expires_at        date,          -- after this, re-review
  add column if not exists refills_remaining integer not null default 0;

create index if not exists prescriptions_order_id_idx   on prescriptions(order_id);
create index if not exists prescriptions_expires_at_idx on prescriptions(expires_at);

-- A renewal needs to find the prescription a subscription ships against.
alter table subscriptions
  add column if not exists prescription_id uuid references prescriptions(id) on delete set null,
  add column if not exists last_charged_at timestamptz;

create index if not exists subscriptions_next_billing_idx
  on subscriptions(next_billing_date)
  where status = 'active';
