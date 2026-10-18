-- Rumi: initial schema, RLS, indexes, ASU email enforcement

create extension if not exists "pgcrypto";

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null default '',
  last_initial text not null default '',
  photo_url text,
  pronouns text,
  year text,
  major text,
  campus text,
  bio text not null default '',
  instagram text,
  own_gender text,
  show_gender_publicly boolean not null default false,
  onboarding_complete boolean not null default false,
  onboarding_step int not null default 0,
  paused boolean not null default false,
  suspended boolean not null default false,
  is_seed boolean not null default false,
  verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asu_email check (lower(email) like '%@asu.edu')
);

create table public.housing_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  looking_for text not null default 'either',
  budget_min int not null default 600,
  budget_max int not null default 1200,
  preferred_areas text[] not null default '{}',
  move_in_term text not null default 'Fall 2027',
  lease_length text not null default 'flexible',
  roommates_wanted text not null default '1',
  place_status text not null default 'needs-place'
);

create table public.lifestyle_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  sleep_schedule int not null default 3 check (sleep_schedule between 1 and 5),
  cleanliness int not null default 3 check (cleanliness between 1 and 5),
  guests int not null default 3 check (guests between 1 and 5),
  noise_tolerance int not null default 3 check (noise_tolerance between 1 and 5),
  social_level int not null default 3 check (social_level between 1 and 5),
  study_at_home int not null default 3 check (study_at_home between 1 and 5),
  cooking_sharing int not null default 3 check (cooking_sharing between 1 and 5),
  smoking text not null default 'no',
  drinking text not null default 'socially',
  pets text not null default 'ok-with-pets',
  gender_preference text not null default 'no-preference',
  dealbreakers text[] not null default '{}',
  weights jsonb not null default '{}'::jsonb
);

create table public.spotify_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  spotify_user_id text,
  access_token_enc text not null,
  refresh_token_enc text not null,
  token_expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

create table public.spotify_top_artists (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  artist_id text not null,
  name text not null,
  image_url text,
  rank int not null,
  unique (user_id, artist_id)
);

create table public.spotify_genres (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  genre text not null,
  count int not null default 1,
  unique (user_id, genre)
);

create table public.spotify_top_tracks (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id text not null,
  name text,
  rank int not null,
  unique (user_id, track_id)
);

create table public.saved_profiles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  saved_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, saved_id),
  check (user_id <> saved_id)
);

create table public.hidden_profiles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  hidden_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, hidden_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.match_cache (
  user_id uuid not null references public.profiles(id) on delete cascade,
  other_id uuid not null references public.profiles(id) on delete cascade,
  score numeric not null,
  breakdown jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  primary key (user_id, other_id)
);

create table public.events (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.conversation_starts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (timezone('utc', now()))::date,
  count int not null default 0,
  primary key (user_id, day)
);

-- Indexes
create index profiles_complete_idx on public.profiles (onboarding_complete, paused, suspended)
  where onboarding_complete and not paused and not suspended;
create index housing_budget_idx on public.housing_prefs (budget_min, budget_max);
create index housing_move_in_idx on public.housing_prefs (move_in_term);
create index housing_areas_idx on public.housing_prefs using gin (preferred_areas);
create index match_cache_score_idx on public.match_cache (user_id, score desc);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index events_name_idx on public.events (event_name, created_at);
create index blocks_blocked_idx on public.blocks (blocked_id);
create index spotify_artists_user_idx on public.spotify_top_artists (user_id);

-- Auto-create profile on signup; enforce ASU email
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if lower(new.email) not like '%@asu.edu' then
    raise exception 'Only @asu.edu emails are allowed on Rumi';
  end if;
  insert into public.profiles (id, email)
  values (new.id, lower(new.email));
  insert into public.housing_prefs (user_id) values (new.id);
  insert into public.lifestyle_prefs (user_id) values (new.id);
  insert into public.events (user_id, event_name) values (new.id, 'signup');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Storage bucket for profile photos (run via dashboard or storage API if needed)
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.housing_prefs enable row level security;
alter table public.lifestyle_prefs enable row level security;
alter table public.spotify_connections enable row level security;
alter table public.spotify_top_artists enable row level security;
alter table public.spotify_genres enable row level security;
alter table public.spotify_top_tracks enable row level security;
alter table public.saved_profiles enable row level security;
alter table public.hidden_profiles enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.match_cache enable row level security;
alter table public.events enable row level security;
alter table public.conversation_starts enable row level security;

-- Helper: is blocked either direction
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.is_participant(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = cid and user_id = uid
  );
$$;

-- Profiles: own full access; others only if complete, unpaused, unsuspended, not blocked
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_select_public on public.profiles
  for select using (
    onboarding_complete
    and not paused
    and not suspended
    and auth.uid() is not null
    and not public.is_blocked(auth.uid(), id)
  );

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = id);

-- Housing / lifestyle: own read/write; others readable if profile visible
create policy housing_own on public.housing_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy housing_read_visible on public.housing_prefs
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id
        and p.onboarding_complete and not p.paused and not p.suspended
        and not public.is_blocked(auth.uid(), p.id)
    )
  );

create policy lifestyle_own on public.lifestyle_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy lifestyle_read_visible on public.lifestyle_prefs
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id
        and p.onboarding_complete and not p.paused and not p.suspended
        and not public.is_blocked(auth.uid(), p.id)
    )
  );

-- Spotify: tokens only own; artists/genres readable when profile visible
create policy spotify_conn_own on public.spotify_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy spotify_artists_own on public.spotify_top_artists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy spotify_artists_read on public.spotify_top_artists
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id and p.onboarding_complete and not p.paused and not p.suspended
        and not public.is_blocked(auth.uid(), p.id)
    )
  );

create policy spotify_genres_own on public.spotify_genres
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy spotify_genres_read on public.spotify_genres
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = user_id and p.onboarding_complete and not p.paused and not p.suspended
        and not public.is_blocked(auth.uid(), p.id)
    )
  );

create policy spotify_tracks_own on public.spotify_top_tracks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy saved_own on public.saved_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy hidden_own on public.hidden_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy blocks_own on public.blocks
  for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

create policy reports_insert on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy reports_select_own on public.reports
  for select using (auth.uid() = reporter_id);

create policy conv_select on public.conversations
  for select using (public.is_participant(id, auth.uid()));

create policy conv_insert on public.conversations
  for insert with check (true);

create policy conv_part_select on public.conversation_participants
  for select using (public.is_participant(conversation_id, auth.uid()));

create policy conv_part_insert on public.conversation_participants
  for insert with check (auth.uid() = user_id or public.is_participant(conversation_id, auth.uid()));

create policy conv_part_update on public.conversation_participants
  for update using (auth.uid() = user_id);

create policy messages_select on public.messages
  for select using (public.is_participant(conversation_id, auth.uid()));

create policy messages_insert on public.messages
  for insert with check (
    auth.uid() = sender_id
    and public.is_participant(conversation_id, auth.uid())
  );

create policy match_cache_own on public.match_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy events_insert on public.events
  for insert with check (auth.uid() = user_id or user_id is null);

create policy events_select_own on public.events
  for select using (auth.uid() = user_id);

create policy conv_starts_own on public.conversation_starts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage policies for profile photos
create policy "Public read profile photos"
  on storage.objects for select using (bucket_id = 'profile-photos');

create policy "Users upload own profile photos"
  on storage.objects for insert with check (
    bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own profile photos"
  on storage.objects for update using (
    bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own profile photos"
  on storage.objects for delete using (
    bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]
  );
