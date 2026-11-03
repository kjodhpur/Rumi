-- Phase 7.7: "Why we're a match" share cards. See docs/phase-7-7.md.
-- Only a hash of the link token is stored; the token itself is derived on the server
-- (HMAC of the row id), so a database read never yields a working link.
-- Rows are written only through the functions below: each student can set only their
-- own consent, and only for someone they can see who is actually a match.

create table public.match_share_tokens (
  id                uuid primary key default gen_random_uuid(),
  user_a            uuid not null references public.profiles (id) on delete cascade,
  user_b            uuid not null references public.profiles (id) on delete cascade,
  token_hash        text not null unique check (char_length(token_hash) = 64),
  user_a_consented  boolean not null default false,
  user_b_consented  boolean not null default false,
  expires_at        timestamptz not null,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now(),
  check (user_a < user_b)
);

create unique index match_share_tokens_active_idx
  on public.match_share_tokens (user_a, user_b) where revoked_at is null;

alter table public.match_share_tokens enable row level security;

revoke all on public.match_share_tokens from anon, authenticated;
grant select on public.match_share_tokens to authenticated;

create policy "match_share_tokens: participants read" on public.match_share_tokens
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

-- Turn on my side of the share card with p_other. Creates the row (with the server's
-- id and token hash) when no live one exists. Expired rows are retired first.
create or replace function public.consent_match_share(p_other uuid, p_id uuid, p_token_hash text)
returns table (share_id uuid, ready boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  lo uuid;
  hi uuid;
  existing public.match_share_tokens%rowtype;
begin
  if me is null then
    raise exception 'not_signed_in';
  end if;
  if p_other is null or p_other = me or not public.can_view_profile(me, p_other) then
    raise exception 'not_found';
  end if;
  if not exists (
    select 1 from public.match_scores s where s.viewer_id = me and s.candidate_id = p_other
  ) then
    raise exception 'not_a_match';
  end if;
  lo := least(me, p_other);
  hi := greatest(me, p_other);

  update public.match_share_tokens t set revoked_at = now()
  where t.user_a = lo and t.user_b = hi and t.revoked_at is null and t.expires_at <= now();

  select * into existing from public.match_share_tokens t
  where t.user_a = lo and t.user_b = hi and t.revoked_at is null
  for update;

  if not found then
    if p_id is null or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'invalid_token';
    end if;
    insert into public.match_share_tokens (id, user_a, user_b, token_hash, user_a_consented, user_b_consented, expires_at)
    values (p_id, lo, hi, p_token_hash, me = lo, me = hi, now() + interval '14 days');
    return query select p_id, false;
    return;
  end if;

  update public.match_share_tokens t
  set user_a_consented = t.user_a_consented or me = lo,
      user_b_consented = t.user_b_consented or me = hi
  where t.id = existing.id;

  return query
  select t.id, t.user_a_consented and t.user_b_consented
  from public.match_share_tokens t where t.id = existing.id;
end;
$$;

-- Either student can revoke; the link 404s on the next request.
create or replace function public.revoke_match_share(p_other uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.match_share_tokens t set revoked_at = now()
  where t.user_a = least(auth.uid(), p_other)
    and t.user_b = greatest(auth.uid(), p_other)
    and t.revoked_at is null
    and auth.uid() is not null;
$$;

revoke execute on function public.consent_match_share(uuid, uuid, text) from public, anon;
revoke execute on function public.revoke_match_share(uuid) from public, anon;
grant execute on function public.consent_match_share(uuid, uuid, text) to authenticated;
grant execute on function public.revoke_match_share(uuid) to authenticated;
