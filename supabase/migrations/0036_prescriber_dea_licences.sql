-- 0036: the prescriber's DEA number and his licences in other states.
-- RxHere's practice API takes every licence (one per state) on each
-- prescription, and a DEA number for controlled substances.
-- other_licenses: {"NY": "...", "PA": "...", "MI": "..."}; the primary licence
-- stays in license_state / license_number.

alter table profiles add column if not exists dea_number text
  check (dea_number is null or dea_number ~ '^[A-Z]{2}[0-9]{7}$');
alter table profiles add column if not exists other_licenses jsonb not null default '{}'::jsonb;

-- Check:
--   select column_name from information_schema.columns
--    where table_name = 'profiles' and column_name in ('dea_number', 'other_licenses');  -- 2 rows
