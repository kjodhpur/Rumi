-- Phase 6 & Phase 9: Outcomes, Pilot Cohorts, Campus Plans, and Self-Serve Setup

alter table public.schools
  add column if not exists plan text not null default 'pilot' check (plan in ('pilot', 'standard', 'enterprise')),
  add column if not exists licensed_beds integer not null default 500,
  add column if not exists branding jsonb not null default '{}'::jsonb;

create table if not exists public.pilot_cohorts (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id) on delete cascade,
  term_id     uuid references public.terms (id) on delete set null,
  name        text not null check (char_length(name) between 1 and 80),
  arm         text not null check (arm in ('rumi', 'control')),
  rule        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists pilot_cohorts_school_idx on public.pilot_cohorts (school_id);

create table if not exists public.pilot_configs (
  school_id        text primary key references public.schools (id) on delete cascade,
  scope            jsonb not null default '{}'::jsonb,
  starts_on        date not null,
  ends_on          date not null,
  success_metrics  jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

-- Row Level Security
alter table public.pilot_cohorts enable row level security;
alter table public.pilot_configs enable row level security;

revoke all on public.pilot_cohorts from anon, authenticated;
revoke all on public.pilot_configs from anon, authenticated;

grant select on public.pilot_cohorts to authenticated;
grant insert, update, delete on public.pilot_cohorts to authenticated;

create policy "pilot_cohorts: staff read" on public.pilot_cohorts
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst']));

create policy "pilot_cohorts: housing_admin manage" on public.pilot_cohorts
  for all to authenticated using (public.has_role(school_id, array['housing_admin']))
  with check (public.has_role(school_id, array['housing_admin']));

grant select on public.pilot_configs to authenticated;
grant insert, update, delete on public.pilot_configs to authenticated;

create policy "pilot_configs: staff read" on public.pilot_configs
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst']));

create policy "pilot_configs: housing_admin manage" on public.pilot_configs
  for all to authenticated using (public.has_role(school_id, array['housing_admin']))
  with check (public.has_role(school_id, array['housing_admin']));
