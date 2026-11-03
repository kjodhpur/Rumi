-- Phase 7.8: Video/Voice Intro Clips & Private Storage

create table public.profile_media (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('video', 'audio')),
  path        text not null,
  duration_s  integer not null check (duration_s > 0 and duration_s <= 30),
  transcript  text not null check (char_length(transcript) between 3 and 1000),
  status      text not null default 'active' check (status in ('active', 'flagged', 'removed')),
  created_at  timestamptz not null default now(),
  unique (user_id)
);

create index profile_media_user_idx on public.profile_media (user_id);

-- Register private intros-media bucket if not present
insert into storage.buckets (id, name, public)
values ('intros-media', 'intros-media', false)
on conflict (id) do nothing;

alter table public.profile_media enable row level security;

revoke all on public.profile_media from anon, authenticated;

grant select, insert, update, delete on public.profile_media to authenticated;

-- Policies: profile_media
create policy "profile_media: owner all" on public.profile_media
  for all to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "profile_media: authorized verified students read active" on public.profile_media
  for select to authenticated using (
    status = 'active' and public.can_view_profile(user_id, auth.uid())
  );
