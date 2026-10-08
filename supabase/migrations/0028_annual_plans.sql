-- =============================================================================
-- 0028_annual_plans — the second box of a 12-month plan.
--
-- A 12-month plan is billed once and ships two 6-month boxes. Box 1 ships with
-- the charge; box 2 is owed six months later and shipped, uncharged, by the
-- daily cron /api/cron/annual-shipments (lib/annual-shipments).
--
--   next_shipment_date      when box 2 is due; null when no box is owed.
--                           Set when a year is billed, cleared (claimed) the
--                           moment box 2 is created, so it ships once a year.
--   next_shipment_order_id  the order whose charge paid for that year. Box 2
--                           waits until it is paid and is dropped if it closed.
--
-- Members cannot write either column: the 0018 guard lets them change only
-- status. Safe to re-run.
--
-- Verify after running:
--   select column_name from information_schema.columns
--    where table_name = 'subscriptions' and column_name like 'next_shipment%';  -- 2 rows
-- =============================================================================

alter table subscriptions
  add column if not exists next_shipment_date date,
  add column if not exists next_shipment_order_id uuid references orders(id) on delete set null;

create index if not exists subscriptions_next_shipment_idx
  on subscriptions(next_shipment_date)
  where next_shipment_date is not null;
