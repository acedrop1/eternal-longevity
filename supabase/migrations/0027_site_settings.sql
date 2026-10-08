-- =============================================================================
-- 0027_site_settings — small admin-editable settings, one JSON value per key.
--
-- First key: 'shipping' = { "pricePerShipment": 20, "firstOrderFree": true }
-- (lib/shipping-settings). No row means those defaults.
--
-- RLS on with no policies: only the service role (the server, after an admin
-- role check) reads or writes it.
--
-- Safe to re-run.
--
-- Verify after running:
--   select relrowsecurity from pg_class where relname = 'site_settings';   -- true
--   select count(*) from pg_policies where tablename = 'site_settings';    -- 0
-- =============================================================================

create table if not exists site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table site_settings enable row level security;
revoke all on site_settings from anon, authenticated;
