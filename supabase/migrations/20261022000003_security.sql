-- Rumi security: RLS on every table, column-level write grants, function grants.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS everywhere
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.schools              enable row level security;
alter table public.areas                enable row level security;
alter table public.profiles             enable row level security;
alter table public.user_settings        enable row level security;
alter table public.admins               enable row level security;
alter table public.photos               enable row level security;
alter table public.preferences          enable row level security;
alter table public.spotify_accounts     enable row level security;
alter table public.music_profiles       enable row level security;
alter table public.match_scores         enable row level security;
alter table public.saves                enable row level security;
alter table public.blocks               enable row level security;
alter table public.groups               enable row level security;
alter table public.group_members        enable row level security;
alter table public.group_requests       enable row level security;
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.intros               enable row level security;
alter table public.notifications        enable row level security;
alter table public.reports              enable row level security;
alter table public.moderation_log       enable row level security;
alter table public.rate_limits          enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Baseline privileges: anon gets nothing but reference data; authenticated can
-- only write the columns granted below (RLS then decides which rows).
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
grant select on public.schools, public.areas to anon;

grant update (first_name, last_initial, pronouns, gender, class_year, major, bio,
              is_hidden, verified_only, onboarding_step, last_active_at)
  on public.profiles to authenticated;

grant update (last_name, theme,
              notify_inapp_intros, notify_inapp_messages, notify_inapp_matches, notify_inapp_groups,
              notify_email_intros, notify_email_messages, notify_email_matches, notify_email_groups)
  on public.user_settings to authenticated;

grant update (budget_min, budget_max, areas, move_in_date, lease_length, housing_type, gender_pref,
              sleep_schedule, cleanliness, noise, guests, smoking, drinking, pets, study,
              dealbreakers, weights)
  on public.preferences to authenticated;

grant insert, update (position, width, height, placeholder), delete on public.photos to authenticated;
grant insert, delete on public.saves to authenticated;
grant insert, delete on public.blocks to authenticated;
grant insert (conversation_id, sender_id, body, client_id) on public.messages to authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant insert (reporter_id, reported_id, reason, details, context) on public.reports to authenticated;
grant update (status, resolution_note, reviewed_by, reviewed_at) on public.reports to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Policies
-- ─────────────────────────────────────────────────────────────────────────────

create policy "schools are public" on public.schools
  for select to anon, authenticated using (active);

create policy "areas are public" on public.areas
  for select to anon, authenticated using (true);

-- profiles
create policy "profiles: visible per can_view_profile" on public.profiles
  for select to authenticated using (public.can_view_profile(auth.uid(), id));
create policy "profiles: owners update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- user_settings (private)
create policy "user_settings: owner reads" on public.user_settings
  for select to authenticated using (user_id = auth.uid());
create policy "user_settings: owner updates" on public.user_settings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- admins
create policy "admins: self lookup" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- photos
create policy "photos: visible with profile" on public.photos
  for select to authenticated using (public.can_view_profile(auth.uid(), user_id));
create policy "photos: owner inserts own files" on public.photos
  for insert to authenticated
  with check (user_id = auth.uid() and storage_path like auth.uid()::text || '/%');
create policy "photos: owner updates" on public.photos
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "photos: owner deletes" on public.photos
  for delete to authenticated using (user_id = auth.uid());

-- preferences (private; other students see a safe subset via get_public_preferences)
create policy "preferences: owner reads" on public.preferences
  for select to authenticated using (user_id = auth.uid());
create policy "preferences: owner updates" on public.preferences
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- spotify (tokens are encrypted at the app layer; writes are server-only)
create policy "spotify_accounts: owner reads" on public.spotify_accounts
  for select to authenticated using (user_id = auth.uid());
create policy "music_profiles: visible with profile" on public.music_profiles
  for select to authenticated using (public.can_view_profile(auth.uid(), user_id));

-- match scores (written by the server's recompute job only)
create policy "match_scores: viewer reads own" on public.match_scores
  for select to authenticated using (viewer_id = auth.uid());

-- saves & blocks
create policy "saves: owner reads" on public.saves
  for select to authenticated using (user_id = auth.uid());
create policy "saves: owner inserts" on public.saves
  for insert to authenticated with check (user_id = auth.uid() and public.can_view_profile(auth.uid(), target_id));
create policy "saves: owner deletes" on public.saves
  for delete to authenticated using (user_id = auth.uid());

create policy "blocks: owner reads" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "blocks: owner inserts" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "blocks: owner deletes" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- groups (mutations go through security-definer RPCs)
create policy "groups: members read" on public.groups
  for select to authenticated using (
    public.is_group_member(id, auth.uid())
    or exists (
      select 1 from public.group_requests gr
      where gr.group_id = id and gr.user_id = auth.uid() and gr.status = 'pending'
    )
  );
create policy "group_members: members read" on public.group_members
  for select to authenticated using (
    public.is_group_member(group_id, auth.uid())
    or exists (
      select 1 from public.group_requests gr
      where gr.group_id = group_members.group_id and gr.user_id = auth.uid() and gr.status = 'pending'
    )
  );
create policy "group_requests: parties read" on public.group_requests
  for select to authenticated using (
    user_id = auth.uid() or created_by = auth.uid() or public.is_group_member(group_id, auth.uid())
  );

-- conversations & messages
create policy "conversations: members read" on public.conversations
  for select to authenticated using (public.is_conversation_member(id, auth.uid()));
create policy "conversation_members: members read" on public.conversation_members
  for select to authenticated using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "conversation_members: update own read marker" on public.conversation_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "messages: members read" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "messages: members send" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and kind = 'text'
    and public.is_conversation_member(conversation_id, auth.uid())
    and not exists (
      select 1 from public.profiles me where me.id = auth.uid() and me.banned_at is not null
    )
    and not exists (
      -- In a direct chat, a block in either direction closes the thread.
      select 1
      from public.conversations c
      join public.conversation_members other
        on other.conversation_id = c.id and other.user_id <> auth.uid()
      where c.id = conversation_id and c.kind = 'direct'
        and public.is_blocked(auth.uid(), other.user_id)
    )
  );

-- intros (mutations go through send/accept/decline/withdraw RPCs)
create policy "intros: parties read" on public.intros
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());

-- notifications
create policy "notifications: owner reads" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: owner marks read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports
create policy "reports: reporter files" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and reported_id <> auth.uid());
create policy "reports: reporter or admin reads" on public.reports
  for select to authenticated using (reporter_id = auth.uid() or public.is_admin(auth.uid()));
create policy "reports: admins update" on public.reports
  for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- moderation log
create policy "moderation_log: admins read" on public.moderation_log
  for select to authenticated using (public.is_admin(auth.uid()));

-- rate_limits: no policies — service role only.

-- ─────────────────────────────────────────────────────────────────────────────
-- Function privileges
-- ─────────────────────────────────────────────────────────────────────────────

revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.is_admin(uuid),
  public.is_blocked(uuid, uuid),
  public.is_student_verified(uuid),
  public.is_conversation_member(uuid, uuid),
  public.is_group_member(uuid, uuid),
  public.shares_conversation(uuid, uuid),
  public.can_view_profile(uuid, uuid),
  public.can_contact(uuid, uuid),
  public.first_name_of(uuid),
  public.reorder_photos(uuid[]),
  public.complete_onboarding(),
  public.get_public_preferences(uuid),
  public.get_match_feed(text, integer, integer, text[], date, date, text[], text[], text, boolean, integer, integer),
  public.send_intro(uuid, text),
  public.accept_intro(uuid),
  public.decline_intro(uuid),
  public.withdraw_intro(uuid),
  public.mark_conversation_read(uuid),
  public.unread_counts(),
  public.create_group(text, integer),
  public.invite_to_group(uuid, uuid, text),
  public.request_to_join_group(uuid, text),
  public.respond_group_request(uuid, boolean),
  public.cancel_group_request(uuid),
  public.leave_group(uuid),
  public.group_candidates(uuid, integer, integer),
  public.groups_for_me(integer)
to authenticated;

-- school_for_email is needed by the sign-in form before a session exists.
grant execute on function public.school_for_email(text) to anon, authenticated;

-- Server-only.
revoke execute on function public.rate_limit(text, integer, integer) from authenticated;
revoke execute on function public.prune_match_scores(uuid, uuid[]) from authenticated;
revoke execute on function public.stale_match_users(integer) from authenticated;
grant execute on function public.rate_limit(text, integer, integer) to service_role;
grant execute on function public.prune_match_scores(uuid, uuid[]) to service_role;
grant execute on function public.stale_match_users(integer) to service_role;
