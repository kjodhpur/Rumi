-- The rest of §4: agreement templates and comments (Phase 4), notification preferences,
-- web push, SMS, calendar and class schedule (Phase 7.3–7.5), AI moderation columns (0.5),
-- locale (Phase 8), demo flag (§6), pilot-scoped student pool (Phase 9), and the staff
-- analytics functions for segments (1.A), room changes (1.B) and agreement completion (4).
-- Every aggregate here suppresses cells with 1–4 students: the count comes back null with
-- suppressed = true, so the raw small number never leaves the database.

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 4: templates and comments
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.agreements add column if not exists template_version integer;

-- sections: [{ key, title, enabled, addendum }] for the built-in sections plus
-- [{ key, title, content, custom: true }] for school-added ones.
create table public.agreement_templates (
  school_id   text not null references public.schools (id) on delete cascade,
  version     integer not null check (version >= 1),
  sections    jsonb not null check (jsonb_typeof(sections) = 'array'),
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (school_id, version)
);

create table public.agreement_comments (
  id            uuid primary key default gen_random_uuid(),
  agreement_id  uuid not null references public.agreements (id) on delete cascade,
  section_key   text not null check (section_key ~ '^[a-z_]{2,32}$'),
  author_id     uuid references public.profiles (id) on delete set null,
  body          text not null check (char_length(body) between 1 and 500),
  created_at    timestamptz not null default now()
);

create index agreement_comments_agreement_idx on public.agreement_comments (agreement_id, section_key, created_at);

alter table public.agreement_templates enable row level security;
alter table public.agreement_comments enable row level security;
revoke all on public.agreement_templates, public.agreement_comments from anon, authenticated;
grant select on public.agreement_templates, public.agreement_comments to authenticated;
grant insert (agreement_id, section_key, author_id, body) on public.agreement_comments to authenticated;
grant delete on public.agreement_comments to authenticated;

create policy "agreement_templates: school reads" on public.agreement_templates
  for select to authenticated using (
    school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
    or public.has_role(school_id, array['housing_admin', 'housing_staff'])
  );

create policy "agreement_comments: members read" on public.agreement_comments
  for select to authenticated using (
    exists (select 1 from public.agreements a where a.id = agreement_id and public.is_group_member(a.group_id, auth.uid()))
  );
create policy "agreement_comments: members write own" on public.agreement_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.agreements a
      where a.id = agreement_id and a.status in ('draft', 'reopened') and public.is_group_member(a.group_id, auth.uid())
    )
  );
create policy "agreement_comments: authors delete" on public.agreement_comments
  for delete to authenticated using (author_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 7.5: notification preferences, web push, SMS
-- ─────────────────────────────────────────────────────────────────────────────

create table public.notification_preferences (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  kind      text not null check (kind in ('intros', 'messages', 'matches', 'groups', 'deadlines', 'checkins', 'agreements')),
  in_app    boolean not null default true,
  email     boolean not null default true,
  sms       boolean not null default false,
  push      boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  endpoint      text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh        text not null check (char_length(p256dh) <= 200),
  auth          text not null check (char_length(auth) <= 100),
  user_agent    text check (user_agent is null or char_length(user_agent) <= 300),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.user_settings
  add column if not exists phone_enc text check (phone_enc is null or char_length(phone_enc) <= 512),
  add column if not exists phone_last4 text check (phone_last4 is null or phone_last4 ~ '^[0-9]{4}$'),
  -- Keyed hash of the E.164 number, so an inbound STOP finds the account without decrypting every row.
  add column if not exists phone_hash text check (phone_hash is null or phone_hash ~ '^[0-9a-f]{64}$'),
  add column if not exists phone_verified_at timestamptz,
  add column if not exists locale text not null default 'en' check (locale in ('en', 'es', 'zh', 'hi'));

grant update (locale) on public.user_settings to authenticated;
create index if not exists user_settings_phone_hash_idx on public.user_settings (phone_hash) where phone_hash is not null;

-- Outbound texts and inbound STOP/HELP. Service role only; bodies never include message text.
create table public.sms_messages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete set null,
  direction     text not null check (direction in ('outbound', 'inbound')),
  kind          text not null check (char_length(kind) <= 40),
  body          text not null check (char_length(body) <= 320),
  status        text not null check (status in ('queued', 'sent', 'failed', 'skipped', 'received')),
  provider_sid  text,
  error         text check (error is null or char_length(error) <= 300),
  created_at    timestamptz not null default now()
);

create index sms_messages_user_idx on public.sms_messages (user_id, created_at desc);

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.sms_messages enable row level security;

revoke all on public.notification_preferences, public.push_subscriptions, public.sms_messages from anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, delete on public.push_subscriptions to authenticated;

create policy "notification_preferences: own" on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_subscriptions: own read" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "push_subscriptions: own delete" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 7.3 & 7.4: calendar accounts and class schedule
-- ─────────────────────────────────────────────────────────────────────────────

create table public.calendar_accounts (
  user_id            uuid not null references public.profiles (id) on delete cascade,
  provider           text not null check (provider in ('google', 'microsoft')),
  access_token_enc   text not null,
  refresh_token_enc  text,
  expires_at         timestamptz,
  scope              text,
  last_sync_at       timestamptz,
  last_error         text check (last_error is null or char_length(last_error) <= 300),
  created_at         timestamptz not null default now(),
  primary key (user_id, provider)
);

-- blocks: [{ day 0–6 (Mon=0), start "HH:MM", end "HH:MM" }] in the campus time zone.
create table public.class_schedules (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  source       text not null check (source in ('manual', 'ics')),
  ics_url_enc  text,
  blocks       jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) <= 60),
  last_sync_at timestamptz,
  last_error   text check (last_error is null or char_length(last_error) <= 300),
  updated_at   timestamptz not null default now()
);

alter table public.calendar_accounts enable row level security;
alter table public.class_schedules enable row level security;
revoke all on public.calendar_accounts, public.class_schedules from anon, authenticated;
-- Tokens and feed URLs never reach the browser: only status columns are readable.
grant select (user_id, provider, last_sync_at, last_error, created_at) on public.calendar_accounts to authenticated;
grant select (user_id, source, blocks, last_sync_at, last_error, updated_at) on public.class_schedules to authenticated;

create policy "calendar_accounts: own" on public.calendar_accounts
  for select to authenticated using (user_id = auth.uid());
create policy "class_schedules: own" on public.class_schedules
  for select to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 0.5 AI moderation, §6 demo flag
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.moderation_log
  add column if not exists classifier text check (classifier is null or classifier in ('regex', 'model')),
  add column if not exists confidence real check (confidence is null or confidence between 0 and 1);

alter table public.schools
  add column if not exists ai_moderation_enabled boolean not null default false;

alter table public.profiles add column if not exists is_demo boolean not null default false;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 9: a live pilot limits the student pool (and so every dashboard) to its scope.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.in_pilot_scope(p_school text, p_residential_college text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.pilot_configs pc
    where pc.school_id = p_school
      and current_date between pc.starts_on and pc.ends_on
      and jsonb_typeof(pc.scope -> 'residential_colleges') = 'array'
      and jsonb_array_length(pc.scope -> 'residential_colleges') > 0
      and not coalesce(p_residential_college, '') in (select jsonb_array_elements_text(pc.scope -> 'residential_colleges'))
  );
$$;

revoke execute on function public.in_pilot_scope(text, text) from public, anon;
grant execute on function public.in_pilot_scope(text, text) to authenticated, service_role;

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
    and (not p.is_seed or s.is_demo)
    and public.in_pilot_scope(p_school, p.residential_college);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Overview gains the "exported to StarRez" funnel stage and sign-ups by source (3.3).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.staff_signups_by_source(p_school text)
returns table (source text, n integer, suppressed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff', 'analyst']) then
    raise exception 'not_allowed';
  end if;
  return query
  with counted as (
    select coalesce(la.source, 'direct') as src, count(*)::integer as c
    from public.school_students(p_school) s
    left join public.link_attributions la on la.user_id = s.id
    group by 1
  )
  select src, case when c between 1 and 4 then null else c end, c between 1 and 4
  from counted
  order by c desc;
end;
$$;

create or replace function public.staff_exported_students(p_school text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.has_role(p_school, array['housing_admin', 'housing_staff', 'analyst']) then (
    select count(distinct m)::integer
    from public.pairings pa, unnest(pa.member_ids) m
    where pa.school_id = p_school and pa.exported_at is not null
      and m in (select s.id from public.school_students(p_school) s)
  ) end;
$$;

revoke execute on function public.staff_signups_by_source(text) from public, anon;
revoke execute on function public.staff_exported_students(text) from public, anon;
grant execute on function public.staff_signups_by_source(text) to authenticated;
grant execute on function public.staff_exported_students(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.A Segment analytics
-- ─────────────────────────────────────────────────────────────────────────────

-- One row per student in the caller's population with everything the metrics need.
-- RAs get only students with an open assignment in their buildings.
create or replace function public.staff_segment_base(p_school text)
returns table (
  id uuid,
  class_year text,
  academic_college text,
  residential_college text,
  llc text,
  campus text,
  gender_inclusive text,
  housing_type text,
  track text,
  pre_arrival text,
  onboarded boolean,
  matched boolean,
  best_score integer,
  intros_sent integer,
  intros_accepted integer,
  agreement_signed boolean,
  checkin_avg numeric,
  has_assignment boolean,
  room_changed boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ra_only boolean;
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff', 'analyst', 'ra']) then
    raise exception 'not_allowed';
  end if;
  ra_only := not public.has_role(p_school, array['housing_admin', 'housing_staff', 'analyst']);
  return query
  with students as (
    select s.* from public.school_students(p_school) s
    where not ra_only or exists (
      select 1 from public.assignments a
      where a.user_id = s.id and a.closed_at is null and public.staff_scope_includes(p_school, a.building)
    )
  ),
  grouped as (
    select gm.user_id, gm.group_id
    from public.group_members gm
    where (select count(*) from public.group_members x where x.group_id = gm.group_id) >= 2
  )
  select
    s.id,
    coalesce(s.class_year, 'unknown'),
    coalesce(s.academic_college, 'unknown'),
    coalesce(s.residential_college, 'unknown'),
    coalesce(s.llc, 'unknown'),
    coalesce(s.campus, 'unknown'),
    case when s.gender_inclusive is null then 'unknown' when s.gender_inclusive then 'yes' else 'no' end,
    coalesce(pr.housing_type, 'unknown'),
    coalesce(s.track, 'unknown'),
    case when s.pre_arrival then 'pre_arrival' else 'enrolled' end,
    s.onboarding_completed_at is not null,
    exists (select 1 from grouped g where g.user_id = s.id),
    (select max(ms.score)::integer from public.match_scores ms join students c on c.id = ms.candidate_id where ms.viewer_id = s.id),
    (select count(*)::integer from public.intros i where i.sender_id = s.id),
    (select count(*)::integer from public.intros i where i.sender_id = s.id and i.status = 'accepted'),
    exists (
      select 1 from public.agreements ag
      join grouped g on g.group_id = ag.group_id and g.user_id = s.id
      where ag.status = 'signed'
    ),
    case when public.has_consent(s.id, 'checkins') then (
      select avg(k.score) from public.checkins k where k.user_id = s.id and k.submitted_at is not null
    ) end,
    exists (select 1 from public.assignments a where a.user_id = s.id),
    exists (select 1 from public.room_change_requests r where r.user_id = s.id)
  from students s
  left join public.preferences pr on pr.user_id = s.id;
end;
$$;

revoke execute on function public.staff_segment_base(text) from public, anon, authenticated;

create or replace function public.staff_segments(p_school text, p_dimension text, p_metric text)
returns table (value text, n integer, numerator integer, rate numeric, average numeric, suppressed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_dimension not in ('class_year', 'academic_college', 'residential_college', 'llc', 'campus',
                         'gender_inclusive', 'housing_type', 'track', 'pre_arrival') then
    raise exception 'invalid_dimension';
  end if;
  if p_metric not in ('onboarding', 'matched', 'best_score', 'intro_acceptance', 'agreement', 'checkin_avg', 'room_change') then
    raise exception 'invalid_metric';
  end if;
  return query
  with base as (
    select b.*, case p_dimension
      when 'class_year' then b.class_year
      when 'academic_college' then b.academic_college
      when 'residential_college' then b.residential_college
      when 'llc' then b.llc
      when 'campus' then b.campus
      when 'gender_inclusive' then b.gender_inclusive
      when 'housing_type' then b.housing_type
      when 'track' then b.track
      else b.pre_arrival
    end as seg
    from public.staff_segment_base(p_school) b
  ),
  scoped as (
    -- Each metric has its own denominator.
    select seg, x.den, x.num, x.val
    from base,
    lateral (select
      case p_metric
        when 'onboarding' then 1
        when 'matched' then case when onboarded then 1 else 0 end
        when 'best_score' then case when best_score is not null then 1 else 0 end
        when 'intro_acceptance' then intros_sent
        when 'agreement' then case when matched then 1 else 0 end
        when 'checkin_avg' then case when checkin_avg is not null then 1 else 0 end
        else case when has_assignment then 1 else 0 end
      end as den,
      case p_metric
        when 'onboarding' then case when onboarded then 1 else 0 end
        when 'matched' then case when onboarded and matched then 1 else 0 end
        when 'intro_acceptance' then intros_accepted
        when 'agreement' then case when matched and agreement_signed then 1 else 0 end
        when 'room_change' then case when has_assignment and room_changed then 1 else 0 end
        else 0
      end as num,
      case p_metric when 'best_score' then best_score::numeric when 'checkin_avg' then checkin_avg else null end as val
    ) x
  ),
  agg as (
    select seg as v, sum(den)::integer as d, sum(num)::integer as nu,
      case when p_metric = 'best_score' then percentile_cont(0.5) within group (order by val)
           when p_metric = 'checkin_avg' then avg(val) end as av
    from scoped where den > 0 group by seg
    union all
    select '__total', sum(den)::integer, sum(num)::integer,
      case when p_metric = 'best_score' then percentile_cont(0.5) within group (order by val)
           when p_metric = 'checkin_avg' then avg(val) end
    from scoped where den > 0
  )
  select
    agg.v,
    case when agg.d < 5 then null else agg.d end,
    case when agg.d < 5 or agg.nu between 1 and 4 then null else agg.nu end,
    case when agg.d < 5 or agg.nu between 1 and 4 or p_metric in ('best_score', 'checkin_avg') then null
         else round(agg.nu::numeric / nullif(agg.d, 0), 4) end,
    case when agg.d < 5 then null else round(agg.av::numeric, 2) end,
    agg.d < 5 or (p_metric not in ('best_score', 'checkin_avg') and agg.nu between 1 and 4)
  from agg
  order by (agg.v = '__total'), agg.d desc nulls last;
end;
$$;

revoke execute on function public.staff_segments(text, text, text) from public, anon;
grant execute on function public.staff_segments(text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.B Room-change analytics
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.staff_room_changes(p_school text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ra_only boolean;
  result jsonb;
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff', 'analyst', 'ra']) then
    raise exception 'not_allowed';
  end if;
  ra_only := not public.has_role(p_school, array['housing_admin', 'housing_staff', 'analyst']);
  with req as (
    select r.*,
      case
        when r.match_score_at_assignment is null then 'unknown'
        when r.match_score_at_assignment < 50 then '<50'
        when r.match_score_at_assignment < 70 then '50-69'
        when r.match_score_at_assignment < 85 then '70-84'
        else '85+'
      end as band
    from public.room_change_requests r
    where r.school_id = p_school
      and (not ra_only or (r.building is not null and public.staff_scope_includes(p_school, r.building)))
  ),
  reasons as (
    select req.*, unnest(case when cardinality(req.reason_keys) = 0 then array['untagged'] else req.reason_keys end) as reason
    from req
  ),
  -- Students with an assignment, by band, for the "do low-score pairs move more?" rate.
  assigned as (
    select a.user_id,
      case
        when ms.score is null then 'unknown'
        when ms.score < 50 then '<50'
        when ms.score < 70 then '50-69'
        when ms.score < 85 then '70-84'
        else '85+'
      end as band
    from public.assignments a
    left join lateral (
      select max(m.score) as score
      from public.assignments b
      join public.match_scores m on m.viewer_id = a.user_id and m.candidate_id = b.user_id
      where b.school_id = a.school_id and b.building = a.building and b.room = a.room and b.user_id <> a.user_id
    ) ms on true
    where a.school_id = p_school
      and (not ra_only or public.staff_scope_includes(p_school, a.building))
  )
  select jsonb_build_object(
    'total', (select case when count(*) between 1 and 4 then null else count(*) end from req),
    'untagged', (select case when count(*) between 1 and 4 then null else count(*) end from req where cardinality(reason_keys) = 0),
    'byReason', (
      select coalesce(jsonb_agg(jsonb_build_object('key', reason, 'n', case when c between 1 and 4 then null else c end) order by c desc), '[]'::jsonb)
      from (select reason, count(*) as c from reasons group by reason) x
    ),
    'byMonth', (
      select coalesce(jsonb_agg(jsonb_build_object('month', m, 'key', reason, 'n', case when c between 1 and 4 then null else c end) order by m), '[]'::jsonb)
      from (select to_char(date_trunc('month', created_at), 'YYYY-MM') as m, reason, count(*) as c from reasons group by 1, 2) x
    ),
    'byBuilding', (
      select coalesce(jsonb_agg(jsonb_build_object('building', b, 'n', case when c between 1 and 4 then null else c end) order by c desc), '[]'::jsonb)
      from (select coalesce(building, 'unknown') as b, count(*) as c from req group by 1) x
    ),
    'byBand', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'band', bands.band,
        'requests', case when coalesce(rq.c, 0) between 1 and 4 then null else coalesce(rq.c, 0) end,
        'assigned', case when coalesce(asg.c, 0) between 1 and 4 then null else coalesce(asg.c, 0) end,
        'rate', case when coalesce(asg.c, 0) < 5 or coalesce(rq.c, 0) between 1 and 4 then null
                     else round(coalesce(rq.c, 0)::numeric / asg.c, 4) end
      ) order by bands.pos), '[]'::jsonb)
      from (values ('<50', 0), ('50-69', 1), ('70-84', 2), ('85+', 3), ('unknown', 4)) as bands (band, pos)
      left join (select band, count(*) as c from req group by band) rq on rq.band = bands.band
      left join (select band, count(*) as c from assigned group by band) asg on asg.band = bands.band
    ),
    'byAgreement', (
      select coalesce(jsonb_agg(jsonb_build_object('signed', k, 'n', case when c between 1 and 4 then null else c end)), '[]'::jsonb)
      from (select coalesce(agreement_signed::text, 'unknown') as k, count(*) as c from req group by 1) x
    )
  ) into result;
  return result;
end;
$$;

revoke execute on function public.staff_room_changes(text) from public, anon;
grant execute on function public.staff_room_changes(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 4: agreement completion by building (status only, never the text)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.staff_agreement_completion(p_school text)
returns table (building text, groups integer, signed integer, suppressed boolean)
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
  with grp as (
    select g.id,
      (select a.building from public.group_members gm
        join public.assignments a on a.user_id = gm.user_id and a.closed_at is null
        where gm.group_id = g.id limit 1) as bld,
      exists (select 1 from public.agreements ag where ag.group_id = g.id and ag.status = 'signed') as is_signed
    from public.groups g
    where g.school_id = p_school
      and (select count(*) from public.group_members x where x.group_id = g.id) >= 2
  ),
  agg as (
    select coalesce(bld, 'Not moved in') as b, count(*)::integer as c, count(*) filter (where is_signed)::integer as s
    from grp
    where (bld is null and public.has_role(p_school, array['housing_admin', 'housing_staff']))
       or (bld is not null and public.staff_scope_includes(p_school, bld))
    group by 1
  )
  select agg.b,
    case when agg.c between 1 and 4 then null else agg.c end,
    case when agg.c < 5 or agg.s between 1 and 4 then null else agg.s end,
    agg.c < 5 or agg.s between 1 and 4
  from agg
  order by agg.c desc;
end;
$$;

revoke execute on function public.staff_agreement_completion(text) from public, anon;
grant execute on function public.staff_agreement_completion(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Notification types for the features above
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'intro_received', 'intro_accepted', 'message', 'strong_match',
  'group_invite', 'group_request', 'group_joined', 'housing_suggestion', 'housing_nudge',
  'deadline_nudge', 'safety_notice', 'share_request', 'connection_request', 'connection_confirmed',
  'checkin_due', 'ra_followup', 'swap_proposal', 'survey', 'carry_forward', 'chore_due',
  'agreement_reminder', 'imported_answers'
));

-- Phase 6.2: a carried-forward group becomes a pairing in the new term.
alter table public.pairings add column if not exists term_id uuid references public.terms (id) on delete set null;
alter table public.pairings add column if not exists carried_from_term uuid references public.terms (id) on delete set null;

-- Phase 7.5: phone verification codes for SMS (hash only; service role only).
create table public.phone_verifications (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  phone_enc   text not null,
  code_hash   text not null check (char_length(code_hash) = 64),
  attempts    integer not null default 0,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table public.phone_verifications enable row level security;
revoke all on public.phone_verifications from anon, authenticated;

-- Phase 1 term configuration: required school questions and allowed importance ranges.
-- { "requiredQuestions": ["key", …], "maxImportance": { "<factor>": 0–3 } }
alter table public.terms add column if not exists config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object');
