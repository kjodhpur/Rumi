-- Phase 7.9: Parent view (read-only, opt-in family shares)

create table public.family_shares (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  token       text not null unique,
  token_hash  text not null unique,
  scope       jsonb not null default '{"include_agreement": true, "include_photos": false}'::jsonb,
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index family_shares_user_idx on public.family_shares (user_id);
create index family_shares_hash_idx on public.family_shares (token_hash);

alter table public.family_shares enable row level security;

revoke all on public.family_shares from anon, authenticated;

grant select, insert, update, delete on public.family_shares to authenticated;
grant select on public.family_shares to anon;

create policy "family_shares: owner all" on public.family_shares
  for all to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "family_shares: anon read active" on public.family_shares
  for select to anon using (revoked_at is null and expires_at > now());
