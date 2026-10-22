-- Rumi v2: schools, photos, intros, groups, notifications, mutuals/trust web (D8)

-- —— Schools ——
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  email_domains text[] not null default '{}',
  campuses text[] not null default '{}',
  preferred_areas text[] not null default '{}',
  move_in_terms text[] not null default '{}',
  brand_accent text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.schools (slug, name, email_domains, campuses, preferred_areas, move_in_terms)
values (
  'asu',
  'Arizona State University',
  array['asu.edu'],
  array['Tempe', 'Downtown Phoenix', 'Polytechnic', 'West Valley'],
  array['Tempe near campus', 'Tempe south', 'Mesa', 'Downtown Phoenix', 'Tooker House', 'Vertex', 'The Hyve', 'Union Tempe', 'Other'],
  array['Fall 2027', 'Spring 2027', 'Summer 2027', 'ASAP']
)
on conflict (slug) do nothing;

-- —— Profile column adds ——
alter table public.profiles
  add column if not exists school_id uuid references public.schools(id),
  add column if not exists hide_profile boolean not null default false,
  add column if not exists theme_preference text not null default 'system'
    check (theme_preference in ('light', 'dark', 'system')),
  add column if not exists show_social_links boolean not null default true;

update public.profiles p
set school_id = s.id
from public.schools s
where s.slug = 'asu' and p.school_id is null;

-- Soften ASU-only CHECK → school domain trigger
alter table public.profiles drop constraint if exists asu_email;

alter table public.housing_prefs
  add column if not exists move_in_date date;

-- —— Profile photos ——
create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, sort_order)
);

create index if not exists profile_photos_user_idx on public.profile_photos (user_id, sort_order);

-- Backfill primary photo from photo_url
insert into public.profile_photos (user_id, storage_path, sort_order)
select id, photo_url, 0
from public.profiles
where photo_url is not null and photo_url <> ''
on conflict (user_id, sort_order) do nothing;

-- —— Intros ——
create table if not exists public.intros (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_user_id <> to_user_id)
);

create unique index if not exists intros_pending_pair_idx
  on public.intros (least(from_user_id, to_user_id), greatest(from_user_id, to_user_id))
  where status = 'pending';

create index if not exists intros_to_pending_idx
  on public.intros (to_user_id, created_at desc)
  where status = 'pending';

create index if not exists intros_from_idx
  on public.intros (from_user_id, created_at desc);

alter table public.conversations
  add column if not exists intro_id uuid references public.intros(id) on delete set null;

-- —— Groups ——
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  school_id uuid references public.schools(id),
  status text not null default 'forming'
    check (status in ('forming', 'active', 'dissolved')),
  max_members int not null default 4 check (max_members between 2 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_housing_prefs (
  group_id uuid primary key references public.groups(id) on delete cascade,
  budget_min int not null default 600,
  budget_max int not null default 1200,
  preferred_areas text[] not null default '{}',
  move_in_date date,
  bedrooms_wanted int not null default 2
);

-- —— Notifications ——
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  href text,
  meta jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  in_app_intros boolean not null default true,
  in_app_messages boolean not null default true,
  in_app_matches boolean not null default true,
  email_intros boolean not null default true,
  email_messages boolean not null default true,
  email_matches boolean not null default false
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- —— Mutuals / trust web (D8) ——
create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null
    check (provider in ('instagram', 'linkedin', 'tiktok', 'x', 'other')),
  handle text not null,
  url text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.connection_edges (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  source text not null
    check (source in ('rumi_mutual', 'intro_accepted', 'group_mate', 'asserted_social', 'org')),
  strength int not null default 1 check (strength between 1 and 3),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b, source)
);

create index if not exists connection_edges_a_idx on public.connection_edges (user_a);
create index if not exists connection_edges_b_idx on public.connection_edges (user_b);

create table if not exists public.campus_orgs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  unique (school_id, name)
);

create table if not exists public.profile_orgs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.campus_orgs(id) on delete cascade,
  primary key (user_id, org_id)
);

-- Seed a few ASU orgs
insert into public.campus_orgs (school_id, name)
select s.id, o.name
from public.schools s
cross join (values
  ('Devils Advocate'),
  ('Sun Devil Fitness'),
  ('Engineering Student Council'),
  ('Greek Life'),
  ('Residence Hall Association'),
  ('Outing Club'),
  ('ASASU')
) as o(name)
where s.slug = 'asu'
on conflict (school_id, name) do nothing;

-- Match cache extras
alter table public.match_cache
  add column if not exists top_reasons text[],
  add column if not exists group_id uuid references public.groups(id) on delete cascade,
  add column if not exists mutual_count int not null default 0;

-- —— Signup: school domain instead of hard ASU check ——
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  domain text;
  school_row public.schools%rowtype;
begin
  domain := lower(split_part(new.email, '@', 2));
  select * into school_row
  from public.schools
  where active and domain = any (email_domains)
  limit 1;

  if school_row.id is null then
    -- Default ASU for backwards compat during launch; still reject non-.edu-ish if no school
    select * into school_row from public.schools where slug = 'asu' limit 1;
    if school_row.id is null or not (domain = any (school_row.email_domains)) then
      raise exception 'Email domain not allowed for any active school on Rumi';
    end if;
  end if;

  insert into public.profiles (id, email, school_id)
  values (new.id, lower(new.email), school_row.id);
  insert into public.housing_prefs (user_id) values (new.id);
  insert into public.lifestyle_prefs (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  insert into public.events (user_id, event_name) values (new.id, 'signup');
  return new;
end;
$$;

-- Canonical edge helper
create or replace function public.upsert_connection_edge(
  a uuid, b uuid, src text, str int default 1, meta_in jsonb default '{}'::jsonb
)
returns void language plpgsql security definer set search_path = public as $$
declare
  ua uuid;
  ub uuid;
begin
  if a = b then return; end if;
  if a < b then ua := a; ub := b; else ua := b; ub := a; end if;
  insert into public.connection_edges (user_a, user_b, source, strength, meta)
  values (ua, ub, src, str, meta_in)
  on conflict (user_a, user_b, source) do update
    set strength = greatest(public.connection_edges.strength, excluded.strength),
        meta = public.connection_edges.meta || excluded.meta;
end;
$$;

-- On intro accepted → connection edge
create or replace function public.on_intro_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    perform public.upsert_connection_edge(new.from_user_id, new.to_user_id, 'intro_accepted', 2);
  end if;
  return new;
end;
$$;

drop trigger if exists intros_accepted_edge on public.intros;
create trigger intros_accepted_edge
  after update on public.intros
  for each row execute function public.on_intro_accepted();

-- Groups updated_at
drop trigger if exists groups_updated_at on public.groups;
create trigger groups_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

-- —— RLS ——
alter table public.schools enable row level security;
alter table public.profile_photos enable row level security;
alter table public.intros enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_housing_prefs enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.social_links enable row level security;
alter table public.connection_edges enable row level security;
alter table public.campus_orgs enable row level security;
alter table public.profile_orgs enable row level security;

-- Schools: public read of active
drop policy if exists schools_select_active on public.schools;
create policy schools_select_active on public.schools
  for select using (active = true);

-- Profiles: also hide_profile + same school for public select
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
  for select using (
    onboarding_complete
    and not paused
    and not suspended
    and not hide_profile
    and auth.uid() is not null
    and not public.is_blocked(auth.uid(), id)
  );

-- Profile photos
drop policy if exists profile_photos_own on public.profile_photos;
create policy profile_photos_own on public.profile_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists profile_photos_read_visible on public.profile_photos;
create policy profile_photos_read_visible on public.profile_photos
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id
        and p.onboarding_complete and not p.paused and not p.suspended and not p.hide_profile
        and not public.is_blocked(auth.uid(), p.id)
    )
  );

-- Intros
drop policy if exists intros_select on public.intros;
create policy intros_select on public.intros
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists intros_insert on public.intros;
create policy intros_insert on public.intros
  for insert with check (auth.uid() = from_user_id);

drop policy if exists intros_update on public.intros;
create policy intros_update on public.intros
  for update using (
    auth.uid() = to_user_id
    or (auth.uid() = from_user_id and status = 'pending')
  );

-- Messages: only if linked intro accepted (or legacy conv without intro)
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    auth.uid() = sender_id
    and public.is_participant(conversation_id, auth.uid())
    and (
      exists (
        select 1 from public.conversations c
        left join public.intros i on i.id = c.intro_id
        where c.id = conversation_id
          and (c.intro_id is null or i.status = 'accepted')
      )
    )
  );

-- Groups
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups
  for insert with check (auth.uid() = created_by);

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid() and gm.role = 'owner'
    )
  );

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members
  for insert with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'owner'
    )
  );

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role = 'owner'
    )
  );

drop policy if exists group_housing_all on public.group_housing_prefs;
create policy group_housing_all on public.group_housing_prefs
  for all using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );

-- Notifications
drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists notif_prefs_own on public.notification_preferences;
create policy notif_prefs_own on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Social links
drop policy if exists social_links_own on public.social_links;
create policy social_links_own on public.social_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists social_links_read on public.social_links;
create policy social_links_read on public.social_links
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id
        and p.show_social_links
        and p.onboarding_complete and not p.paused and not p.suspended and not p.hide_profile
        and not public.is_blocked(auth.uid(), p.id)
    )
  );

-- Connection edges: readable if either endpoint is self or both visible
drop policy if exists connection_edges_select on public.connection_edges;
create policy connection_edges_select on public.connection_edges
  for select using (
    auth.uid() = user_a or auth.uid() = user_b
    or (
      not public.is_blocked(auth.uid(), user_a)
      and not public.is_blocked(auth.uid(), user_b)
    )
  );

drop policy if exists connection_edges_insert on public.connection_edges;
create policy connection_edges_insert on public.connection_edges
  for insert with check (auth.uid() = user_a or auth.uid() = user_b);

-- Campus orgs
drop policy if exists campus_orgs_select on public.campus_orgs;
create policy campus_orgs_select on public.campus_orgs
  for select using (true);

drop policy if exists profile_orgs_own on public.profile_orgs;
create policy profile_orgs_own on public.profile_orgs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists profile_orgs_read on public.profile_orgs;
create policy profile_orgs_read on public.profile_orgs
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id
        and p.onboarding_complete and not p.paused and not p.suspended and not p.hide_profile
        and not public.is_blocked(auth.uid(), p.id)
    )
  );

-- Backfill notification prefs for existing users
insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
