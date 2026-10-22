-- Rumi functions & triggers.
-- Security-definer functions pin `search_path = ''` and fully qualify every
-- object, and each one checks auth.uid() itself before touching data.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();
create trigger preferences_updated_at before update on public.preferences
  for each row execute function public.set_updated_at();

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = uid);
$$;

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

/** Student status is re-confirmed on every school-email sign-in and lapses after a year. */
create or replace function public.is_student_verified(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.student_verified_at > now() - interval '365 days' from public.profiles p where p.id = uid),
    false
  );
$$;

create or replace function public.is_conversation_member(cid uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members m where m.conversation_id = cid and m.user_id = uid
  );
$$;

create or replace function public.is_group_member(gid uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.group_members m where m.group_id = gid and m.user_id = uid);
$$;

create or replace function public.shares_conversation(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members m1
    join public.conversation_members m2 on m2.conversation_id = m1.conversation_id
    where m1.user_id = a and m2.user_id = b
  );
$$;

/**
 * The single source of truth for "may `viewer` see `target`'s profile?"
 * Used by every cross-user RLS policy and RPC.
 */
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
        where t.id = target
          and t.onboarding_completed_at is not null
          and t.banned_at is null
          and v.banned_at is null
          and t.school_id = v.school_id
          and (not t.is_hidden or public.shares_conversation(viewer, target))
          and (not t.verified_only or v.student_verified_at > now() - interval '365 days')
          and not public.is_blocked(viewer, target)
      )
    );
$$;

/** Both people can see each other, and the initiator is a verified, onboarded student. */
create or replace function public.can_contact(sender uuid, recipient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    sender <> recipient
    and public.can_view_profile(sender, recipient)
    and public.can_view_profile(recipient, sender)
    and exists (
      select 1 from public.profiles s
      where s.id = sender
        and s.onboarding_completed_at is not null
        and s.banned_at is null
        and s.student_verified_at > now() - interval '365 days'
    );
$$;

create or replace function public.first_name_of(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(p.first_name, ''), 'Someone') from public.profiles p where p.id = uid;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Sign-up: school email enforcement + bootstrap rows
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.school_for_email(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.schools s, unnest(s.email_domains) d
  where s.active
    and (
      lower(split_part(p_email, '@', 2)) = lower(d)
      or lower(split_part(p_email, '@', 2)) like '%.' || lower(d)
    )
  order by s.created_at
  limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school text;
begin
  v_school := public.school_for_email(new.email);
  if v_school is null then
    raise exception 'school_email_required'
      using hint = 'Sign up with your school email address.', errcode = 'P0001';
  end if;

  insert into public.profiles (id, school_id, student_verified_at)
  values (new.id, v_school, case when new.email_confirmed_at is not null then now() end);

  insert into public.user_settings (user_id, email) values (new.id, lower(new.email));
  insert into public.preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/** Confirming the school email (first OTP) marks the student as verified. */
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set student_verified_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

-- ─────────────────────────────────────────────────────────────────────────────
-- Photos: keep profiles.avatar_path in sync with the first photo
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.sync_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles p
  set avatar_path = (
    select ph.storage_path from public.photos ph
    where ph.user_id = v_user order by ph.position limit 1
  )
  where p.id = v_user;
  return null;
end;
$$;

create trigger photos_sync_avatar
  after insert or update or delete on public.photos
  for each row execute function public.sync_avatar();

/** Reorder the caller's photos in one statement (the unique key is deferred). */
create or replace function public.reorder_photos(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  update public.photos ph
  set position = o.idx - 1
  from unnest(p_ids) with ordinality as o(id, idx)
  where ph.id = o.id and ph.user_id = auth.uid();
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Onboarding
-- ─────────────────────────────────────────────────────────────────────────────

/** Validates the profile is complete enough to be matched, then marks it done. */
create or replace function public.complete_onboarding()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  p public.profiles%rowtype;
  pr public.preferences%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into p from public.profiles where id = v_uid;
  select * into pr from public.preferences where user_id = v_uid;

  if coalesce(p.first_name, '') = '' then raise exception 'missing_first_name'; end if;
  if p.class_year is null then raise exception 'missing_class_year'; end if;
  if not exists (select 1 from public.photos where user_id = v_uid) then
    raise exception 'missing_photo';
  end if;
  if cardinality(pr.areas) = 0 then raise exception 'missing_areas'; end if;
  if pr.move_in_date is null then raise exception 'missing_move_in'; end if;

  update public.profiles
  set onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = v_uid;
  return true;
end;
$$;

/** Preference fields other students may see (weights, dealbreakers, gender_pref stay private). */
create or replace function public.get_public_preferences(p_user uuid)
returns table (
  budget_min integer,
  budget_max integer,
  areas text[],
  move_in_date date,
  lease_length text,
  housing_type text,
  sleep_schedule smallint,
  cleanliness smallint,
  noise smallint,
  guests smallint,
  smoking text,
  drinking text,
  pets text,
  study text
)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.budget_min, pr.budget_max, pr.areas, pr.move_in_date, pr.lease_length, pr.housing_type,
         pr.sleep_schedule, pr.cleanliness, pr.noise, pr.guests, pr.smoking, pr.drinking, pr.pets, pr.study
  from public.preferences pr
  where pr.user_id = p_user and public.can_view_profile(auth.uid(), p_user);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Match feed (ranked, filtered, paginated)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_match_feed(
  p_sort         text default 'best',
  p_budget_min   integer default null,
  p_budget_max   integer default null,
  p_areas        text[] default null,
  p_move_in_from date default null,
  p_move_in_to   date default null,
  p_genders      text[] default null,
  p_years        text[] default null,
  p_search       text default null,
  p_saved_only   boolean default false,
  p_limit        integer default 20,
  p_offset       integer default 0
)
returns table (
  candidate_id   uuid,
  first_name     text,
  last_initial   text,
  pronouns       text,
  class_year     text,
  major          text,
  bio            text,
  avatar_path    text,
  avatar_placeholder text,
  photo_count    integer,
  verified       boolean,
  score          smallint,
  reasons        jsonb,
  watchouts      jsonb,
  shared_artists jsonb,
  budget_min     integer,
  budget_max     integer,
  areas          text[],
  move_in_date   date,
  housing_type   text,
  lease_length   text,
  is_saved       boolean,
  intro_status   text,
  joined_at      timestamptz,
  total_count    bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_search text := nullif(trim(p_search), '');
  v_pattern text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if v_search is not null then
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  select
    ms.candidate_id,
    p.first_name,
    p.last_initial,
    p.pronouns,
    p.class_year,
    p.major,
    p.bio,
    p.avatar_path,
    (select ph.placeholder from public.photos ph where ph.user_id = p.id order by ph.position limit 1),
    (select count(*)::integer from public.photos ph where ph.user_id = p.id),
    coalesce(p.student_verified_at > now() - interval '365 days', false),
    ms.score,
    ms.reasons,
    ms.watchouts,
    ms.shared_artists,
    pr.budget_min,
    pr.budget_max,
    pr.areas,
    pr.move_in_date,
    pr.housing_type,
    pr.lease_length,
    exists (select 1 from public.saves s where s.user_id = v_uid and s.target_id = p.id),
    (
      select i.status from public.intros i
      where i.status in ('pending', 'accepted')
        and ((i.sender_id = v_uid and i.recipient_id = p.id) or (i.sender_id = p.id and i.recipient_id = v_uid))
      limit 1
    ),
    p.created_at,
    count(*) over ()
  from public.match_scores ms
  join public.profiles p on p.id = ms.candidate_id
  join public.preferences pr on pr.user_id = ms.candidate_id
  where ms.viewer_id = v_uid
    and public.can_view_profile(v_uid, ms.candidate_id)
    and (p_budget_min is null or pr.budget_max >= p_budget_min)
    and (p_budget_max is null or pr.budget_min <= p_budget_max)
    and (p_areas is null or cardinality(p_areas) = 0 or pr.areas && p_areas)
    and (p_move_in_from is null or pr.move_in_date >= p_move_in_from)
    and (p_move_in_to is null or pr.move_in_date <= p_move_in_to)
    and (p_genders is null or cardinality(p_genders) = 0 or p.gender = any (p_genders))
    and (p_years is null or cardinality(p_years) = 0 or p.class_year = any (p_years))
    and (
      v_pattern is null
      or p.first_name ilike v_pattern
      or p.major ilike v_pattern
      or p.bio ilike v_pattern
    )
    and (not p_saved_only or exists (select 1 from public.saves s where s.user_id = v_uid and s.target_id = p.id))
  order by
    case when p_sort = 'best' then ms.score end desc nulls last,
    case when p_sort = 'newest' then p.created_at end desc nulls last,
    case when p_sort = 'move_in' then pr.move_in_date end asc nulls last,
    case when p_sort = 'budget' then pr.budget_min end asc nulls last,
    ms.score desc,
    ms.candidate_id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Intros — the only way a direct conversation can start
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.send_intro(p_recipient uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.can_contact(v_uid, p_recipient) then raise exception 'cannot_contact'; end if;

  if exists (
    select 1 from public.intros i
    where i.status in ('pending', 'accepted')
      and least(i.sender_id, i.recipient_id) = least(v_uid, p_recipient)
      and greatest(i.sender_id, i.recipient_id) = greatest(v_uid, p_recipient)
  ) then
    raise exception 'intro_exists';
  end if;

  if exists (
    select 1 from public.intros i
    where i.sender_id = v_uid and i.recipient_id = p_recipient
      and i.status = 'declined' and i.responded_at > now() - interval '30 days'
  ) then
    raise exception 'recently_declined';
  end if;

  insert into public.intros (sender_id, recipient_id, message)
  values (v_uid, p_recipient, p_message)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.accept_intro(p_intro_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_intro public.intros%rowtype;
  v_conversation uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_intro from public.intros where id = p_intro_id for update;
  if v_intro.id is null or v_intro.recipient_id <> v_uid then raise exception 'not_found'; end if;
  if v_intro.status <> 'pending' then raise exception 'not_pending'; end if;
  if public.is_blocked(v_intro.sender_id, v_intro.recipient_id) then raise exception 'cannot_contact'; end if;

  insert into public.conversations (kind) values ('direct') returning id into v_conversation;
  insert into public.conversation_members (conversation_id, user_id, last_read_at)
  values (v_conversation, v_intro.sender_id, now()), (v_conversation, v_intro.recipient_id, now());

  -- The intro itself becomes the first message, so the thread starts with context.
  insert into public.messages (conversation_id, sender_id, kind, body, created_at)
  values (v_conversation, v_intro.sender_id, 'text', v_intro.message, v_intro.created_at);

  update public.intros
  set status = 'accepted', responded_at = now(), conversation_id = v_conversation
  where id = p_intro_id;

  return v_conversation;
end;
$$;

create or replace function public.decline_intro(p_intro_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.intros
  set status = 'declined', responded_at = now()
  where id = p_intro_id and recipient_id = auth.uid() and status = 'pending';
  if not found then raise exception 'not_found'; end if;
end;
$$;

create or replace function public.withdraw_intro(p_intro_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.intros
  set status = 'withdrawn', responded_at = now()
  where id = p_intro_id and sender_id = auth.uid() and status = 'pending';
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Messaging
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.on_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_group_name text;
  v_sender_name text;
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = left(new.body, 140),
      last_message_sender_id = new.sender_id
  where id = new.conversation_id
    and (last_message_at is null or last_message_at <= new.created_at);

  if new.kind <> 'text' or new.sender_id is null then
    return new;
  end if;

  -- Sending implies you've read everything up to your own message.
  update public.conversation_members
  set last_read_at = greatest(last_read_at, new.created_at)
  where conversation_id = new.conversation_id and user_id = new.sender_id;

  select c.kind, g.name into v_kind, v_group_name
  from public.conversations c left join public.groups g on g.id = c.group_id
  where c.id = new.conversation_id;
  v_sender_name := public.first_name_of(new.sender_id);

  -- One live notification per conversation for each recipient, refreshed in place.
  insert into public.notifications (user_id, type, actor_id, entity_id, title, body, href)
  select
    m.user_id,
    'message',
    new.sender_id,
    new.conversation_id,
    case when v_kind = 'group' then v_sender_name || ' in ' || v_group_name else v_sender_name end,
    left(new.body, 140),
    '/messages/' || new.conversation_id
  from public.conversation_members m
  join public.user_settings us on us.user_id = m.user_id
  where m.conversation_id = new.conversation_id
    and m.user_id <> new.sender_id
    and us.notify_inapp_messages
  on conflict (user_id, type, entity_id) where read_at is null and entity_id is not null
  do update set
    actor_id = excluded.actor_id,
    title = excluded.title,
    body = excluded.body,
    created_at = now();

  return new;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.on_message_inserted();

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();

  update public.notifications
  set read_at = now()
  where user_id = auth.uid() and type = 'message' and entity_id = p_conversation_id and read_at is null;
end;
$$;

create or replace function public.unread_counts()
returns table (conversation_id uuid, unread integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.conversation_id, count(msg.id)::integer
  from public.conversation_members m
  join public.messages msg
    on msg.conversation_id = m.conversation_id
   and msg.created_at > m.last_read_at
   and msg.sender_id is distinct from m.user_id
   and msg.kind = 'text'
  where m.user_id = auth.uid()
  group by m.conversation_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Groups
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.create_group(p_name text, p_target_size integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_group uuid;
  v_conversation uuid;
  v_school text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.group_members where user_id = v_uid) then
    raise exception 'already_in_group';
  end if;
  select school_id into v_school from public.profiles
  where id = v_uid and onboarding_completed_at is not null and banned_at is null;
  if v_school is null then raise exception 'onboarding_required'; end if;

  insert into public.groups (school_id, name, owner_id, target_size)
  values (v_school, trim(p_name), v_uid, p_target_size)
  returning id into v_group;
  insert into public.group_members (group_id, user_id, role) values (v_group, v_uid, 'owner');

  insert into public.conversations (kind, group_id) values ('group', v_group) returning id into v_conversation;
  insert into public.conversation_members (conversation_id, user_id) values (v_conversation, v_uid);
  insert into public.messages (conversation_id, kind, body)
  values (v_conversation, 'system', public.first_name_of(v_uid) || ' started ' || trim(p_name));

  -- A brand-new group cancels the creator's outstanding invitations elsewhere.
  update public.group_requests set status = 'cancelled', responded_at = now()
  where user_id = v_uid and status = 'pending';

  return v_group;
end;
$$;

create or replace function public.invite_to_group(p_group_id uuid, p_user uuid, p_message text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if not public.is_group_member(p_group_id, v_uid) then raise exception 'not_member'; end if;
  if (select status from public.groups where id = p_group_id) <> 'open' then raise exception 'group_full'; end if;
  if exists (select 1 from public.group_members where user_id = p_user) then raise exception 'already_in_group'; end if;
  if not public.can_contact(v_uid, p_user) then raise exception 'cannot_contact'; end if;

  insert into public.group_requests (group_id, user_id, created_by, kind, message)
  values (p_group_id, p_user, v_uid, 'invite', nullif(trim(p_message), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.request_to_join_group(p_group_id uuid, p_message text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.group_members where user_id = v_uid) then raise exception 'already_in_group'; end if;
  select owner_id into v_owner from public.groups where id = p_group_id and status = 'open';
  if v_owner is null then raise exception 'group_full'; end if;
  if not public.can_contact(v_uid, v_owner) then raise exception 'cannot_contact'; end if;

  insert into public.group_requests (group_id, user_id, created_by, kind, message)
  values (p_group_id, v_uid, v_uid, 'request', nullif(trim(p_message), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.respond_group_request(p_request_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  r public.group_requests%rowtype;
  v_group public.groups%rowtype;
  v_conversation uuid;
  v_count integer;
begin
  select * into r from public.group_requests where id = p_request_id for update;
  if r.id is null or r.status <> 'pending' then raise exception 'not_found'; end if;

  -- Invites are answered by the invitee; join requests by any member of the group.
  if (r.kind = 'invite' and r.user_id <> v_uid)
     or (r.kind = 'request' and not public.is_group_member(r.group_id, v_uid)) then
    raise exception 'not_allowed';
  end if;

  if not p_accept then
    update public.group_requests set status = 'declined', responded_at = now() where id = r.id;
    return r.group_id;
  end if;

  select * into v_group from public.groups where id = r.group_id for update;
  select count(*) into v_count from public.group_members where group_id = r.group_id;
  if v_group.status <> 'open' or v_count >= v_group.target_size then raise exception 'group_full'; end if;
  if exists (select 1 from public.group_members where user_id = r.user_id) then raise exception 'already_in_group'; end if;

  insert into public.group_members (group_id, user_id) values (r.group_id, r.user_id);
  update public.group_requests set status = 'accepted', responded_at = now() where id = r.id;
  update public.group_requests set status = 'cancelled', responded_at = now()
  where user_id = r.user_id and status = 'pending' and id <> r.id;

  select id into v_conversation from public.conversations where group_id = r.group_id;
  insert into public.conversation_members (conversation_id, user_id) values (v_conversation, r.user_id)
  on conflict do nothing;
  insert into public.messages (conversation_id, kind, body)
  values (v_conversation, 'system', public.first_name_of(r.user_id) || ' joined the group');

  if v_count + 1 >= v_group.target_size then
    update public.groups set status = 'full' where id = r.group_id;
    update public.group_requests set status = 'cancelled', responded_at = now()
    where group_id = r.group_id and status = 'pending';
  end if;

  return r.group_id;
end;
$$;

create or replace function public.cancel_group_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.group_requests
  set status = 'cancelled', responded_at = now()
  where id = p_request_id and status = 'pending' and created_by = auth.uid();
  if not found then raise exception 'not_found'; end if;
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_conversation uuid;
  v_next_owner uuid;
begin
  if not public.is_group_member(p_group_id, v_uid) then raise exception 'not_member'; end if;

  delete from public.group_members where group_id = p_group_id and user_id = v_uid;

  if not exists (select 1 from public.group_members where group_id = p_group_id) then
    delete from public.groups where id = p_group_id; -- cascades to the group conversation
    return;
  end if;

  select id into v_conversation from public.conversations where group_id = p_group_id;
  delete from public.conversation_members where conversation_id = v_conversation and user_id = v_uid;
  insert into public.messages (conversation_id, kind, body)
  values (v_conversation, 'system', public.first_name_of(v_uid) || ' left the group');

  if (select owner_id from public.groups where id = p_group_id) = v_uid then
    select user_id into v_next_owner from public.group_members
    where group_id = p_group_id order by joined_at limit 1;
    update public.group_members set role = 'owner' where group_id = p_group_id and user_id = v_next_owner;
    update public.groups set owner_id = v_next_owner where id = p_group_id;
  end if;

  update public.groups set status = 'open' where id = p_group_id;
end;
$$;

/**
 * People who fit an open group: everyone with a stored score against *every*
 * member (i.e. who passes all members' dealbreakers), ranked by the mean score.
 */
create or replace function public.group_candidates(p_group_id uuid, p_limit integer default 20, p_offset integer default 0)
returns table (
  candidate_id  uuid,
  first_name    text,
  last_initial  text,
  class_year    text,
  major         text,
  avatar_path   text,
  avatar_placeholder text,
  group_score   integer,
  min_score     integer,
  member_scores jsonb,
  budget_min    integer,
  budget_max    integer,
  move_in_date  date,
  pending_kind  text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_members integer;
begin
  if not public.is_group_member(p_group_id, v_uid) then raise exception 'not_member'; end if;
  select count(*) into v_members from public.group_members where group_id = p_group_id;

  return query
  with scored as (
    select ms.candidate_id,
           round(avg(ms.score))::integer as group_score,
           min(ms.score)::integer as min_score,
           jsonb_agg(jsonb_build_object('member_id', ms.viewer_id, 'score', ms.score) order by ms.score desc) as member_scores,
           count(*) as n
    from public.match_scores ms
    join public.group_members gm on gm.user_id = ms.viewer_id and gm.group_id = p_group_id
    group by ms.candidate_id
  )
  select s.candidate_id, p.first_name, p.last_initial, p.class_year, p.major, p.avatar_path,
         (select ph.placeholder from public.photos ph where ph.user_id = p.id order by ph.position limit 1),
         s.group_score, s.min_score, s.member_scores,
         pr.budget_min, pr.budget_max, pr.move_in_date,
         (select gr.kind from public.group_requests gr
          where gr.group_id = p_group_id and gr.user_id = s.candidate_id and gr.status = 'pending' limit 1)
  from scored s
  join public.profiles p on p.id = s.candidate_id
  join public.preferences pr on pr.user_id = s.candidate_id
  where s.n = v_members
    and not exists (select 1 from public.group_members gm2 where gm2.user_id = s.candidate_id)
    and public.can_view_profile(v_uid, s.candidate_id)
  order by s.group_score desc, s.min_score desc, s.candidate_id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
end;
$$;

/** Open groups (not your own) whose every member is a mutual match with you. */
create or replace function public.groups_for_me(p_limit integer default 10)
returns table (
  group_id     uuid,
  name         text,
  target_size  integer,
  member_count integer,
  group_score  integer,
  min_score    integer,
  members      jsonb,
  pending      boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.group_members where user_id = v_uid) then return; end if;

  return query
  select g.id, g.name, g.target_size::integer,
         count(gm.user_id)::integer,
         round(avg(ms.score))::integer,
         min(ms.score)::integer,
         jsonb_agg(jsonb_build_object(
           'id', p.id, 'first_name', p.first_name, 'last_initial', p.last_initial,
           'avatar_path', p.avatar_path, 'score', ms.score
         ) order by gm.joined_at),
         exists (select 1 from public.group_requests gr
                 where gr.group_id = g.id and gr.user_id = v_uid and gr.status = 'pending')
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  join public.profiles p on p.id = gm.user_id
  left join public.match_scores ms on ms.viewer_id = v_uid and ms.candidate_id = gm.user_id
  where g.status = 'open'
    and g.school_id = (select school_id from public.profiles where id = v_uid)
  group by g.id
  having count(ms.candidate_id) = count(gm.user_id)
     and bool_and(public.can_view_profile(v_uid, gm.user_id))
  order by round(avg(ms.score)) desc
  limit least(greatest(p_limit, 1), 30);
end;
$$;

/** Every pair score inside a group (members can't read each other's rows directly). */
create or replace function public.group_pair_scores(p_group_id uuid)
returns table (a uuid, b uuid, score smallint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_group_member(p_group_id, auth.uid()) then raise exception 'not_member'; end if;
  return query
  select ms.viewer_id, ms.candidate_id, ms.score
  from public.match_scores ms
  join public.group_members ga on ga.user_id = ms.viewer_id and ga.group_id = p_group_id
  join public.group_members gb on gb.user_id = ms.candidate_id and gb.group_id = p_group_id
  where ms.viewer_id < ms.candidate_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- In-app notifications for intros and groups (created atomically by triggers)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.on_intro_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, actor_id, entity_id, title, body, href)
    select new.recipient_id, 'intro_received', new.sender_id, new.id,
           public.first_name_of(new.sender_id) || ' sent you an intro',
           left(new.message, 140), '/messages?tab=requests'
    from public.user_settings us
    where us.user_id = new.recipient_id and us.notify_inapp_intros;
  elsif new.status = 'accepted' and old.status = 'pending' then
    insert into public.notifications (user_id, type, actor_id, entity_id, title, body, href)
    select new.sender_id, 'intro_accepted', new.recipient_id, new.id,
           public.first_name_of(new.recipient_id) || ' accepted your intro',
           'Your chat is open — say hi.', '/messages/' || new.conversation_id
    from public.user_settings us
    where us.user_id = new.sender_id and us.notify_inapp_intros;
    update public.notifications set read_at = now()
    where entity_id = new.id and type = 'intro_received' and read_at is null;
  elsif new.status in ('declined', 'withdrawn') and old.status = 'pending' then
    update public.notifications set read_at = now()
    where entity_id = new.id and type = 'intro_received' and read_at is null;
  end if;
  return new;
end;
$$;

create trigger intros_notify
  after insert or update of status on public.intros
  for each row execute function public.on_intro_changed();

create or replace function public.on_group_request_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_name text;
begin
  select name into v_group_name from public.groups where id = new.group_id;

  if tg_op = 'INSERT' and new.kind = 'invite' then
    insert into public.notifications (user_id, type, actor_id, entity_id, title, body, href)
    select new.user_id, 'group_invite', new.created_by, new.id,
           public.first_name_of(new.created_by) || ' invited you to ' || v_group_name,
           coalesce(left(new.message, 140), 'Join their group to match on bigger places together.'),
           '/messages?tab=requests'
    from public.user_settings us
    where us.user_id = new.user_id and us.notify_inapp_groups;
  elsif tg_op = 'INSERT' and new.kind = 'request' then
    insert into public.notifications (user_id, type, actor_id, entity_id, title, body, href)
    select gm.user_id, 'group_request', new.user_id, new.id,
           public.first_name_of(new.user_id) || ' wants to join ' || v_group_name,
           coalesce(left(new.message, 140), 'See how they fit with everyone.'),
           '/groups/' || new.group_id
    from public.group_members gm
    join public.user_settings us on us.user_id = gm.user_id and us.notify_inapp_groups
    where gm.group_id = new.group_id;
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' then
    insert into public.notifications (user_id, type, actor_id, entity_id, title, body, href)
    select gm.user_id, 'group_joined', new.user_id, new.id,
           public.first_name_of(new.user_id) || ' joined ' || v_group_name,
           'Say hi in the group chat.', '/groups/' || new.group_id
    from public.group_members gm
    join public.user_settings us on us.user_id = gm.user_id and us.notify_inapp_groups
    where gm.group_id = new.group_id and gm.user_id <> new.user_id;
  end if;

  if tg_op = 'UPDATE' and new.status <> 'pending' and old.status = 'pending' then
    update public.notifications set read_at = now()
    where entity_id = new.id and type in ('group_invite', 'group_request') and read_at is null;
  end if;
  return new;
end;
$$;

create trigger group_requests_notify
  after insert or update of status on public.group_requests
  for each row execute function public.on_group_request_changed();

-- ─────────────────────────────────────────────────────────────────────────────
-- Rate limiting (fixed window, Postgres-backed so it works on serverless)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_max;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Match maintenance (service role only)
-- ─────────────────────────────────────────────────────────────────────────────

/** After a recompute, drop pairs involving p_user that no longer pass hard filters. */
create or replace function public.prune_match_scores(p_user uuid, p_keep uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.match_scores where viewer_id = p_user and not (candidate_id = any (p_keep));
  delete from public.match_scores where candidate_id = p_user and not (viewer_id = any (p_keep));
$$;

/** Users whose preferences changed after their scores were last computed (repair job). */
create or replace function public.stale_match_users(p_limit integer default 200)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  join public.preferences pr on pr.user_id = p.id
  where p.onboarding_completed_at is not null
    and p.banned_at is null
    and coalesce(
      (select max(ms.computed_at) from public.match_scores ms where ms.viewer_id = p.id),
      '-infinity'::timestamptz
    ) < greatest(pr.updated_at, p.onboarding_completed_at)
  limit p_limit;
$$;
