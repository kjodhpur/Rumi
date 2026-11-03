-- Phase 3.1 & 3.2: pre-arrival mode for admitted students, and student tracks.
-- See docs/phase-3-tracks-and-prearrival.md.
-- Admitted students sign up with a personal email only if staff uploaded its hash to the
-- school's admit list. They match only inside the pre-arrival + incoming pool until their
-- first school sign-in links the account and clears pre_arrival.

alter table public.schools
  add column if not exists pre_arrival_enabled boolean not null default false,
  -- Tracks are separate pools by default; a school can merge them.
  add column if not exists merge_track_pools boolean not null default false;

alter table public.profiles
  add column if not exists pre_arrival boolean not null default false,
  add column if not exists track text check (track in ('freshman', 'returning', 'transfer', 'grad')),
  -- Set when staff imported the track; the student can't change it then.
  add column if not exists track_locked boolean not null default false,
  add column if not exists admit_term_id uuid references public.terms (id) on delete set null;

grant update (track) on public.profiles to authenticated;

create or replace function public.profiles_track_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.track_locked and new.track is distinct from old.track
     and current_user = 'authenticated' then
    raise exception 'track_locked';
  end if;
  return new;
end;
$$;

create trigger profiles_track_lock before update of track on public.profiles
  for each row execute function public.profiles_track_lock();

-- Admit list: sha256 of the normalised personal email, per school and admit term.
create table public.admit_allowlist (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id) on delete cascade,
  email_hash  text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  term_id     uuid references public.terms (id) on delete set null,
  used_at     timestamptz,
  used_by     uuid references public.profiles (id) on delete set null,
  withdrawn_at timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (school_id, email_hash)
);

alter table public.admit_allowlist enable row level security;
revoke all on public.admit_allowlist from anon, authenticated;
grant select on public.admit_allowlist to authenticated;

create policy "admit_allowlist: housing staff read" on public.admit_allowlist
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff']));

-- Per-track labels, optional question set and timeline (deadlines) per school.
create table public.tracks (
  id              uuid primary key default gen_random_uuid(),
  school_id       text not null references public.schools (id) on delete cascade,
  key             text not null check (key in ('freshman', 'returning', 'transfer', 'grad')),
  label           text not null check (char_length(label) between 2 and 40),
  -- school_questions keys shown only to this track
  question_keys   text[] not null default '{}',
  timeline        jsonb not null default '{}'::jsonb check (jsonb_typeof(timeline) = 'object'),
  created_at      timestamptz not null default now(),
  unique (school_id, key)
);

alter table public.tracks enable row level security;
revoke all on public.tracks from anon, authenticated;
grant select, insert, update on public.tracks to authenticated;

create policy "tracks: school reads" on public.tracks
  for select to authenticated using (
    school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
    or public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst'])
  );
create policy "tracks: housing admins add" on public.tracks
  for insert to authenticated with check (public.has_role(school_id, array['housing_admin']));
create policy "tracks: housing admins edit" on public.tracks
  for update to authenticated
  using (public.has_role(school_id, array['housing_admin']))
  with check (public.has_role(school_id, array['housing_admin']));

insert into public.tracks (school_id, key, label)
select s.id, t.key, t.label
from public.schools s
cross join (values ('freshman', 'First-year'), ('returning', 'Returning'), ('transfer', 'Transfer'), ('grad', 'Graduate')) as t (key, label)
on conflict do nothing;

-- The auth trigger lets a non-school email through only when it is on an enabled school's
-- admit list. Returns that school, or null.
create or replace function public.admit_school_for(p_email_hash text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select a.school_id
  from public.admit_allowlist a
  join public.schools s on s.id = a.school_id
  where a.email_hash = p_email_hash
    and s.pre_arrival_enabled
    and a.withdrawn_at is null
  order by a.created_at
  limit 1;
$$;

revoke execute on function public.admit_school_for(text) from public, anon, authenticated;

create or replace function public.email_hash(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(pg_catalog.sha256(convert_to(lower(btrim(p_email)), 'UTF8')), 'hex');
$$;

-- Sign-up: a school email as before, or a personal email on an enabled admit list.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school text;
  v_admit public.admit_allowlist%rowtype;
begin
  v_school := public.school_for_email(new.email);
  if v_school is null then
    select a.* into v_admit
    from public.admit_allowlist a
    join public.schools s on s.id = a.school_id
    where a.email_hash = public.email_hash(new.email)
      and s.active
      and s.pre_arrival_enabled
      and a.withdrawn_at is null
    order by a.created_at
    limit 1;
    if v_admit.id is null then
      raise exception 'school_email_required'
        using hint = 'Sign up with your school email address.', errcode = 'P0001';
    end if;
    insert into public.profiles (id, school_id, student_verified_at, pre_arrival, admit_term_id, track)
    values (new.id, v_admit.school_id, case when new.email_confirmed_at is not null then now() end,
            true, v_admit.term_id, 'freshman');
    update public.admit_allowlist set used_at = now(), used_by = new.id where id = v_admit.id;
  else
    insert into public.profiles (id, school_id, student_verified_at)
    values (new.id, v_school, case when new.email_confirmed_at is not null then now() end);
  end if;

  insert into public.user_settings (user_id, email) values (new.id, lower(new.email));
  insert into public.preferences (user_id) values (new.id);
  return new;
end;
$$;

-- Linking: a pre-arrival student confirms their school email on the same account
-- (Supabase email change). Matches, chats and groups stay; pre_arrival clears.
create or replace function public.handle_user_email_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school text;
begin
  if new.email is distinct from old.email then
    v_school := public.school_for_email(new.email);
    update public.user_settings set email = lower(new.email) where user_id = new.id;
    if v_school is not null then
      update public.profiles
      set pre_arrival = false, student_verified_at = now()
      where id = new.id and school_id = v_school and pre_arrival;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_changed();

-- Staff withdraw an admit: the profile is hidden from matching at once.
create or replace function public.admit_withdrawn()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.withdrawn_at is not null and old.withdrawn_at is null and new.used_by is not null then
    update public.profiles set is_hidden = true where id = new.used_by and pre_arrival;
  end if;
  return new;
end;
$$;

create trigger admit_withdrawn after update of withdrawn_at on public.admit_allowlist
  for each row execute function public.admit_withdrawn();
