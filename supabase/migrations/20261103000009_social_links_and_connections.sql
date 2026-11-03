-- Phase 7.2 & 7.6: Social media links (Instagram, LinkedIn) & Peer Connections

create table public.social_links (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  platform          text not null check (platform in ('instagram', 'linkedin')),
  handle            text not null check (char_length(handle) between 1 and 60),
  verification_code text check (verification_code is null or char_length(verification_code) <= 30),
  verified_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, platform)
);

create index social_links_user_idx on public.social_links (user_id);

create table public.connections (
  id                uuid primary key default gen_random_uuid(),
  user_a            uuid not null references public.profiles (id) on delete cascade,
  user_b            uuid not null references public.profiles (id) on delete cascade,
  source            text not null default 'campus_peer' check (source in ('in_app', 'campus_peer', 'group', 'intro')),
  status            text not null default 'pending' check (status in ('pending', 'confirmed')),
  confirmed_at      timestamptz,
  created_at        timestamptz not null default now(),
  check (user_a <> user_b),
  unique (user_a, user_b)
);

create index connections_user_a_idx on public.connections (user_a, status);
create index connections_user_b_idx on public.connections (user_b, status);

alter table public.social_links enable row level security;
alter table public.connections enable row level security;

revoke all on public.social_links, public.connections from anon, authenticated;
grant select on public.social_links, public.connections to authenticated;
grant insert, update, delete on public.social_links to authenticated;
-- Connections are written only through request_connection / respond_connection below,
-- so nobody can insert a confirmed row or confirm their own request.
grant delete on public.connections to authenticated;

create policy "social_links: viewable if profile viewable" on public.social_links
  for select to authenticated using (
    user_id = auth.uid() or public.can_view_profile(auth.uid(), user_id)
  );

create policy "social_links: owner writes" on public.social_links
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "connections: member reads" on public.connections
  for select to authenticated using (
    user_a = auth.uid() or user_b = auth.uid()
  );

create policy "connections: member deletes" on public.connections
  for delete to authenticated using (
    user_a = auth.uid() or user_b = auth.uid()
  );

-- Ask someone you know to confirm the connection. Only people who can see each other's
-- profiles can connect; a reverse pending request is confirmed instead of duplicated.
create or replace function public.request_connection(p_target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  reverse_id uuid;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;
  if p_target is null or p_target = me or not public.can_view_profile(me, p_target) then
    raise exception 'not_found';
  end if;
  if exists (
    select 1 from public.connections c
    where (c.user_a = me and c.user_b = p_target) or (c.user_a = p_target and c.user_b = me and c.status = 'confirmed')
  ) then
    return 'exists';
  end if;
  select c.id into reverse_id from public.connections c
  where c.user_a = p_target and c.user_b = me and c.status = 'pending';
  if reverse_id is not null then
    update public.connections set status = 'confirmed', confirmed_at = now() where id = reverse_id;
    return 'confirmed';
  end if;
  insert into public.connections (user_a, user_b, source, status) values (me, p_target, 'campus_peer', 'pending');
  return 'requested';
end;
$$;

-- Only the person who was asked can confirm or decline.
create or replace function public.respond_connection(p_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  row_ public.connections%rowtype;
begin
  select * into row_ from public.connections c where c.id = p_id and c.user_b = me;
  if not found then
    raise exception 'not_found';
  end if;
  if row_.status <> 'pending' then
    return 'not_pending';
  end if;
  if p_accept then
    update public.connections set status = 'confirmed', confirmed_at = now() where id = p_id;
    return 'confirmed';
  end if;
  delete from public.connections where id = p_id;
  return 'declined';
end;
$$;

revoke execute on function public.request_connection(uuid) from public, anon;
revoke execute on function public.respond_connection(uuid, boolean) from public, anon;
grant execute on function public.request_connection(uuid) to authenticated;
grant execute on function public.respond_connection(uuid, boolean) to authenticated;

-- People both students know: accepted intros, shared groups and confirmed connections.
-- Everyone involved must have turned on social_verification; banned people and anyone
-- either student has blocked never count. Internal: callers go through the two functions below.
create or replace function public.mutual_people(p_viewer uuid, p_target uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with edges as (
    select i.sender_id as a, i.recipient_id as b from public.intros i where i.status = 'accepted'
    union
    select i.recipient_id, i.sender_id from public.intros i where i.status = 'accepted'
    union
    select x.user_id, y.user_id
    from public.group_members x
    join public.group_members y on y.group_id = x.group_id and y.user_id <> x.user_id
    union
    select c.user_a, c.user_b from public.connections c where c.status = 'confirmed'
    union
    select c.user_b, c.user_a from public.connections c where c.status = 'confirmed'
  )
  select distinct mine.b
  from edges mine
  join edges theirs on theirs.b = mine.b and theirs.a = p_target
  join public.profiles p on p.id = mine.b
  where mine.a = p_viewer
    and p_viewer is not null
    and p_target is not null
    and p_viewer <> p_target
    and mine.b not in (p_viewer, p_target)
    and p.banned_at is null
    and not p.is_staff
    and public.has_consent(p_viewer, 'social_verification')
    and public.has_consent(p_target, 'social_verification')
    and public.has_consent(mine.b, 'social_verification')
    and not public.is_blocked(p_viewer, mine.b)
    and not public.is_blocked(p_target, mine.b);
$$;

revoke execute on function public.mutual_people(uuid, uuid) from public, anon, authenticated;

-- Up to 10 mutual connections (first name, initial, avatar) for a profile the viewer can see.
create or replace function public.mutual_connections_details(target_id uuid)
returns table (
  user_id uuid,
  first_name text,
  last_initial text,
  avatar_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.first_name, p.last_initial, p.avatar_path
  from public.mutual_people(auth.uid(), target_id) m
  join public.profiles p on p.id = m
  where public.can_view_profile(auth.uid(), target_id)
  order by p.first_name, p.id
  limit 10;
$$;

-- Replaces the 0007 count so it includes confirmed connections and the same exclusions.
create or replace function public.mutual_count(p_other uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.can_view_profile(auth.uid(), p_other) then 0
    else (select count(*)::integer from public.mutual_people(auth.uid(), p_other))
  end;
$$;

revoke execute on function public.mutual_connections_details(uuid) from public, anon;
grant execute on function public.mutual_connections_details(uuid) to authenticated;
revoke execute on function public.mutual_count(uuid) from public, anon;
grant execute on function public.mutual_count(uuid) to authenticated;
