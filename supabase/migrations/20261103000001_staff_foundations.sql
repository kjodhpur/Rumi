-- Phase 0: staff roles, consent, audit log, retention, and the demo-profile switch.
-- See docs/phase-0.md. Platform admins remain the `admins` table.

-- ─────────────────────────────────────────────────────────────────────────────
-- Schools & profiles
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.schools
  add column hide_seed_profiles  boolean not null default false,
  -- A fictional school for demonstrations (Demo University). Staff screens show a "Demo data" banner.
  add column is_demo             boolean not null default false,
  -- Named in consent prompts. Null until a housing office actually partners with Rumi,
  -- so students are never told their data can go to an office that isn't involved.
  add column housing_office_name text check (char_length(housing_office_name) <= 80);

alter table public.profiles
  add column is_staff             boolean not null default false,
  add column inactivity_warned_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- Staff
-- ─────────────────────────────────────────────────────────────────────────────

create table public.staff_members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  school_id   text not null references public.schools (id) on delete cascade,
  role        text not null check (role in ('housing_admin', 'housing_staff', 'ra', 'analyst', 'moderator')),
  scopes      jsonb not null default '{}'::jsonb check (jsonb_typeof(scopes) = 'object'),
  invited_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  disabled_at timestamptz,
  unique (user_id, school_id)
);

create index staff_members_school_idx on public.staff_members (school_id) where disabled_at is null;

create table public.staff_invites (
  id                  uuid primary key default gen_random_uuid(),
  school_id           text not null references public.schools (id) on delete cascade,
  email               text not null check (email = lower(email) and char_length(email) <= 254),
  role                text not null check (role in ('housing_admin', 'housing_staff', 'ra', 'analyst', 'moderator')),
  scopes              jsonb not null default '{}'::jsonb check (jsonb_typeof(scopes) = 'object'),
  token_hash          text not null unique,
  expires_at          timestamptz not null,
  created_by          uuid references public.profiles (id) on delete set null,
  created_by_platform boolean not null default false,
  created_at          timestamptz not null default now(),
  accepted_at         timestamptz,
  accepted_by         uuid references public.profiles (id) on delete set null,
  revoked_at          timestamptz
);

create unique index staff_invites_one_pending_idx on public.staff_invites (school_id, email)
  where accepted_at is null and revoked_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Consent
-- ─────────────────────────────────────────────────────────────────────────────

create table public.consents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  school_id  text not null references public.schools (id) on delete cascade,
  kind       text not null check (kind in (
               'share_with_housing', 'checkins', 'research_outcomes', 'sms', 'calendar', 'social_verification'
             )),
  version    text not null check (char_length(version) <= 32),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index consents_one_active_idx on public.consents (user_id, kind) where revoked_at is null;
create index consents_school_kind_idx on public.consents (school_id, kind) where revoked_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit log (append-only) & retention
-- ─────────────────────────────────────────────────────────────────────────────

create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,
  school_id  text references public.schools (id) on delete cascade,
  action     text not null check (char_length(action) <= 64),
  entity     text not null check (char_length(entity) <= 64),
  entity_id  text check (char_length(entity_id) <= 128),
  meta       jsonb not null default '{}'::jsonb,
  ip         text check (char_length(ip) <= 64),
  created_at timestamptz not null default now()
);

create index audit_log_school_idx on public.audit_log (school_id, created_at desc);

create table public.retention_policies (
  school_id  text not null references public.schools (id) on delete cascade,
  entity     text not null check (entity in (
               'orphaned_messages', 'inactive_accounts', 'inactive_warning', 'audit_log', 'checkin_notes'
             )),
  days       integer not null check (days between 1 and 3650),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (school_id, entity)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────

/** Platform admins pass every role check; otherwise an enabled staff row with one of the roles. */
create or replace function public.has_role(p_school text, p_roles text[], p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_uid is not null and (
    public.is_admin(p_uid)
    or exists (
      select 1
      from public.staff_members sm
      join public.profiles p on p.id = sm.user_id
      where sm.user_id = p_uid
        and sm.school_id = p_school
        and sm.disabled_at is null
        and sm.role = any (p_roles)
        and p.banned_at is null
    )
  );
$$;

/** Every role but RA sees all buildings; an RA sees only the buildings in their scope. */
create or replace function public.staff_scope_includes(p_school text, p_building text, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_uid is not null and (
    public.is_admin(p_uid)
    or exists (
      select 1
      from public.staff_members sm
      where sm.user_id = p_uid
        and sm.school_id = p_school
        and sm.disabled_at is null
        and (
          sm.role <> 'ra'
          or coalesce(sm.scopes -> 'buildings', '[]'::jsonb) ? p_building
        )
    )
  );
$$;

create or replace function public.has_consent(p_uid uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.consents c
    where c.user_id = p_uid and c.kind = p_kind and c.revoked_at is null
  );
$$;

/** The only way a student grants or revokes a consent. Returns the new state. */
create or replace function public.set_consent(p_kind text, p_granted boolean, p_version text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_school text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select school_id into v_school from public.profiles where id = v_uid and not is_staff;
  if v_school is null then
    raise exception 'not_allowed';
  end if;

  if p_granted then
    if not public.has_consent(v_uid, p_kind) then
      insert into public.consents (user_id, school_id, kind, version) values (v_uid, v_school, p_kind, p_version);
    end if;
  else
    update public.consents set revoked_at = now()
    where user_id = v_uid and kind = p_kind and revoked_at is null;
  end if;
  return p_granted;
end;
$$;

/** Retention is the only thing allowed to delete audit rows. A null school purges platform-level rows. */
create or replace function public.purge_audit_log(p_school text, p_before timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.audit_log where created_at < p_before and school_id is not distinct from p_school;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Students may not see staff, staff may not browse students, and a school can hide seed profiles.
create or replace function public.can_view_profile(viewer uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    viewer is not null and (
      viewer = target
      or public.is_admin(viewer)
      or exists (
        select 1
        from public.profiles t
        join public.profiles v on v.id = viewer
        join public.schools s on s.id = t.school_id
        where t.id = target
          and t.onboarding_completed_at is not null
          and t.banned_at is null
          and v.banned_at is null
          and not t.is_staff
          and not v.is_staff
          and not (t.is_seed and s.hide_seed_profiles)
          and t.school_id = v.school_id
          and (not t.is_hidden or public.shares_conversation(viewer, target))
          and (not t.verified_only or v.student_verified_at > now() - interval '365 days')
          and not public.is_blocked(viewer, target)
      )
    );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.staff_members      enable row level security;
alter table public.staff_invites      enable row level security;
alter table public.consents           enable row level security;
alter table public.audit_log          enable row level security;
alter table public.retention_policies enable row level security;

revoke all on public.staff_members, public.staff_invites, public.consents, public.audit_log, public.retention_policies
  from anon, authenticated;
grant select on public.staff_members, public.staff_invites, public.consents, public.audit_log, public.retention_policies
  to authenticated;

-- Append-only: not even the service role may rewrite history (purge_audit_log runs as owner).
revoke update, delete, truncate on public.audit_log from service_role;

create policy "staff_members: self or school leads read" on public.staff_members
  for select to authenticated using (
    user_id = auth.uid() or public.has_role(school_id, array['housing_admin', 'housing_staff'])
  );

create policy "staff_invites: housing admins read" on public.staff_invites
  for select to authenticated using (public.has_role(school_id, array['housing_admin']));

create policy "consents: owner reads" on public.consents
  for select to authenticated using (user_id = auth.uid());

create policy "audit_log: housing admins read" on public.audit_log
  for select to authenticated using (school_id is not null and public.has_role(school_id, array['housing_admin']));

create policy "retention_policies: housing admins read" on public.retention_policies
  for select to authenticated using (public.has_role(school_id, array['housing_admin']));

-- New system columns stay out of the student-writable column grant on profiles.

revoke execute on function
  public.has_role(text, text[], uuid),
  public.staff_scope_includes(text, text, uuid),
  public.has_consent(uuid, text),
  public.set_consent(text, boolean, text),
  public.purge_audit_log(text, timestamptz)
from public, anon;

grant execute on function
  public.has_role(text, text[], uuid),
  public.staff_scope_includes(text, text, uuid),
  public.set_consent(text, boolean, text)
to authenticated;

grant execute on function public.has_consent(uuid, text) to service_role;
grant execute on function public.purge_audit_log(text, timestamptz) to service_role;
