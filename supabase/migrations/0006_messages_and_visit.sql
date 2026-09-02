-- 0006 — split each member's message thread into a 'support' and a 'doctor'
-- channel, and add the two-phase intake status: a short pre-checkout profile,
-- then a clinical "visit" completed in the portal before prescriber review.
--
-- The messages table itself (0001) already carries everything else we need;
-- who sent a message falls out of sender_id = thread_user_id.

alter table messages
  add column if not exists channel text not null default 'support';

do $$ begin
  alter table messages
    add constraint messages_channel_check check (channel in ('support', 'doctor'));
exception when duplicate_object then null;
end $$;

create index if not exists messages_thread_channel_idx
  on messages(thread_user_id, channel, created_at);

-- New intake status: pre-checkout answers are in, clinical visit not yet done.
do $$ begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'intake_status' and e.enumlabel = 'awaiting_visit'
  ) then
    alter type intake_status add value 'awaiting_visit';
  end if;
end $$;
