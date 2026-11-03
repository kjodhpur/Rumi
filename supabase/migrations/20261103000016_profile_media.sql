-- Phase 7.8: optional video/voice intro (<= 30 s). See docs/phase-7-8.md.
-- Files live in the private intros-media bucket under the owner's folder. Nobody reads the
-- bucket directly: the server signs short-lived URLs for viewers who can see the profile.
-- Two reports hide a clip until a moderator reviews it; the owner can't un-hide it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('intros-media', 'intros-media', false, 20971520,
        array['video/mp4', 'video/webm', 'audio/mp4', 'audio/webm'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "intros-media: owners upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'intros-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "intros-media: owners delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'intros-media' and (storage.foldername(name))[1] = auth.uid()::text);

create table public.profile_media (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('video', 'audio')),
  path        text not null check (char_length(path) <= 200),
  mime_type   text not null check (mime_type in ('video/mp4', 'video/webm', 'audio/mp4', 'audio/webm')),
  size_bytes  integer not null check (size_bytes between 1 and 20971520),
  duration_s  integer not null check (duration_s between 1 and 30),
  transcript  text not null check (char_length(transcript) between 3 and 1000),
  status      text not null default 'active' check (status in ('active', 'hidden', 'removed')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  check (split_part(path, '/', 1) = user_id::text)
);

create table public.profile_media_reports (
  media_user_id uuid not null references public.profile_media (user_id) on delete cascade,
  reporter_id   uuid not null references public.profiles (id) on delete cascade,
  reason        text not null check (reason in ('inappropriate', 'harassment', 'spam', 'not_them', 'other')),
  created_at    timestamptz not null default now(),
  primary key (media_user_id, reporter_id)
);

alter table public.profile_media enable row level security;
alter table public.profile_media_reports enable row level security;

revoke all on public.profile_media, public.profile_media_reports from anon, authenticated;
grant select, delete on public.profile_media to authenticated;

create policy "profile_media: owner reads" on public.profile_media
  for select to authenticated using (user_id = auth.uid());
create policy "profile_media: viewers read active" on public.profile_media
  for select to authenticated using (status = 'active' and public.can_view_profile(auth.uid(), user_id));
create policy "profile_media: owner deletes" on public.profile_media
  for delete to authenticated using (user_id = auth.uid());

-- Report a clip. The second distinct report hides it pending review.
create or replace function public.report_profile_media(p_owner uuid, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  n integer;
begin
  if me is null or p_owner = me or not public.can_view_profile(me, p_owner) then
    raise exception 'not_found';
  end if;
  if not exists (select 1 from public.profile_media m where m.user_id = p_owner and m.status = 'active') then
    raise exception 'not_found';
  end if;
  insert into public.profile_media_reports (media_user_id, reporter_id, reason)
  values (p_owner, me, p_reason)
  on conflict do nothing;
  select count(*) into n from public.profile_media_reports r where r.media_user_id = p_owner;
  if n >= 2 then
    update public.profile_media set status = 'hidden' where user_id = p_owner and status = 'active';
    return 'hidden';
  end if;
  return 'reported';
end;
$$;

revoke execute on function public.report_profile_media(uuid, text) from public, anon;
grant execute on function public.report_profile_media(uuid, text) to authenticated;
