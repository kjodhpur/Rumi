-- Phase 1 Constraints: LLC, Major & Residential College Rules

alter table public.profiles
  add column if not exists academic_college text,
  add column if not exists residential_college text,
  add column if not exists llc text;

create table if not exists public.school_rules (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  rule_type   text not null check (rule_type in ('same_academic_college', 'same_residential_college', 'llc_exclusive', 'freshman_same_college')),
  params      jsonb not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (school_id, rule_type)
);

create index if not exists school_rules_school_idx on public.school_rules (school_id);

alter table public.school_rules enable row level security;
revoke all on public.school_rules from anon, authenticated;
grant select on public.school_rules to authenticated;
grant insert, update, delete on public.school_rules to authenticated;

create policy "school_rules: authenticated read" on public.school_rules
  for select to authenticated using (true);

create policy "school_rules: housing_admin manage" on public.school_rules
  for all to authenticated using (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = school_rules.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  )
  with check (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = school_rules.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  );
