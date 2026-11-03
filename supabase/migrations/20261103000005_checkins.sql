-- Phase 5 core: assignments, pulse check-ins, transparent risk, RA cases and room-change
-- requests. See docs/phase-5.md.
-- Students own their check-ins. Staff see a student only when that student turned on the
-- checkins consent and chose "share with my RA", or pressed "ask my RA". RAs see only the
-- buildings in their scope. Check-in notes are encrypted by the app (lib/crypto.ts) and
-- are never readable in SQL.

create table public.assignments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  school_id     text not null references public.schools (id) on delete cascade,
  term_id       uuid references public.terms (id) on delete set null,
  building      text not null check (char_length(building) between 1 and 80),
  room          text check (room is null or char_length(room) between 1 and 40),
  bed           text check (bed is null or char_length(bed) between 1 and 20),
  source        text not null default 'self_report' check (source in ('self_report', 'import', 'rest')),
  external_ref  text check (external_ref is null or char_length(external_ref) <= 120),
  moved_in_at   date not null,
  closed_at     timestamptz,
  created_at    timestamptz not null default now()
);

create unique index assignments_one_open_idx on public.assignments (user_id) where closed_at is null;
create index assignments_room_idx on public.assignments (school_id, building, room) where closed_at is null;

-- When check-ins fall due, in days after move-in. After the last offset they repeat monthly.
create table public.checkin_schedules (
  school_id      text primary key references public.schools (id) on delete cascade,
  offsets_days   integer[] not null default '{14, 28, 56}'
                 check (cardinality(offsets_days) between 1 and 8 and 0 < all (offsets_days)),
  monthly_after  boolean not null default true,
  updated_at     timestamptz not null default now()
);

create table public.checkins (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  term_id       uuid references public.terms (id) on delete set null,
  due_on        date not null,
  score         smallint check (score between 1 and 5),
  tags          text[] not null default '{}' check (cardinality(tags) <= 2),
  note_enc      text check (note_enc is null or char_length(note_enc) <= 4000),
  share_with_ra boolean not null default false,
  ask_ra        boolean not null default false,
  crisis        boolean not null default false,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (assignment_id, due_on)
);

create index checkins_user_idx on public.checkins (user_id, submitted_at desc);

create table public.risk_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  level         text not null check (level in ('low', 'medium', 'high')),
  reasons       text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create index risk_events_assignment_idx on public.risk_events (assignment_id, created_at desc);

-- One case per room situation an RA is working on, with its outcome.
create table public.ra_cases (
  id            uuid primary key default gen_random_uuid(),
  school_id     text not null references public.schools (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  building      text not null,
  status        text not null default 'open' check (status in ('open', 'resolved', 'room_change', 'escalated')),
  opened_by     uuid references public.profiles (id) on delete set null,
  closed_by     uuid references public.profiles (id) on delete set null,
  closed_at     timestamptz,
  created_at    timestamptz not null default now()
);

create unique index ra_cases_one_open_idx on public.ra_cases (assignment_id) where status = 'open';
create index ra_cases_school_idx on public.ra_cases (school_id, building, status);

create table public.ra_case_notes (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.ra_cases (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.ra_tasks (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.ra_cases (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 160),
  due_on     date,
  done_at    timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- School-editable reasons for room changes (Phase 1.B).
create table public.room_change_reasons (
  school_id  text not null references public.schools (id) on delete cascade,
  key        text not null check (key ~ '^[a-z_]{2,30}$'),
  label      text not null check (char_length(label) between 2 and 60),
  active     boolean not null default true,
  position   integer not null default 0,
  primary key (school_id, key)
);

create table public.room_change_requests (
  id                         uuid primary key default gen_random_uuid(),
  school_id                  text not null references public.schools (id) on delete cascade,
  user_id                    uuid references public.profiles (id) on delete set null,
  assignment_id              uuid references public.assignments (id) on delete set null,
  term_id                    uuid references public.terms (id) on delete set null,
  building                   text check (building is null or char_length(building) <= 80),
  reason_keys                text[] not null default '{}' check (cardinality(reason_keys) <= 3),
  student_note               text check (student_note is null or char_length(student_note) <= 500),
  staff_note                 text check (staff_note is null or char_length(staff_note) <= 1000),
  match_score_at_assignment  integer check (match_score_at_assignment between 0 and 100),
  agreement_signed           boolean,
  source                     text not null default 'in_app' check (source in ('in_app', 'import', 'staff')),
  external_ref               text,
  status                     text not null default 'open' check (status in ('open', 'moved', 'withdrawn', 'closed')),
  tagged_by                  uuid references public.profiles (id) on delete set null,
  tagged_at                  timestamptz,
  created_at                 timestamptz not null default now(),
  closed_at                  timestamptz
);

create unique index room_change_requests_one_open_idx
  on public.room_change_requests (user_id) where status = 'open' and user_id is not null;
create index room_change_requests_school_idx on public.room_change_requests (school_id, created_at desc);

-- RLS
alter table public.assignments enable row level security;
alter table public.checkin_schedules enable row level security;
alter table public.checkins enable row level security;
alter table public.risk_events enable row level security;
alter table public.ra_cases enable row level security;
alter table public.ra_case_notes enable row level security;
alter table public.ra_tasks enable row level security;
alter table public.room_change_reasons enable row level security;
alter table public.room_change_requests enable row level security;

revoke all on public.assignments, public.checkin_schedules, public.checkins, public.risk_events,
  public.ra_cases, public.ra_case_notes, public.ra_tasks, public.room_change_reasons,
  public.room_change_requests from anon, authenticated;

-- Students read their own rows. Writes happen on the server after validation.
grant select on public.assignments, public.checkins, public.risk_events,
  public.room_change_requests, public.room_change_reasons, public.checkin_schedules to authenticated;
grant select on public.ra_cases, public.ra_case_notes, public.ra_tasks to authenticated;

create policy "assignments: read own" on public.assignments
  for select to authenticated using (user_id = auth.uid());
create policy "checkins: read own" on public.checkins
  for select to authenticated using (user_id = auth.uid());
create policy "risk_events: read own" on public.risk_events
  for select to authenticated using (user_id = auth.uid());
create policy "room_change_requests: read own" on public.room_change_requests
  for select to authenticated using (user_id = auth.uid());

create policy "room_change_reasons: school reads" on public.room_change_reasons
  for select to authenticated using (
    school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
    or public.has_role(school_id, array['housing_admin', 'housing_staff', 'ra', 'analyst'])
  );
create policy "checkin_schedules: staff reads" on public.checkin_schedules
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'ra']));

-- Cases exist only for students who shared with their RA or asked for help, and disappear
-- from staff views when the student turns check-in sharing off (unless they asked for help).
create or replace function public.ra_case_visible(p_case uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ra_cases c
    where c.id = p_case
      and public.has_role(c.school_id, array['housing_admin', 'housing_staff', 'ra'])
      and public.staff_scope_includes(c.school_id, c.building)
      and (
        public.has_consent(c.user_id, 'checkins')
        or exists (select 1 from public.checkins k where k.assignment_id = c.assignment_id and k.ask_ra)
      )
  );
$$;

revoke execute on function public.ra_case_visible(uuid) from public, anon;
grant execute on function public.ra_case_visible(uuid) to authenticated;

create policy "ra_cases: staff in scope" on public.ra_cases
  for select to authenticated using (public.ra_case_visible(id));
create policy "ra_case_notes: staff in scope" on public.ra_case_notes
  for select to authenticated using (public.ra_case_visible(case_id));
create policy "ra_tasks: staff in scope" on public.ra_tasks
  for select to authenticated using (public.ra_case_visible(case_id));

-- Whether a student is visible to staff for a check-in right now.
create or replace function public.checkin_visible_to_staff(p_user uuid, p_share boolean, p_ask boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_ask or (p_share and public.has_consent(p_user, 'checkins'));
$$;

revoke execute on function public.checkin_visible_to_staff(uuid, boolean, boolean) from public, anon, authenticated;

-- The RA risk list: medium and high risk, consented or asked, in the caller's scope.
-- The encrypted note is returned only when the student shared it; the server decrypts it.
create or replace function public.ra_risk_list(p_school text)
returns table (
  user_id uuid,
  assignment_id uuid,
  first_name text,
  last_initial text,
  building text,
  room text,
  level text,
  reasons text[],
  score integer,
  tags text[],
  note_enc text,
  ask_ra boolean,
  submitted_at timestamptz,
  case_id uuid,
  case_status text,
  group_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff', 'ra']) then
    raise exception 'not_allowed';
  end if;
  return query
  with open as (
    select a.id, a.user_id, a.building, a.room
    from public.assignments a
    where a.school_id = p_school
      and a.closed_at is null
      and public.staff_scope_includes(p_school, a.building)
  ),
  latest_checkin as (
    select distinct on (c.assignment_id)
      c.assignment_id, c.score, c.tags, c.note_enc, c.share_with_ra, c.ask_ra, c.submitted_at
    from public.checkins c
    where c.submitted_at is not null and c.score is not null
    order by c.assignment_id, c.submitted_at desc
  ),
  latest_risk as (
    select distinct on (r.assignment_id) r.assignment_id, r.level, r.reasons
    from public.risk_events r
    order by r.assignment_id, r.created_at desc
  )
  select
    o.user_id,
    o.id,
    p.first_name,
    p.last_initial,
    o.building,
    o.room,
    lr.level,
    lr.reasons,
    lc.score::integer,
    lc.tags,
    case when lc.share_with_ra or lc.ask_ra then lc.note_enc else null end,
    lc.ask_ra,
    lc.submitted_at,
    rc.id,
    rc.status,
    (select gm.group_id from public.group_members gm where gm.user_id = o.user_id order by gm.joined_at desc limit 1)
  from open o
  join latest_checkin lc on lc.assignment_id = o.id
  join latest_risk lr on lr.assignment_id = o.id
  join public.profiles p on p.id = o.user_id
  left join lateral (
    select c.id, c.status from public.ra_cases c
    where c.assignment_id = o.id
    order by (c.status = 'open') desc, c.created_at desc
    limit 1
  ) rc on true
  where (lr.level in ('medium', 'high') or rc.status = 'open')
    and public.checkin_visible_to_staff(o.user_id, lc.share_with_ra, lc.ask_ra)
  order by case lr.level when 'high' then 0 when 'medium' then 1 else 2 end, lc.submitted_at desc;
end;
$$;

revoke execute on function public.ra_risk_list(text) from public, anon;
grant execute on function public.ra_risk_list(text) to authenticated;

-- Default room-change reasons for every school (editable per school).
insert into public.room_change_reasons (school_id, key, label, position)
select s.id, r.key, r.label, r.position
from public.schools s
cross join (values
  ('noise', 'Noise', 0), ('guests', 'Guests', 1), ('cleanliness', 'Cleanliness', 2),
  ('schedule', 'Schedule', 3), ('communication', 'Communication', 4), ('safety', 'Safety', 5),
  ('accommodation', 'Accommodation', 6), ('cost', 'Cost', 7), ('other', 'Other', 8)
) as r (key, label, position)
on conflict do nothing;
