-- Phase 5 core: move-in check-ins and risk. See docs/phase-5.md.

create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  school_id   text not null references public.schools (id),
  building    text not null check (char_length(building) between 1 and 80),
  room        text check (room is null or char_length(room) between 1 and 40),
  moved_in_at date not null,
  closed_at   timestamptz,
  created_at  timestamptz not null default now()
);

create unique index assignments_one_open_idx on public.assignments (user_id) where closed_at is null;
create index assignments_room_idx on public.assignments (school_id, building, room) where closed_at is null;

create table public.checkins (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  due_on        date not null,
  score         smallint check (score between 1 and 5),
  tags          text[] not null default '{}',
  note          text check (note is null or char_length(note) <= 1000),
  share_with_ra boolean not null default false,
  ask_ra        boolean not null default false,
  crisis        boolean not null default false,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (assignment_id, due_on)
);

create table public.risk_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  level         text not null check (level in ('low', 'medium', 'high')),
  reasons       text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create index risk_events_assignment_idx on public.risk_events (assignment_id, created_at desc);

alter table public.assignments enable row level security;
alter table public.checkins enable row level security;
alter table public.risk_events enable row level security;

revoke all on public.assignments, public.checkins, public.risk_events from anon, authenticated;
grant select on public.assignments, public.checkins, public.risk_events to authenticated;

create policy "assignments: read own" on public.assignments
  for select to authenticated using (user_id = auth.uid());
create policy "checkins: read own" on public.checkins
  for select to authenticated using (user_id = auth.uid());
create policy "risk_events: read own" on public.risk_events
  for select to authenticated using (user_id = auth.uid());

-- Staff see medium and high risk only when the student shared or asked for help.
-- The note is included only when they shared it. RA building scope still applies.
create or replace function public.ra_risk_list(p_school text)
returns table (
  user_id uuid,
  first_name text,
  building text,
  room text,
  level text,
  reasons text[],
  score integer,
  tags text[],
  note text,
  ask_ra boolean,
  submitted_at timestamptz
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
      c.assignment_id, c.score, c.tags, c.note, c.share_with_ra, c.ask_ra, c.submitted_at
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
    case when public.has_consent(o.user_id, 'checkins') or lc.ask_ra then p.first_name else 'Student' end,
    o.building,
    o.room,
    lr.level,
    lr.reasons,
    lc.score::integer,
    lc.tags,
    case when lc.share_with_ra then lc.note else null end,
    lc.ask_ra,
    lc.submitted_at
  from open o
  join latest_checkin lc on lc.assignment_id = o.id
  join latest_risk lr on lr.assignment_id = o.id
  join public.profiles p on p.id = o.user_id
  where lr.level in ('medium', 'high')
    and ((public.has_consent(o.user_id, 'checkins') and lc.share_with_ra) or lc.ask_ra)
  order by case lr.level when 'high' then 0 else 1 end, lc.submitted_at desc;
end;
$$;

revoke execute on function public.ra_risk_list(text) from public, anon;
grant execute on function public.ra_risk_list(text) to authenticated;
