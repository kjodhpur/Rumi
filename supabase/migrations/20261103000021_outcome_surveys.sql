-- Phase 6.1 & 6.2: end-of-term "room again?" survey and next-year re-match.
-- See docs/phase-6-rematch.md.
-- Answers are the student's own. Staff never read rows: they see aggregates (n < 5
-- suppressed) through staff_outcome_surveys, and de-identified rows only for students who
-- turned on research_outcomes.

create table public.outcome_surveys (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  school_id        text not null references public.schools (id) on delete cascade,
  group_id         uuid references public.groups (id) on delete set null,
  term_id          uuid not null references public.terms (id) on delete cascade,
  room_again       text not null check (room_again in ('yes', 'maybe', 'no')),
  score            integer not null check (score between 1 and 5),
  friction_tags    text[] not null default '{}' check (cardinality(friction_tags) <= 3),
  biggest_win      text check (biggest_win is null or char_length(biggest_win) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, term_id)
);

create index outcome_surveys_term_idx on public.outcome_surveys (term_id);

-- Survey invitations sent by the cron (one per student per term).
create table public.outcome_survey_sends (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  term_id   uuid not null references public.terms (id) on delete cascade,
  sent_at   timestamptz not null default now(),
  primary key (user_id, term_id)
);

-- Next-year carry-forward: each member taps "keep my group" for the new term.
create table public.group_carry_forwards (
  group_id     uuid not null references public.groups (id) on delete cascade,
  term_id      uuid not null references public.terms (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  keep         boolean not null,
  answered_at  timestamptz not null default now(),
  primary key (group_id, term_id, user_id)
);

alter table public.outcome_surveys enable row level security;
alter table public.outcome_survey_sends enable row level security;
alter table public.group_carry_forwards enable row level security;

revoke all on public.outcome_surveys, public.outcome_survey_sends, public.group_carry_forwards from anon, authenticated;
grant select on public.outcome_surveys, public.group_carry_forwards to authenticated;

create policy "outcome_surveys: own" on public.outcome_surveys
  for select to authenticated using (user_id = auth.uid());
create policy "group_carry_forwards: members read" on public.group_carry_forwards
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));
