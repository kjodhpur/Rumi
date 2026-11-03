-- Phase 1.H: Deadline-Aware Nudges

create table if not exists public.nudge_rules (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools (id) on delete cascade,
  deadline_key  text not null check (deadline_key in ('roommate_deadline', 'selection_window', 'agreement_due')),
  offsets       integer[] not null default '{7, 2, 0}',
  channels      text[] not null default '{"in_app", "email"}',
  paused        boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (school_id, deadline_key)
);

create table if not exists public.nudge_sends (
  id           uuid primary key default gen_random_uuid(),
  rule_id      uuid not null references public.nudge_rules (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  offset_days  integer not null,
  sent_at      timestamptz not null default now(),
  unique (rule_id, user_id, offset_days)
);

create index if not exists nudge_rules_school_idx on public.nudge_rules (school_id);
create index if not exists nudge_sends_lookup_idx on public.nudge_sends (rule_id, user_id);

alter table public.nudge_rules enable row level security;
alter table public.nudge_sends enable row level security;

revoke all on public.nudge_rules from anon, authenticated;
revoke all on public.nudge_sends from anon, authenticated;

grant select, insert, update, delete on public.nudge_rules to authenticated;
grant select on public.nudge_sends to authenticated;

create policy "nudge_rules: housing_admin manage" on public.nudge_rules
  for all to authenticated using (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = nudge_rules.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  )
  with check (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = nudge_rules.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  );

create policy "nudge_rules: staff read" on public.nudge_rules
  for select to authenticated using (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = nudge_rules.school_id
        and sm.disabled_at is null
        and sm.role in ('housing_admin', 'housing_staff', 'analyst')
    )
  );
