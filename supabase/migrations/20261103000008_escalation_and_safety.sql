-- Phase 0.3 & 1.I: Escalation to Title IX / CARE / Safety & School-scoped Moderation

create table public.escalation_routes (
  id                uuid primary key default gen_random_uuid(),
  school_id         text not null references public.schools (id) on delete cascade,
  category          text not null check (category in ('harassment', 'threat', 'discrimination', 'wellbeing', 'general')),
  destination_label text not null check (char_length(destination_label) between 2 and 120),
  url               text check (url is null or url ~* '^https?://'),
  phone             text check (phone is null or char_length(phone) <= 40),
  email             text check (email is null or char_length(email) <= 120),
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (school_id, category)
);

create index escalation_routes_school_idx on public.escalation_routes (school_id, active);

create table public.escalations (
  id                uuid primary key default gen_random_uuid(),
  school_id         text not null references public.schools (id) on delete cascade,
  report_id         uuid references public.reports (id) on delete cascade,
  category          text not null check (category in ('harassment', 'threat', 'discrimination', 'wellbeing', 'general')),
  route_id          uuid references public.escalation_routes (id) on delete set null,
  destination_label text not null default '',
  student_consented boolean not null default false,
  status            text not null default 'pending' check (status in ('pending', 'forwarded', 'closed')),
  forwarded_at      timestamptz,
  forwarded_by      uuid references public.profiles (id) on delete set null,
  notes             text check (notes is null or char_length(notes) <= 1000),
  created_at        timestamptz not null default now()
);

create index escalations_school_status_idx on public.escalations (school_id, status, created_at desc);
create index escalations_report_idx on public.escalations (report_id);

alter table public.escalation_routes enable row level security;
alter table public.escalations enable row level security;

revoke all on public.escalation_routes, public.escalations from anon, authenticated;
grant select on public.escalation_routes, public.escalations to authenticated;

-- Students read active routes for their own school to know where their report can go
create policy "escalation_routes: student reads active for school" on public.escalation_routes
  for select to authenticated using (
    active and school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
  );

-- Housing admins manage escalation routes
create policy "escalation_routes: staff reads all" on public.escalation_routes
  for select to authenticated using (
    public.has_role(school_id, array['housing_admin', 'moderator'])
  );

create policy "escalation_routes: housing admin writes" on public.escalation_routes
  for all to authenticated
  using (public.has_role(school_id, array['housing_admin']))
  with check (public.has_role(school_id, array['housing_admin']));

-- Escalations: visible to school moderators and housing admins
create policy "escalations: staff reads" on public.escalations
  for select to authenticated using (
    public.has_role(school_id, array['housing_admin', 'moderator'])
  );

create policy "escalations: staff updates" on public.escalations
  for update to authenticated
  using (public.has_role(school_id, array['housing_admin', 'moderator']))
  with check (public.has_role(school_id, array['housing_admin', 'moderator']));

-- Reports policy addition: school moderators read reports for their school
create policy "reports: school staff reads" on public.reports
  for select to authenticated using (
    exists (
      select 1 from public.profiles p_reported
      where p_reported.id = reports.reported_id
        and public.has_role(p_reported.school_id, array['housing_admin', 'moderator'])
        and (
          reports.reporter_id is null
          or exists (
            select 1 from public.profiles p_reporter
            where p_reporter.id = reports.reporter_id
              and p_reporter.school_id = p_reported.school_id
          )
        )
    )
  );

-- Staff function to load reports scoped to school (excluding cross-school)
create or replace function public.staff_school_reports(p_school text)
returns table (
  id uuid,
  reason text,
  details text,
  context jsonb,
  source text,
  status text,
  resolution_note text,
  reviewed_at timestamptz,
  created_at timestamptz,
  reported_id uuid,
  reported_first_name text,
  reported_last_initial text,
  reported_avatar_path text,
  reported_banned_at timestamptz,
  reporter_id uuid,
  reporter_first_name text,
  reporter_last_initial text,
  escalation_id uuid,
  escalation_status text,
  escalation_category text,
  escalation_destination text,
  escalation_forwarded_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_school, array['housing_admin', 'moderator']) then
    return;
  end if;

  return query
  select
    r.id,
    r.reason,
    r.details,
    r.context,
    r.source,
    r.status,
    r.resolution_note,
    r.reviewed_at,
    r.created_at,
    p_reported.id as reported_id,
    p_reported.first_name as reported_first_name,
    p_reported.last_initial as reported_last_initial,
    p_reported.avatar_path as reported_avatar_path,
    p_reported.banned_at as reported_banned_at,
    p_reporter.id as reporter_id,
    p_reporter.first_name as reporter_first_name,
    p_reporter.last_initial as reporter_last_initial,
    e.id as escalation_id,
    e.status as escalation_status,
    e.category as escalation_category,
    e.destination_label as escalation_destination,
    e.forwarded_at as escalation_forwarded_at
  from public.reports r
  join public.profiles p_reported on p_reported.id = r.reported_id
  left join public.profiles p_reporter on p_reporter.id = r.reporter_id
  left join public.escalations e on e.report_id = r.id
  where p_reported.school_id = p_school
    -- Cross-school reports go to platform admins only:
    and (r.reporter_id is null or p_reporter.school_id = p_school)
  order by r.created_at desc;
end;
$$;

revoke execute on function public.staff_school_reports(text) from public, anon;
grant execute on function public.staff_school_reports(text) to authenticated;
