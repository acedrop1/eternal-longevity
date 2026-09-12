-- =============================================================================
-- 0011_credentials_audit — the prescriber's credential as data, and a record of
-- who changed it.
--
-- "Bader Elder, MD" was stored inside full_name and the state licence was a
-- constant in a page file, so correcting a credential meant editing code and
-- nothing anywhere recorded that it had changed. Both appear on prescriptions
-- and on published legal pages, which makes them exactly the things a board or
-- a certifier asks you to evidence.
-- =============================================================================

alter table profiles
  add column if not exists credential      text,   -- MD | DO | NP | PA | PharmD
  add column if not exists license_state   text,
  add column if not exists license_number  text,
  add column if not exists license_expires date;

-- -----------------------------------------------------------------------------
-- Who changed what, when. Append-only: rows are never updated or deleted.
-- -----------------------------------------------------------------------------
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id) on delete set null,
  actor_name  text not null,
  actor_role  text not null,
  entity      text not null,          -- 'prescriber', 'member', 'order'
  entity_id   uuid,
  field       text not null,
  old_value   text,
  new_value   text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_idx on audit_log(created_at desc);
create index if not exists audit_log_entity_idx  on audit_log(entity, entity_id);

alter table audit_log enable row level security;

-- Readable by admins; written only through the service role.
drop policy if exists audit_log_read on audit_log;
create policy audit_log_read on audit_log
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role::text = 'admin'
    )
  );
