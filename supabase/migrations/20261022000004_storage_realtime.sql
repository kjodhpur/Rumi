-- Rumi storage bucket + Realtime configuration.

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: profile photos
-- Public read through unguessable paths ({user_id}/{uuid}.jpg); writes are
-- limited to the caller's own folder. Size and type are enforced by the bucket.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "photos: owners read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: owners upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: owners update own files" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos: owners delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime
-- postgres_changes (RLS-filtered per subscriber): messages, read markers,
-- notifications, intros, group requests.
-- ─────────────────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table
  public.messages,
  public.conversation_members,
  public.notifications,
  public.intros,
  public.group_requests;

-- Private broadcast + presence channels for typing indicators and "online now".
-- Topic: conversation:<uuid>. Only members of that conversation may join or send.
create policy "conversation members receive realtime" on realtime.messages
  for select to authenticated
  using (
    realtime.topic() like 'conversation:%'
    and public.is_conversation_member(substring(realtime.topic() from 14)::uuid, auth.uid())
  );

create policy "conversation members send realtime" on realtime.messages
  for insert to authenticated
  with check (
    realtime.topic() like 'conversation:%'
    and public.is_conversation_member(substring(realtime.topic() from 14)::uuid, auth.uid())
  );
