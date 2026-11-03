-- Phase 7.9: parent view (read-only, opt-in family links). See docs/phase-7-9.md.
-- Only the token hash is stored; the token is derived on the server. The public page reads
-- through the service role after checking the hash, expiry and revocation, so anon has no
-- access to this table at all.

create table public.family_shares (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  token_hash  text not null unique check (char_length(token_hash) = 64),
  scope       jsonb not null default '{"include_agreement": true}'::jsonb,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  check (expires_at > created_at)
);

create index family_shares_user_idx on public.family_shares (user_id);
create unique index family_shares_one_live_idx on public.family_shares (user_id) where revoked_at is null;

alter table public.family_shares enable row level security;

revoke all on public.family_shares from anon, authenticated;
grant select, insert on public.family_shares to authenticated;
grant update (revoked_at) on public.family_shares to authenticated;

create policy "family_shares: owner reads" on public.family_shares
  for select to authenticated using (user_id = auth.uid());
create policy "family_shares: owner creates" on public.family_shares
  for insert to authenticated with check (user_id = auth.uid() and revoked_at is null);
create policy "family_shares: owner revokes" on public.family_shares
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and revoked_at is not null);

-- A roommate decides whether a family link may show their first name and photo.
-- Without it they appear as "Your student's roommate".
alter table public.consents drop constraint if exists consents_kind_check;
alter table public.consents add constraint consents_kind_check check (kind in (
  'share_with_housing', 'checkins', 'research_outcomes', 'sms', 'calendar', 'social_verification', 'family_view'
));
