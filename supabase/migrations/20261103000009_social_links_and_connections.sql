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
grant insert, update, delete on public.connections to authenticated;

create policy "social_links: viewable if profile viewable" on public.social_links
  for select to authenticated using (
    user_id = auth.uid() or public.can_view_profile(user_id, auth.uid())
  );

create policy "social_links: owner writes" on public.social_links
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "connections: member reads" on public.connections
  for select to authenticated using (
    user_a = auth.uid() or user_b = auth.uid()
  );

create policy "connections: requester creates" on public.connections
  for insert to authenticated with check (
    user_a = auth.uid() and user_b <> auth.uid()
  );

create policy "connections: member updates" on public.connections
  for update to authenticated using (
    user_a = auth.uid() or user_b = auth.uid()
  );

create policy "connections: member deletes" on public.connections
  for delete to authenticated using (
    user_a = auth.uid() or user_b = auth.uid()
  );

-- Function to return mutual connections with avatars (strictly consent-gated)
create or replace function public.mutual_connections_details(target_id uuid)
returns table (
  user_id uuid,
  first_name text,
  last_initial text,
  avatar_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null or target_id is null or viewer_id = target_id then
    return;
  end if;

  -- Both students must have social_verification consent granted
  if not public.has_consent(viewer_id, 'social_verification')
     or not public.has_consent(target_id, 'social_verification') then
    return;
  end if;

  return query
  with viewer_peers as (
    -- In-app intros
    select case when i.sender_id = viewer_id then i.recipient_id else i.sender_id end as peer_id
    from public.intros i
    where i.status = 'accepted' and (i.sender_id = viewer_id or i.recipient_id = viewer_id)
    union
    -- Shared groups
    select gm2.user_id as peer_id
    from public.group_members gm1
    join public.group_members gm2 on gm2.group_id = gm1.group_id and gm2.user_id <> viewer_id
    where gm1.user_id = viewer_id
    union
    -- Confirmed peer connections
    select case when c.user_a = viewer_id then c.user_b else c.user_a end as peer_id
    from public.connections c
    where c.status = 'confirmed' and (c.user_a = viewer_id or c.user_b = viewer_id)
  ),
  target_peers as (
    select case when i.sender_id = target_id then i.recipient_id else i.sender_id end as peer_id
    from public.intros i
    where i.status = 'accepted' and (i.sender_id = target_id or i.recipient_id = target_id)
    union
    select gm2.user_id as peer_id
    from public.group_members gm1
    join public.group_members gm2 on gm2.group_id = gm1.group_id and gm2.user_id <> target_id
    where gm1.user_id = target_id
    union
    select case when c.user_a = target_id then c.user_b else c.user_a end as peer_id
    from public.connections c
    where c.status = 'confirmed' and (c.user_a = target_id or c.user_b = target_id)
  ),
  mutuals as (
    select vp.peer_id
    from viewer_peers vp
    join target_peers tp on tp.peer_id = vp.peer_id
    where vp.peer_id <> viewer_id and vp.peer_id <> target_id
  )
  select
    p.id as user_id,
    p.first_name,
    p.last_initial,
    p.avatar_path
  from mutuals m
  join public.profiles p on p.id = m.peer_id
  where public.has_consent(p.id, 'social_verification')
    and p.banned_at is null
  limit 10;
end;
$$;

revoke execute on function public.mutual_connections_details(uuid) from public, anon;
grant execute on function public.mutual_connections_details(uuid) to authenticated;
