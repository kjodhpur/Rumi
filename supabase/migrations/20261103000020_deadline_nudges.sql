-- Phase 1.H: deadline-aware nudges. See docs/phase-1-h.md.
-- The cron reads terms.deadlines and these rules, and records each send so a student never
-- gets the same offset twice. Housing admins can change offsets and pause a rule.

create table public.nudge_rules (
  id            uuid primary key default gen_random_uuid(),
  school_id     text not null references public.schools (id) on delete cascade,
  deadline_key  text not null check (deadline_key in ('roommateRequest', 'selectionOpens', 'selectionCloses', 'agreementDue')),
  offsets       integer[] not null default '{7, 2, 0}' check (cardinality(offsets) between 1 and 5 and 0 <= all (offsets)),
  channels      text[] not null default '{in_app, email}' check (channels <@ array['in_app', 'email', 'sms', 'push']),
  paused        boolean not null default false,
  updated_by    uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (school_id, deadline_key)
);

create table public.nudge_sends (
  id           uuid primary key default gen_random_uuid(),
  rule_id      uuid not null references public.nudge_rules (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  -- The deadline date the send was for, so an edited deadline schedules fresh sends.
  deadline_on  date not null,
  offset_days  integer not null,
  channels     text[] not null default '{}',
  sent_at      timestamptz not null default now(),
  unique (rule_id, user_id, deadline_on, offset_days)
);

create index nudge_sends_user_idx on public.nudge_sends (user_id, sent_at desc);

alter table public.nudge_rules enable row level security;
alter table public.nudge_sends enable row level security;

revoke all on public.nudge_rules, public.nudge_sends from anon, authenticated;
grant select on public.nudge_rules to authenticated;

create policy "nudge_rules: staff read" on public.nudge_rules
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst']));
