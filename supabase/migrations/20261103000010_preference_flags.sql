-- Phase 1.D: Answer-consistency checks & preference flags

create table public.preference_flags (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  rule_key     text not null check (char_length(rule_key) between 3 and 64),
  created_at   timestamptz not null default now(),
  dismissed_at timestamptz,
  -- The answers the flag was raised on (or dismissed on); a dismissed flag comes back
  -- only when one of those answers changes.
  answers_sig  text not null default '' check (char_length(answers_sig) <= 200),
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

-- Staff see only the aggregate: how many students have been shown a consistency prompt.
create or replace function public.staff_consistency_rate(p_school text)
returns table (flagged integer, total integer, suppressed boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_flagged integer;
  v_total integer;
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff', 'analyst']) then
    raise exception 'not_allowed';
  end if;
  select count(*)::integer into v_total from public.school_students(p_school) s where s.onboarding_completed_at is not null;
  select count(distinct f.user_id)::integer into v_flagged
  from public.preference_flags f
  join public.school_students(p_school) s on s.id = f.user_id
  where s.onboarding_completed_at is not null;
  return query select case when v_flagged between 1 and 4 then null else v_flagged end, v_total, v_flagged between 1 and 4;
end;
$$;

revoke execute on function public.staff_consistency_rate(text) from public, anon;
grant execute on function public.staff_consistency_rate(text) to authenticated;
