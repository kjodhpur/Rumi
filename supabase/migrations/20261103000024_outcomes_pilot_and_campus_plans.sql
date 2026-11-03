-- Phase 3 SSO settings, Phase 6 pilot cohorts, Phase 9 plan, branding and pilot scope.
-- See docs/phase-6-outcomes-and-pilot.md and docs/sso-asu.md.
-- No billing: plan and bed count are display-only and set by the Rumi team.

alter table public.schools
  add column if not exists plan text not null default 'pilot' check (plan in ('pilot', 'standard')),
  add column if not exists licensed_beds integer check (licensed_beds is null or licensed_beds between 1 and 200000),
  -- { "logo_path": "...", "display_name": "...", "secondary_accent": "#rrggbb" } — applied only
  -- to staff screens and the school landing page; the student app keeps Rumi's chrome.
  add column if not exists branding jsonb not null default '{}'::jsonb check (jsonb_typeof(branding) = 'object'),
  add column if not exists sso_provider text check (sso_provider is null or sso_provider in ('saml', 'oidc')),
  add column if not exists sso_domain text check (sso_domain is null or sso_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  -- Supabase SSO provider id once ASU IT has configured it (docs/sso-asu.md).
  add column if not exists sso_provider_id text,
  add column if not exists otp_enabled boolean not null default true;

create table public.pilot_cohorts (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id) on delete cascade,
  term_id     uuid references public.terms (id) on delete set null,
  name        text not null check (char_length(name) between 1 and 80),
  arm         text not null check (arm in ('rumi', 'control')),
  -- { "residential_colleges": [...], "buildings": [...] } — who belongs to the arm
  rule        jsonb not null default '{}'::jsonb check (jsonb_typeof(rule) = 'object'),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index pilot_cohorts_school_idx on public.pilot_cohorts (school_id);

create table public.pilot_configs (
  school_id        text primary key references public.schools (id) on delete cascade,
  -- { "residential_colleges": [...] } — limits the student pool and the dashboards
  scope            jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  starts_on        date not null,
  ends_on          date not null,
  success_metrics  jsonb not null default '{}'::jsonb check (jsonb_typeof(success_metrics) = 'object'),
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  check (ends_on > starts_on)
);

alter table public.pilot_cohorts enable row level security;
alter table public.pilot_configs enable row level security;

revoke all on public.pilot_cohorts, public.pilot_configs from anon, authenticated;
grant select on public.pilot_cohorts, public.pilot_configs to authenticated;

create policy "pilot_cohorts: staff read" on public.pilot_cohorts
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst']));
create policy "pilot_configs: staff read" on public.pilot_configs
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst']));
