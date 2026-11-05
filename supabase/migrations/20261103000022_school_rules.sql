-- Phase 1 constraints: academic college, residential college / LLC and campus.
-- See docs/phase-1-constraints.md.
-- Values come only from school-defined option lists (never inferred), so rules and segment
-- analytics compare exact values. Rules are extra hard filters in the matching engine.

create table public.school_options (
  school_id  text not null references public.schools (id) on delete cascade,
  kind       text not null check (kind in ('academic_college', 'residential_college', 'llc', 'campus')),
  value      text not null check (value ~ '^[a-z0-9_]{2,40}$'),
  label      text not null check (char_length(label) between 2 and 80),
  position   integer not null default 0,
  active     boolean not null default true,
  primary key (school_id, kind, value)
);

alter table public.profiles
  add column if not exists academic_college text,
  add column if not exists residential_college text,
  add column if not exists llc text,
  add column if not exists campus text,
  -- Optional, shown only to staff in aggregate (segment analytics).
  add column if not exists gender_inclusive boolean;

grant update (academic_college, residential_college, llc, campus, gender_inclusive) on public.profiles to authenticated;

-- A profile value must be one of the school's active options.
create or replace function public.profiles_check_options()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.academic_college is not null and not exists (
    select 1 from public.school_options o where o.school_id = new.school_id and o.kind = 'academic_college' and o.value = new.academic_college
  ) then raise exception 'invalid_option' using detail = 'academic_college'; end if;
  if new.residential_college is not null and not exists (
    select 1 from public.school_options o where o.school_id = new.school_id and o.kind = 'residential_college' and o.value = new.residential_college
  ) then raise exception 'invalid_option' using detail = 'residential_college'; end if;
  if new.llc is not null and not exists (
    select 1 from public.school_options o where o.school_id = new.school_id and o.kind = 'llc' and o.value = new.llc
  ) then raise exception 'invalid_option' using detail = 'llc'; end if;
  if new.campus is not null and not exists (
    select 1 from public.school_options o where o.school_id = new.school_id and o.kind = 'campus' and o.value = new.campus
  ) then raise exception 'invalid_option' using detail = 'campus'; end if;
  return new;
end;
$$;

create trigger profiles_check_options
  before insert or update of academic_college, residential_college, llc, campus on public.profiles
  for each row execute function public.profiles_check_options();

create table public.school_rules (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id) on delete cascade,
  rule_type   text not null check (rule_type in ('same_academic_college', 'same_residential_college', 'llc_exclusive', 'freshman_same_college')),
  params      jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  active      boolean not null default true,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  unique (school_id, rule_type)
);

alter table public.school_options enable row level security;
alter table public.school_rules enable row level security;
revoke all on public.school_options, public.school_rules from anon, authenticated;
grant select on public.school_options, public.school_rules to authenticated;
grant select on public.school_options to anon;

-- Two policies, not one: has_role isn't executable by anon, and Postgres checks that even when
-- `active` alone would decide the row.
create policy "school_options: anyone reads active" on public.school_options
  for select to anon, authenticated using (active);
create policy "school_options: admins read retired" on public.school_options
  for select to authenticated using (public.has_role(school_id, array['housing_admin']));
create policy "school_rules: school reads" on public.school_rules
  for select to authenticated using (
    school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
    or public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst'])
  );

-- ASU's campuses and colleges are public facts; listing them claims no affiliation.
insert into public.school_options (school_id, kind, value, label, position)
select 'asu', o.kind, o.value, o.label, o.position
from (values
  ('campus', 'tempe', 'Tempe', 0),
  ('campus', 'downtown_phoenix', 'Downtown Phoenix', 1),
  ('campus', 'polytechnic', 'Polytechnic', 2),
  ('campus', 'west_valley', 'West Valley', 3),
  ('academic_college', 'business', 'Business', 0),
  ('academic_college', 'engineering', 'Engineering', 1),
  ('academic_college', 'liberal_arts_sciences', 'Liberal Arts and Sciences', 2),
  ('academic_college', 'arts_design', 'Design and the Arts', 3),
  ('academic_college', 'health', 'Health and Nursing', 4),
  ('academic_college', 'journalism', 'Journalism and Communication', 5),
  ('academic_college', 'education', 'Education', 6),
  ('academic_college', 'public_service', 'Public Service and Community Solutions', 7),
  ('academic_college', 'sustainability', 'Sustainability', 8),
  ('academic_college', 'global_futures', 'Global Futures', 9),
  ('academic_college', 'integrative_sciences', 'Integrative Sciences and Arts', 10),
  ('academic_college', 'law', 'Law', 11),
  ('residential_college', 'honors', 'Honors college', 0)
) as o (kind, value, label, position)
where exists (select 1 from public.schools s where s.id = 'asu')
on conflict do nothing;
