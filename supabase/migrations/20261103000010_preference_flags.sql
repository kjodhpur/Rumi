-- Phase 1.D: Answer-consistency checks & preference flags

create table public.preference_flags (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  rule_key     text not null check (char_length(rule_key) between 3 and 64),
  created_at   timestamptz not null default now(),
  dismissed_at timestamptz,
  unique (user_id, rule_key)
);

create index preference_flags_user_idx on public.preference_flags (user_id);

alter table public.preference_flags enable row level security;

revoke all on public.preference_flags from anon, authenticated;
grant select, insert, update on public.preference_flags to authenticated;

create policy "preference_flags: owner reads" on public.preference_flags
  for select to authenticated using (user_id = auth.uid());

create policy "preference_flags: owner writes" on public.preference_flags
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
