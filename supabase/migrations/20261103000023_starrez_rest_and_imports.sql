-- Phase 2a import, 2b REST adapter, 2d questionnaire import, 3.3 link attribution.
-- See docs/phase-2-starrez.md.
-- Credentials are encrypted by the app (lib/crypto.ts) and readable by the service role only.
-- Import files go to the private `imports` bucket (no client access) and are deleted after
-- 30 days by the retention cron.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imports', 'imports', false, 10485760, array['text/csv', 'text/plain', 'application/vnd.ms-excel'])
on conflict (id) do update set public = false;

alter table public.integration_mappings drop constraint if exists integration_mappings_direction_check;
alter table public.integration_mappings add constraint integration_mappings_direction_check
  check (direction in ('export', 'import_assignments', 'import_questionnaire'));
alter table public.integration_mappings drop constraint if exists integration_mappings_mapping_check;
alter table public.integration_mappings add constraint integration_mappings_mapping_check
  check (jsonb_typeof(mapping) in ('array', 'object'));

create table public.integration_credentials (
  school_id        text not null references public.schools (id) on delete cascade,
  provider         text not null check (provider in ('starrez')),
  base_url         text not null check (base_url ~* '^https://'),
  credentials_enc  text not null,
  sync_enabled     boolean not null default false,
  last_sync_at     timestamptz,
  last_error       text check (last_error is null or char_length(last_error) <= 500),
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (school_id, provider)
);

create table public.integration_runs (
  id                uuid primary key default gen_random_uuid(),
  school_id         text not null references public.schools (id) on delete cascade,
  provider          text not null check (provider in ('starrez', 'csv')),
  action            text not null check (action in ('test', 'push_groups', 'pull_assignments', 'pull_room_changes', 'pull_questionnaire')),
  status            text not null check (status in ('running', 'success', 'partial_failure', 'failed')),
  records_processed integer not null default 0,
  calls             integer not null default 0,
  errors            jsonb not null default '[]'::jsonb,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  finished_at       timestamptz
);

create index integration_runs_school_idx on public.integration_runs (school_id, created_at desc);

create table public.import_jobs (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id) on delete cascade,
  provider    text not null default 'csv' check (provider in ('csv', 'starrez')),
  kind        text not null check (kind in ('assignments', 'questionnaire')),
  file_path   text,
  file_name   text check (file_name is null or char_length(file_name) <= 200),
  status      text not null check (status in ('dry_run', 'completed', 'failed', 'undone')),
  counts      jsonb not null default '{}'::jsonb,
  errors      jsonb not null default '[]'::jsonb,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  undone_at   timestamptz
);

create index import_jobs_school_idx on public.import_jobs (school_id, created_at desc);

alter table public.assignments add column if not exists import_job_id uuid references public.import_jobs (id) on delete set null;
-- One open assignment per external record, so a re-import updates instead of duplicating.
create unique index if not exists assignments_external_ref_idx
  on public.assignments (school_id, external_ref) where external_ref is not null and closed_at is null;

create table public.imported_answers (
  id                  uuid primary key default gen_random_uuid(),
  school_id           text not null references public.schools (id) on delete cascade,
  user_id             uuid references public.profiles (id) on delete cascade,
  -- Held for students not in Rumi yet (purged after 60 days); matched by email hash on sign-up.
  email_hash          text check (email_hash is null or email_hash ~ '^[0-9a-f]{64}$'),
  import_job_id       uuid references public.import_jobs (id) on delete cascade,
  source              text not null default 'starrez' check (source in ('starrez', 'csv')),
  question_code       text not null check (char_length(question_code) <= 80),
  raw_value           text not null check (char_length(raw_value) <= 200),
  mapped_factor       text not null check (mapped_factor in ('sleep_schedule', 'cleanliness', 'noise', 'guests', 'smoking', 'drinking', 'pets', 'study')),
  mapped_value        text not null check (char_length(mapped_value) <= 40),
  confirmed_at        timestamptz,
  dismissed_at        timestamptz,
  created_at          timestamptz not null default now(),
  check (user_id is not null or email_hash is not null),
  unique (school_id, user_id, mapped_factor)
);

create index imported_answers_user_idx on public.imported_answers (user_id) where confirmed_at is null;
create index imported_answers_hash_idx on public.imported_answers (school_id, email_hash) where user_id is null;

create table public.link_attributions (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id) on delete cascade,
  source      text not null check (source in ('starrez', 'canvas', 'asuapp', 'qr', 'email', 'direct')),
  user_id     uuid unique references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index link_attributions_school_source_idx on public.link_attributions (school_id, source);

alter table public.integration_credentials enable row level security;
alter table public.integration_runs enable row level security;
alter table public.import_jobs enable row level security;
alter table public.imported_answers enable row level security;
alter table public.link_attributions enable row level security;

revoke all on public.integration_credentials, public.integration_runs, public.import_jobs,
  public.imported_answers, public.link_attributions from anon, authenticated;

grant select on public.integration_runs, public.import_jobs to authenticated;
grant select on public.imported_answers to authenticated;

create policy "integration_runs: housing staff read" on public.integration_runs
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff']));
create policy "import_jobs: housing admins read" on public.import_jobs
  for select to authenticated using (public.has_role(school_id, array['housing_admin']));
create policy "imported_answers: student reads own" on public.imported_answers
  for select to authenticated using (user_id = auth.uid());

-- The student confirms (or dismisses) their imported answers; nothing is scored before that.
create or replace function public.resolve_imported_answers(p_confirm boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if p_confirm then
    update public.imported_answers set confirmed_at = now()
    where user_id = auth.uid() and confirmed_at is null and dismissed_at is null;
  else
    update public.imported_answers set dismissed_at = now()
    where user_id = auth.uid() and confirmed_at is null and dismissed_at is null;
  end if;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.resolve_imported_answers(boolean) from public, anon;
grant execute on function public.resolve_imported_answers(boolean) to authenticated;

-- Held answers attach to the student when they sign up with the matching email.
create or replace function public.attach_imported_answers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.imported_answers a set user_id = new.user_id, email_hash = null
  where a.user_id is null and a.email_hash = public.email_hash(new.email)
    and a.school_id = (select p.school_id from public.profiles p where p.id = new.user_id)
    and not exists (
      select 1 from public.imported_answers b
      where b.user_id = new.user_id and b.mapped_factor = a.mapped_factor
    );
  return new;
end;
$$;

create trigger attach_imported_answers after insert on public.user_settings
  for each row execute function public.attach_imported_answers();
