-- Phase 1.F + term question bank: school questions (scenario, scale, choice) and answers.
-- See docs/phase-1-f.md.
-- Rumi's default scenario set lives in code (lib/matching/scenarios.ts) and is versioned
-- there; school-added questions live here. Answers are keyed by question key + version,
-- so editing a question creates a new version and old answers stop counting until the
-- student answers again. Fair Housing: a question is shown to students only after a
-- housing admin signs off the review, and a server-side denylist blocks protected topics.

create table public.school_questions (
  id            uuid primary key default gen_random_uuid(),
  school_id     text not null references public.schools (id) on delete cascade,
  key           text not null check (key ~ '^[a-z0-9_]{3,40}$'),
  version       integer not null default 1 check (version >= 1),
  kind          text not null check (kind in ('scenario', 'scale', 'choice')),
  factor        text not null check (factor in ('sleep', 'cleanliness', 'noise', 'guests', 'study')),
  stem          text not null check (char_length(stem) between 5 and 250),
  -- [{ key, label, value 1–5, reason }], 2–5 choices
  choices       jsonb not null check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) between 2 and 5),
  is_active     boolean not null default true,
  position      integer not null default 0,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (school_id, key, version)
);

create index school_questions_school_idx on public.school_questions (school_id, is_active, position);
-- At most one live version of each question.
create unique index school_questions_live_idx on public.school_questions (school_id, key) where is_active;

create table public.school_question_answers (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  question_key     text not null check (question_key ~ '^[a-z0-9_]{3,40}$'),
  question_version integer not null check (question_version >= 1),
  choice_key       text not null check (choice_key ~ '^[a-z0-9_]{1,40}$'),
  updated_at       timestamptz not null default now(),
  primary key (user_id, question_key)
);

alter table public.school_questions enable row level security;
alter table public.school_question_answers enable row level security;

revoke all on public.school_questions, public.school_question_answers from anon, authenticated;

grant select on public.school_questions to authenticated;
grant insert, update on public.school_questions to authenticated;
grant select, insert, update, delete on public.school_question_answers to authenticated;

-- Students see their own school's live, reviewed questions. Staff see every version.
create policy "school_questions: students read live reviewed" on public.school_questions
  for select to authenticated using (
    is_active and reviewed_at is not null
    and school_id = (select p.school_id from public.profiles p where p.id = auth.uid())
  );
create policy "school_questions: staff read" on public.school_questions
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff', 'analyst']));
create policy "school_questions: housing admins add" on public.school_questions
  for insert to authenticated with check (public.has_role(school_id, array['housing_admin']));
create policy "school_questions: housing admins edit" on public.school_questions
  for update to authenticated
  using (public.has_role(school_id, array['housing_admin']))
  with check (public.has_role(school_id, array['housing_admin']));

create policy "school_question_answers: own" on public.school_question_answers
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
