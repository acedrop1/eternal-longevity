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
