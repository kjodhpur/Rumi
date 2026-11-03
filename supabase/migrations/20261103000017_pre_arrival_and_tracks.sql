-- Phase 3.1 & 3.2: Incoming-Student Pre-Arrival Mode + Transfer & Grad Tracks

-- 1. Alter schools and profiles
alter table public.schools
  add column if not exists pre_arrival_enabled boolean not null default false;

alter table public.profiles
  add column if not exists pre_arrival boolean not null default false,
  add column if not exists track text check (track in ('freshman', 'returning', 'transfer', 'grad'));

-- 2. Admit allowlist for pre-arrival incoming students
create table if not exists public.admit_allowlist (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  email_hash  text not null,
  term_id     uuid references public.terms (id) on delete set null,
  used_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (school_id, email_hash)
);

create index if not exists admit_allowlist_lookup_idx
  on public.admit_allowlist (school_id, email_hash);

alter table public.admit_allowlist enable row level security;
revoke all on public.admit_allowlist from anon, authenticated;
grant select, insert, update, delete on public.admit_allowlist to authenticated;

-- Staff manage allowlist for their school
create policy "admit_allowlist: staff manage own school" on public.admit_allowlist
  for all to authenticated using (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = admit_allowlist.school_id
        and sm.disabled_at is null
        and sm.role in ('housing_admin', 'housing_staff')
    )
  )
  with check (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = admit_allowlist.school_id
        and sm.disabled_at is null
        and sm.role in ('housing_admin', 'housing_staff')
    )
  );

-- 3. Tracks for school cohorts (freshman, returning, transfer, grad)
create table if not exists public.tracks (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools (id) on delete cascade,
  key             text not null check (key in ('freshman', 'returning', 'transfer', 'grad')),
  label           text not null,
  question_set_id uuid,
  timeline        jsonb,
  created_at      timestamptz not null default now(),
  unique (school_id, key)
);

create index if not exists tracks_school_idx on public.tracks (school_id);

alter table public.tracks enable row level security;
revoke all on public.tracks from anon, authenticated;
grant select on public.tracks to authenticated;
grant insert, update, delete on public.tracks to authenticated;

create policy "tracks: authenticated read" on public.tracks
  for select to authenticated using (true);

create policy "tracks: housing_admin manage" on public.tracks
  for all to authenticated using (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = tracks.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  )
  with check (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = tracks.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  );
