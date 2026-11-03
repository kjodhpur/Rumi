-- Phase 1: staff dashboard, pairing review, term setup, nudges and auto-pair proposals.
-- See docs/phase-1.md.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table public.terms (
  id         uuid primary key default gen_random_uuid(),
  school_id  text not null references public.schools (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  starts_on  date not null,
  ends_on    date not null,
  deadlines  jsonb not null default '{}'::jsonb check (jsonb_typeof(deadlines) = 'object'),
  active     boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on)
);

create unique index terms_one_active_idx on public.terms (school_id) where active;

create table public.pairings (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id) on delete cascade,
  group_id    uuid unique references public.groups (id) on delete set null,
  member_ids  uuid[] not null default '{}',
  status      text not null default 'unreviewed' check (status in ('unreviewed', 'approved', 'needs_review')),
  staff_notes text check (char_length(staff_notes) <= 2000),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index pairings_school_idx on public.pairings (school_id);

create table public.campaigns (
  id             uuid primary key default gen_random_uuid(),
  school_id      text not null references public.schools (id) on delete cascade,
  kind           text not null default 'nudge' check (kind in ('nudge')),
  audience_count integer not null default 0,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

create table public.campaign_sends (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  sent_at     timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create index campaign_sends_user_idx on public.campaign_sends (user_id, sent_at desc);

create table public.auto_pair_runs (
  id            uuid primary key default gen_random_uuid(),
  school_id     text not null references public.schools (id) on delete cascade,
  params        jsonb not null default '{}'::jsonb,
  stats         jsonb not null default '{}'::jsonb,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  superseded_at timestamptz
);

create table public.auto_pair_proposals (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.auto_pair_runs (id) on delete cascade,
  school_id   text not null references public.schools (id) on delete cascade,
  member_ids  uuid[] not null check (cardinality(member_ids) = 2),
  score       smallint not null check (score between 0 and 100),
  reasons     jsonb not null default '[]'::jsonb,
  status      text not null default 'proposed' check (status in (
                'proposed', 'approved', 'rejected', 'sent', 'accepted', 'declined', 'superseded', 'invalid'
              )),
  responses   jsonb not null default '{}'::jsonb,
  group_id    uuid references public.groups (id) on delete set null,
  decided_by  uuid references public.profiles (id) on delete set null,
  decided_at  timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index auto_pair_proposals_run_idx on public.auto_pair_proposals (run_id);
create index auto_pair_proposals_members_idx on public.auto_pair_proposals using gin (member_ids);

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'intro_received', 'intro_accepted', 'message', 'strong_match',
  'group_invite', 'group_request', 'group_joined', 'housing_suggestion', 'housing_nudge'
));

-- ─────────────────────────────────────────────────────────────────────────────
-- Population helper: current students who count toward a school's numbers
-- ─────────────────────────────────────────────────────────────────────────────

/** Students (not staff, not suspended). Seed profiles count only at demo schools. */
create or replace function public.school_students(p_school text)
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.profiles p
  join public.schools s on s.id = p.school_id
  where p.school_id = p_school
    and not p.is_staff
    and p.banned_at is null
    and (not p.is_seed or s.is_demo);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Overview: KPIs, funnel, weekly trends, score distribution
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.staff_overview(p_school text, p_weeks integer default 16)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_weeks integer := least(greatest(coalesce(p_weeks, 16), 4), 104);
  v_result jsonb;
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff', 'analyst']) then
    raise exception 'not_allowed';
  end if;

  with students as (
    select * from public.school_students(p_school)
  ),
  onboarded as (
    select * from students where onboarding_completed_at is not null
  ),
  confirmed_groups as (
    select gm.group_id, (array_agg(gm.joined_at order by gm.joined_at))[2] as second_join
    from public.group_members gm
    join public.groups g on g.id = gm.group_id and g.school_id = p_school
    group by gm.group_id
    having count(*) >= 2
  ),
  matched as (
    select gm.user_id, greatest(gm.joined_at, cg.second_join) as matched_at
    from public.group_members gm
    join confirmed_groups cg on cg.group_id = gm.group_id
    join students s on s.id = gm.user_id
  ),
  best as (
    select o.id, o.class_year, pr.housing_type,
           (select max(ms.score) from public.match_scores ms
             join students c on c.id = ms.candidate_id
             where ms.viewer_id = o.id) as best_score,
           (select count(*) from public.match_scores ms
             join students c on c.id = ms.candidate_id
             where ms.viewer_id = o.id and ms.score >= 70) as strong
    from onboarded o
    left join public.preferences pr on pr.user_id = o.id
  ),
  intro_stats as (
    select count(*) as sent,
           count(*) filter (where i.status = 'accepted') as accepted
    from public.intros i
    join students s on s.id = i.sender_id
  ),
  intro_people as (
    select distinct u.id, bool_or(u.accepted) as any_accepted
    from (
      select i.sender_id as id, i.status = 'accepted' as accepted from public.intros i
      union all
      select i.recipient_id, i.status = 'accepted' from public.intros i
    ) u
    join students s on s.id = u.id
    group by u.id
  ),
  weeks as (
    select generate_series(
      date_trunc('week', now()) - make_interval(weeks => v_weeks - 1),
      date_trunc('week', now()),
      interval '1 week'
    ) as week_start
  ),
  binned as (
    select b.*,
      case
        when best_score is null then 'none'
        when best_score < 50 then '0-49'
        when best_score < 60 then '50-59'
        when best_score < 70 then '60-69'
        when best_score < 80 then '70-79'
        when best_score < 90 then '80-89'
        else '90-100'
      end as bin
    from best b
  )
  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'students', (select count(*) from students),
      'verified', (select count(*) from students where student_verified_at > now() - interval '365 days'),
      'onboarded', (select count(*) from onboarded),
      'withStrongMatch', (select count(*) from best where strong > 0),
      'matched', (select count(*) from matched m join onboarded o on o.id = m.user_id),
      'introsSent', (select sent from intro_stats),
      'introsAccepted', (select accepted from intro_stats),
      'medianDaysToMatch', (
        select percentile_cont(0.5) within group (
          order by greatest(extract(epoch from (m.matched_at - o.onboarding_completed_at)) / 86400, 0)
        )
        from matched m join onboarded o on o.id = m.user_id
      ),
      'unmatched', (select count(*) from onboarded o where not exists (select 1 from matched m where m.user_id = o.id)),
      'openReports', (
        select count(*) from public.reports r join students s on s.id = r.reported_id
        where r.status in ('open', 'reviewing')
      )
    ),
    'funnel', jsonb_build_array(
      jsonb_build_object('stage', 'signed_up', 'n', (select count(*) from students)),
      jsonb_build_object('stage', 'verified', 'n', (select count(*) from students where student_verified_at is not null)),
      jsonb_build_object('stage', 'onboarded', 'n', (select count(*) from onboarded)),
      jsonb_build_object('stage', 'intro', 'n', (select count(*) from intro_people)),
      jsonb_build_object('stage', 'intro_accepted', 'n', (select count(*) from intro_people where any_accepted)),
      jsonb_build_object('stage', 'matched', 'n', (select count(*) from matched))
    ),
    'weekly', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'week', to_char(w.week_start, 'YYYY-MM-DD'),
        'signups', (select count(*) from students s where date_trunc('week', s.created_at) = w.week_start),
        'onboarded', (select count(*) from onboarded o where date_trunc('week', o.onboarding_completed_at) = w.week_start),
        'matched', (select count(*) from matched m where date_trunc('week', m.matched_at) = w.week_start)
      ) order by w.week_start), '[]'::jsonb)
      from weeks w
    ),
    'distribution', (
      select coalesce(jsonb_agg(jsonb_build_object('bin', bin, 'n', n)), '[]'::jsonb)
      from (select bin, count(*) as n from binned group by bin) d
    ),
    'segments', (
      select coalesce(jsonb_agg(jsonb_build_object('dimension', dimension, 'value', value, 'bin', bin, 'n', n)), '[]'::jsonb)
      from (
        select 'class_year' as dimension, coalesce(class_year, 'unknown') as value, bin, count(*) as n
        from binned group by 2, 3
        union all
        select 'housing_type', coalesce(housing_type, 'unknown'), bin, count(*)
        from binned group by 2, 3
      ) seg
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Student-level views (consented students only)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.staff_unmatched(p_school text)
returns table (
  id uuid,
  first_name text,
  last_initial text,
  class_year text,
  housing_type text,
  move_in_date date,
  best_score smallint,
  strong_matches integer,
  onboarded_at timestamptz,
  last_nudged_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff']) then
    raise exception 'not_allowed';
  end if;
  return query
  with students as (select * from public.school_students(p_school))
  select s.id, s.first_name, s.last_initial, s.class_year, pr.housing_type, pr.move_in_date,
    (select max(ms.score) from public.match_scores ms join students c on c.id = ms.candidate_id where ms.viewer_id = s.id),
    (select count(*)::integer from public.match_scores ms join students c on c.id = ms.candidate_id
      where ms.viewer_id = s.id and ms.score >= 70),
    s.onboarding_completed_at,
    (select max(cs.sent_at) from public.campaign_sends cs where cs.user_id = s.id)
  from students s
  left join public.preferences pr on pr.user_id = s.id
  where s.onboarding_completed_at is not null
    and public.has_consent(s.id, 'share_with_housing')
    and not exists (
      select 1 from public.group_members gm
      where gm.user_id = s.id
        and (select count(*) from public.group_members x where x.group_id = gm.group_id) >= 2
    )
  order by s.onboarding_completed_at;
end;
$$;

create or replace function public.staff_pairings(p_school text)
returns table (
  group_id uuid,
  name text,
  target_size smallint,
  created_at timestamptz,
  members jsonb,
  pair_scores jsonb,
  status text,
  staff_notes text,
  approved_at timestamptz,
  snapshot uuid[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff']) then
    raise exception 'not_allowed';
  end if;
  return query
  with g as (
    select gr.id, gr.name, gr.target_size, gr.created_at
    from public.groups gr
    where gr.school_id = p_school
      and (select count(*) from public.group_members x where x.group_id = gr.id) >= 2
      and exists (
        select 1 from public.group_members x
        where x.group_id = gr.id and public.has_consent(x.user_id, 'share_with_housing')
      )
  )
  select g.id, g.name, g.target_size, g.created_at,
    (
      select jsonb_agg(jsonb_build_object(
        'id', gm.user_id,
        'shared', public.has_consent(gm.user_id, 'share_with_housing'),
        'firstName', case when public.has_consent(gm.user_id, 'share_with_housing') then p.first_name end,
        'lastInitial', case when public.has_consent(gm.user_id, 'share_with_housing') then p.last_initial end,
        'classYear', case when public.has_consent(gm.user_id, 'share_with_housing') then p.class_year end,
        'hidden', p.is_hidden,
        'joinedAt', gm.joined_at
      ) order by gm.role = 'owner' desc, gm.joined_at, gm.user_id)
      from public.group_members gm join public.profiles p on p.id = gm.user_id
      where gm.group_id = g.id
    ),
    (
      select coalesce(jsonb_agg(jsonb_build_object('a', a.user_id, 'b', b.user_id, 'score', ms.score)), '[]'::jsonb)
      from public.group_members a
      join public.group_members b on b.group_id = a.group_id and a.user_id < b.user_id
      left join public.match_scores ms on ms.viewer_id = a.user_id and ms.candidate_id = b.user_id
      where a.group_id = g.id
    ),
    coalesce(pa.status, 'unreviewed'), pa.staff_notes, pa.approved_at, pa.member_ids
  from g
  left join public.pairings pa on pa.group_id = g.id
  order by g.created_at desc;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Housing suggestions: the student's answer
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.respond_housing_suggestion(p_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  r public.auto_pair_proposals%rowtype;
  v_other uuid;
  v_group uuid;
  v_conversation uuid;
  v_name text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into r from public.auto_pair_proposals where id = p_id for update;
  if r.id is null or not (v_uid = any (r.member_ids)) then raise exception 'not_found'; end if;
  if r.status <> 'sent' then raise exception 'not_pending'; end if;

  if not p_accept then
    update public.auto_pair_proposals
    set status = 'declined', responses = responses || jsonb_build_object(v_uid::text, false)
    where id = r.id;
    return 'declined';
  end if;

  update public.auto_pair_proposals
  set responses = responses || jsonb_build_object(v_uid::text, true)
  where id = r.id
  returning * into r;

  v_other := case when r.member_ids[1] = v_uid then r.member_ids[2] else r.member_ids[1] end;
  if coalesce((r.responses ->> v_other::text)::boolean, false) is not true then
    return 'waiting';
  end if;

  -- Both said yes. Someone may have joined a group in the meantime (returning, not raising, keeps the status).
  if exists (select 1 from public.group_members where user_id = any (r.member_ids)) then
    update public.auto_pair_proposals set status = 'invalid' where id = r.id;
    return 'invalid';
  end if;

  v_name := left(public.first_name_of(r.member_ids[1]) || ' & ' || public.first_name_of(r.member_ids[2]), 40);
  insert into public.groups (school_id, name, owner_id, target_size, status)
  values (r.school_id, v_name, r.member_ids[1], 2, 'full')
  returning id into v_group;
  insert into public.group_members (group_id, user_id, role) values
    (v_group, r.member_ids[1], 'owner'),
    (v_group, r.member_ids[2], 'member');
  insert into public.conversations (kind, group_id) values ('group', v_group) returning id into v_conversation;
  insert into public.conversation_members (conversation_id, user_id) values
    (v_conversation, r.member_ids[1]),
    (v_conversation, r.member_ids[2]);
  insert into public.messages (conversation_id, kind, body)
  values (v_conversation, 'system', 'You both said yes to a housing suggestion. Say hi!');
  update public.group_requests set status = 'cancelled', responded_at = now()
  where user_id = any (r.member_ids) and status = 'pending';

  update public.auto_pair_proposals set status = 'accepted', group_id = v_group where id = r.id;
  insert into public.notifications (user_id, type, actor_id, entity_id, title, body, href) values
    (r.member_ids[1], 'group_joined', r.member_ids[2], v_group,
     'You and ' || public.first_name_of(r.member_ids[2]) || ' both said yes',
     'Your group chat is open.', '/groups/' || v_group),
    (r.member_ids[2], 'group_joined', r.member_ids[1], v_group,
     'You and ' || public.first_name_of(r.member_ids[1]) || ' both said yes',
     'Your group chat is open.', '/groups/' || v_group);
  return 'accepted';
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.terms               enable row level security;
alter table public.pairings            enable row level security;
alter table public.campaigns           enable row level security;
alter table public.campaign_sends      enable row level security;
alter table public.auto_pair_runs      enable row level security;
alter table public.auto_pair_proposals enable row level security;

revoke all on public.terms, public.pairings, public.campaigns, public.campaign_sends,
  public.auto_pair_runs, public.auto_pair_proposals from anon, authenticated;
grant select on public.terms, public.pairings, public.campaigns, public.campaign_sends,
  public.auto_pair_runs, public.auto_pair_proposals to authenticated;

create policy "terms: school staff read" on public.terms
  for select to authenticated using (
    public.has_role(school_id, array['housing_admin', 'housing_staff', 'ra', 'analyst', 'moderator'])
  );
create policy "pairings: housing leads read" on public.pairings
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff']));
create policy "campaigns: housing leads read" on public.campaigns
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff']));
create policy "campaign_sends: housing leads read" on public.campaign_sends
  for select to authenticated using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and public.has_role(c.school_id, array['housing_admin', 'housing_staff'])
    )
  );
create policy "auto_pair_runs: housing leads read" on public.auto_pair_runs
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff']));
create policy "auto_pair_proposals: leads, or the two students once sent" on public.auto_pair_proposals
  for select to authenticated using (
    public.has_role(school_id, array['housing_admin', 'housing_staff'])
    or (auth.uid() = any (member_ids) and status in ('sent', 'accepted', 'declined', 'invalid'))
  );

revoke execute on function
  public.school_students(text),
  public.staff_overview(text, integer),
  public.staff_unmatched(text),
  public.staff_pairings(text),
  public.respond_housing_suggestion(uuid, boolean)
from public, anon;

grant execute on function
  public.staff_overview(text, integer),
  public.staff_unmatched(text),
  public.staff_pairings(text),
  public.respond_housing_suggestion(uuid, boolean)
to authenticated;
grant execute on function public.school_students(text) to service_role;
