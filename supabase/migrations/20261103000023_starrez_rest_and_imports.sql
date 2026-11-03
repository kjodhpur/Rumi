-- Phase 2 & 2b & 2d: StarRez REST adapter, questionnaire imports & link attributions

create table if not exists public.integration_credentials (
  school_id        text not null references public.schools (id) on delete cascade,
  provider         text not null check (provider in ('starrez', 'entrata', 'yardi')),
  base_url         text not null,
  credentials_enc  text not null,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (school_id, provider)
);

create table if not exists public.integration_runs (
  id                uuid primary key default gen_random_uuid(),
  school_id         text not null references public.schools (id) on delete cascade,
  provider          text not null check (provider in ('starrez', 'entrata', 'yardi', 'csv')),
  action            text not null,
  status            text not null check (status in ('running', 'success', 'partial_failure', 'failed')),
  records_processed integer not null default 0,
  errors            jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists integration_runs_school_idx on public.integration_runs (school_id, created_at desc);

create table if not exists public.imported_answers (
  id                  uuid primary key default gen_random_uuid(),
  school_id           text not null references public.schools (id) on delete cascade,
  user_id             uuid references public.profiles (id) on delete cascade,
  external_student_id text,
  source              text not null default 'starrez',
  question_code       text not null,
  raw_value           text not null,
  mapped_factor       text not null,
  mapped_value        text not null,
  confirmed_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists imported_answers_user_idx on public.imported_answers (user_id);
create index if not exists imported_answers_ext_idx on public.imported_answers (school_id, external_student_id);

create table if not exists public.link_attributions (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id) on delete cascade,
  source      text not null check (source in ('starrez', 'canvas', 'asuapp', 'direct', 'qr', 'email')),
  user_id     uuid references public.profiles (id) on delete set null,
  token       text,
  created_at  timestamptz not null default now()
);

create index if not exists link_attributions_school_source_idx on public.link_attributions (school_id, source);

-- Row Level Security
alter table public.integration_credentials enable row level security;
alter table public.integration_runs enable row level security;
alter table public.imported_answers enable row level security;
alter table public.link_attributions enable row level security;

revoke all on public.integration_credentials from anon, authenticated;
revoke all on public.integration_runs from anon, authenticated;
revoke all on public.imported_answers from anon, authenticated;
revoke all on public.link_attributions from anon, authenticated;

-- integration_credentials: only housing admins can select, insert, update
grant select, insert, update, delete on public.integration_credentials to authenticated;
create policy "integration_credentials: housing admins manage" on public.integration_credentials
  for all to authenticated using (public.has_role(school_id, array['housing_admin']))
  with check (public.has_role(school_id, array['housing_admin']));

-- integration_runs: housing staff, admin and platform admin can view
grant select on public.integration_runs to authenticated;
create policy "integration_runs: staff read" on public.integration_runs
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst']));

-- imported_answers: student can view and confirm own answers; staff can manage
grant select, update on public.imported_answers to authenticated;
create policy "imported_answers: student read own" on public.imported_answers
  for select to authenticated using (user_id = auth.uid() or public.has_role(school_id, array['housing_admin', 'housing_staff']));

create policy "imported_answers: student confirm own" on public.imported_answers
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- link_attributions: anon & authenticated can insert, staff can view aggregates
grant insert on public.link_attributions to anon, authenticated;
grant select on public.link_attributions to authenticated;
create policy "link_attributions: anyone can record" on public.link_attributions
  for insert to anon, authenticated with check (true);

create policy "link_attributions: staff read" on public.link_attributions
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst']));
