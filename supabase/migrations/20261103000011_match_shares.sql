-- Phase 7.7: "Why we're a match" share cards & signed expiring tokens

create table public.match_share_tokens (
  id                uuid primary key default gen_random_uuid(),
  user_a            uuid not null references public.profiles (id) on delete cascade,
  user_b            uuid not null references public.profiles (id) on delete cascade,
  token             text not null unique,
  token_hash        text not null unique,
  user_a_consented  boolean not null default false,
  user_b_consented  boolean not null default false,
  expires_at        timestamptz not null,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now(),
  check (user_a <> user_b)
);

create index match_share_tokens_users_idx on public.match_share_tokens (user_a, user_b);
create index match_share_tokens_hash_idx on public.match_share_tokens (token_hash);

alter table public.match_share_tokens enable row level security;

revoke all on public.match_share_tokens from anon, authenticated;
grant select, insert, update on public.match_share_tokens to authenticated;
grant select on public.match_share_tokens to anon;

create policy "match_share_tokens: participants read" on public.match_share_tokens
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

create policy "match_share_tokens: participants insert" on public.match_share_tokens
  for insert to authenticated with check (user_a = auth.uid() or user_b = auth.uid());

create policy "match_share_tokens: participants update" on public.match_share_tokens
  for update to authenticated using (user_a = auth.uid() or user_b = auth.uid());

-- Anon can read valid shared tokens that have mutual consent and are not expired/revoked
create policy "match_share_tokens: anon reads valid consented" on public.match_share_tokens
  for select to anon using (
    user_a_consented and user_b_consented and revoked_at is null and expires_at > now()
  );
