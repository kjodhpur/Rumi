-- Phase 6.1 & 6.2: End-of-Year Outcome Surveys & Next-Year Re-Match

create table if not exists public.outcome_surveys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  group_id     uuid references public.groups (id) on delete set null,
  term_id      uuid references public.terms (id) on delete set null,
  room_again   text not null check (room_again in ('yes', 'maybe', 'no')),
  score        integer not null check (score between 1 and 5),
  tags         text[] not null default '{}',
  biggest_win  text,
  created_at   timestamptz not null default now(),
  unique (user_id, term_id)
);

create index if not exists outcome_surveys_group_idx on public.outcome_surveys (group_id);
create index if not exists outcome_surveys_term_idx on public.outcome_surveys (term_id);

alter table public.outcome_surveys enable row level security;
revoke all on public.outcome_surveys from anon, authenticated;
grant select, insert, update on public.outcome_surveys to authenticated;

-- Student manages own survey response
create policy "outcome_surveys: owner insert/read" on public.outcome_surveys
  for all to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Staff read surveys in aggregate / for outcomes research
create policy "outcome_surveys: staff read" on public.outcome_surveys
  for select to authenticated using (
    exists (
      select 1 from public.terms t
      join public.staff_members sm on sm.school_id = t.school_id
      where t.id = outcome_surveys.term_id
        and sm.user_id = auth.uid()
        and sm.disabled_at is null
        and sm.role in ('housing_admin', 'housing_staff', 'analyst')
    )
  );
