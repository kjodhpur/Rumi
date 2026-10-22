-- Rumi schema: tables, constraints and indexes.
-- Row Level Security is enabled on every table in 20261022000003_security.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- Schools & areas — configurable campuses (ASU at launch)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.schools (
  id            text primary key check (id ~ '^[a-z0-9-]{2,32}$'),
  name          text not null,
  short_name    text not null,
  email_domains text[] not null check (cardinality(email_domains) > 0),
  timezone      text not null default 'America/Phoenix',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.areas (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id) on delete cascade,
  slug        text not null check (slug ~ '^[a-z0-9-]{2,48}$'),
  name        text not null,
  description text not null default '',
  sort_order  smallint not null default 0,
  unique (school_id, slug)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles — public-safe fields only. Private fields live in user_settings.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  school_id               text not null references public.schools (id),
  first_name              text not null default '' check (char_length(first_name) <= 40),
  last_initial            text not null default '' check (char_length(last_initial) <= 1),
  pronouns                text check (char_length(pronouns) <= 24),
  gender                  text check (gender in ('woman', 'man', 'nonbinary', 'other', 'undisclosed')),
  class_year              text check (class_year in ('freshman', 'sophomore', 'junior', 'senior', 'grad')),
  major                   text check (char_length(major) <= 80),
  bio                     text not null default '' check (char_length(bio) <= 500),
  avatar_path             text,
  is_hidden               boolean not null default false,
  verified_only           boolean not null default true,
  student_verified_at     timestamptz,
  onboarding_step         smallint not null default 0 check (onboarding_step between 0 and 20),
  onboarding_completed_at timestamptz,
  banned_at               timestamptz,
  ban_reason              text,
  is_seed                 boolean not null default false,
  last_active_at          timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index profiles_school_active_idx on public.profiles (school_id)
  where onboarding_completed_at is not null and banned_at is null;

create table public.user_settings (
  user_id                uuid primary key references public.profiles (id) on delete cascade,
  email                  text not null,
  last_name              text not null default '' check (char_length(last_name) <= 60),
  theme                  text not null default 'system' check (theme in ('system', 'light', 'dark')),
  notify_inapp_intros    boolean not null default true,
  notify_inapp_messages  boolean not null default true,
  notify_inapp_matches   boolean not null default true,
  notify_inapp_groups    boolean not null default true,
  notify_email_intros    boolean not null default true,
  notify_email_messages  boolean not null default true,
  notify_email_matches   boolean not null default true,
  notify_email_groups    boolean not null default true,
  last_digest_at         timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Photos & preferences
-- ─────────────────────────────────────────────────────────────────────────────

create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 200),
  position     smallint not null check (position between 0 and 5),
  width        integer check (width > 0),
  height       integer check (height > 0),
  placeholder  text check (char_length(placeholder) <= 3000),
  created_at   timestamptz not null default now(),
  constraint photos_user_position_key unique (user_id, position) deferrable initially deferred
);

create table public.preferences (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  -- housing
  budget_min     integer not null default 700 check (budget_min between 200 and 5000),
  budget_max     integer not null default 1200 check (budget_max between 200 and 6000),
  areas          text[] not null default '{}' check (cardinality(areas) <= 12),
  move_in_date   date,
  lease_length   text not null default 'academic_year'
                   check (lease_length in ('semester', 'academic_year', 'twelve_months', 'flexible')),
  housing_type   text not null default 'off_campus'
                   check (housing_type in ('on_campus', 'off_campus', 'either')),
  gender_pref    text[] not null default '{}'
                   check (gender_pref <@ array['woman', 'man', 'nonbinary', 'other']),
  -- lifestyle
  sleep_schedule smallint not null default 3 check (sleep_schedule between 1 and 5),
  cleanliness    smallint not null default 3 check (cleanliness between 1 and 5),
  noise          smallint not null default 3 check (noise between 1 and 5),
  guests         smallint not null default 3 check (guests between 1 and 5),
  smoking        text not null default 'never' check (smoking in ('never', 'sometimes', 'regularly')),
  drinking       text not null default 'socially' check (drinking in ('never', 'socially', 'often')),
  pets           text not null default 'none' check (pets in ('none', 'have', 'want')),
  study          text not null default 'mix' check (study in ('campus', 'home_quiet', 'home_social', 'mix')),
  -- matching controls
  dealbreakers   text[] not null default '{budget,area}'
                   check (dealbreakers <@ array[
                     'smoking', 'pets', 'drinking', 'guests', 'sleep', 'cleanliness',
                     'noise', 'budget', 'area', 'move_in', 'housing_type'
                   ]),
  weights        jsonb not null default '{}'::jsonb check (jsonb_typeof(weights) = 'object'),
  updated_at     timestamptz not null default now(),
  check (budget_min <= budget_max)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Music (optional Spotify)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.spotify_accounts (
  user_id           uuid primary key references public.profiles (id) on delete cascade,
  spotify_user_id   text not null,
  display_name      text,
  access_token_enc  text not null,
  refresh_token_enc text not null,
  expires_at        timestamptz not null,
  scopes            text not null default '',
  connected_at      timestamptz not null default now(),
  last_synced_at    timestamptz
);

create table public.music_profiles (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  top_artists jsonb not null default '[]'::jsonb check (jsonb_typeof(top_artists) = 'array'),
  top_genres  text[] not null default '{}',
  synced_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Matching
-- ─────────────────────────────────────────────────────────────────────────────

create table public.match_scores (
  viewer_id      uuid not null references public.profiles (id) on delete cascade,
  candidate_id   uuid not null references public.profiles (id) on delete cascade,
  score          smallint not null check (score between 0 and 100),
  reasons        jsonb not null default '[]'::jsonb,
  watchouts      jsonb not null default '[]'::jsonb,
  breakdown      jsonb not null default '[]'::jsonb,
  shared_artists jsonb not null default '[]'::jsonb,
  computed_at    timestamptz not null default now(),
  notified_at    timestamptz,
  primary key (viewer_id, candidate_id),
  check (viewer_id <> candidate_id)
);

create index match_scores_rank_idx on public.match_scores (viewer_id, score desc, candidate_id);
create index match_scores_candidate_idx on public.match_scores (candidate_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Social graph
-- ─────────────────────────────────────────────────────────────────────────────

create table public.saves (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  target_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id),
  check (user_id <> target_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Groups (2–4 people matching together for multi-bedroom places)
-- ─────────────────────────────────────────────────────────────────────────────

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  school_id   text not null references public.schools (id),
  name        text not null check (char_length(name) between 1 and 40),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  target_size smallint not null default 3 check (target_size between 2 and 4),
  status      text not null default 'open' check (status in ('open', 'full')),
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id),
  constraint group_members_one_group_per_user unique (user_id)
);

-- kind = 'invite':  a member invited user_id; user_id responds.
-- kind = 'request': user_id asked to join; any member responds.
create table public.group_requests (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('invite', 'request')),
  message      text check (char_length(message) <= 300),
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);

create unique index group_requests_one_pending_idx on public.group_requests (group_id, user_id)
  where status = 'pending';
create index group_requests_user_idx on public.group_requests (user_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Messaging — direct conversations unlock only through an accepted intro
-- ─────────────────────────────────────────────────────────────────────────────

create table public.conversations (
  id                     uuid primary key default gen_random_uuid(),
  kind                   text not null check (kind in ('direct', 'group')),
  group_id               uuid unique references public.groups (id) on delete cascade,
  created_at             timestamptz not null default now(),
  last_message_at        timestamptz,
  last_message_preview   text,
  last_message_sender_id uuid references public.profiles (id) on delete set null,
  check ((kind = 'group') = (group_id is not null))
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz not null default now(),
  last_emailed_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid references public.profiles (id) on delete cascade,
  kind            text not null default 'text' check (kind in ('text', 'system')),
  body            text not null check (char_length(body) between 1 and 2000),
  client_id       uuid,
  created_at      timestamptz not null default now(),
  check (kind = 'system' or sender_id is not null),
  unique (sender_id, client_id)
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table public.intros (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  recipient_id    uuid not null references public.profiles (id) on delete cascade,
  message         text not null check (char_length(message) between 1 and 500),
  status          text not null default 'pending'
                    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,
  check (sender_id <> recipient_id)
);

-- At most one open (pending or accepted) intro per pair, in either direction.
create unique index intros_open_pair_idx on public.intros (
  least(sender_id, recipient_id), greatest(sender_id, recipient_id)
) where status in ('pending', 'accepted');
create index intros_recipient_idx on public.intros (recipient_id, status, created_at desc);
create index intros_sender_idx on public.intros (sender_id, status, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications
-- ─────────────────────────────────────────────────────────────────────────────

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (type in (
               'intro_received', 'intro_accepted', 'message', 'strong_match',
               'group_invite', 'group_request', 'group_joined'
             )),
  actor_id   uuid references public.profiles (id) on delete cascade,
  entity_id  uuid,
  title      text not null check (char_length(title) <= 140),
  body       text not null default '' check (char_length(body) <= 280),
  href       text check (href like '/%'),
  read_at    timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
-- One live (unread) notification per conversation/entity, updated in place.
create unique index notifications_unread_entity_idx on public.notifications (user_id, type, entity_id)
  where read_at is null and entity_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Safety & operations
-- ─────────────────────────────────────────────────────────────────────────────

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid references public.profiles (id) on delete set null,
  reported_id     uuid not null references public.profiles (id) on delete cascade,
  reason          text not null check (reason in (
                    'fake', 'harassment', 'spam', 'scam', 'inappropriate', 'safety', 'other'
                  )),
  details         text check (char_length(details) <= 1000),
  context         jsonb not null default '{}'::jsonb,
  source          text not null default 'user' check (source in ('user', 'auto')),
  status          text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  resolution_note text check (char_length(resolution_note) <= 1000),
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reported_idx on public.reports (reported_id);

create table public.moderation_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  target_id  uuid references public.profiles (id) on delete set null,
  report_id  uuid references public.reports (id) on delete set null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key, window_start)
);
