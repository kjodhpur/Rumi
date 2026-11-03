-- Phase 1.F: Behavioral Micro-Questions (Scenario Questions)

create table public.school_questions (
  id           uuid primary key default gen_random_uuid(),
  school_id    text references public.schools (id) on delete cascade,
  version      integer not null default 1,
  kind         text not null check (kind in ('scenario', 'general')),
  factor       text not null,
  stem         text not null check (char_length(stem) between 5 and 250),
  choices      jsonb not null,
  factor_map   jsonb not null,
  is_active    boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create index school_questions_school_idx on public.school_questions (school_id, is_active, position);

create table public.school_question_answers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  question_id  uuid not null references public.school_questions (id) on delete cascade,
  choice_key   text not null,
  updated_at   timestamptz not null default now(),
  unique (user_id, question_id)
);

create index school_question_answers_user_idx on public.school_question_answers (user_id);

-- RLS
alter table public.school_questions enable row level security;
alter table public.school_question_answers enable row level security;

revoke all on public.school_questions, public.school_question_answers from anon, authenticated;

grant select on public.school_questions to anon, authenticated;
grant select, insert, update on public.school_question_answers to authenticated;

-- Policies: school_questions
create policy "school_questions: read active" on public.school_questions
  for select to authenticated using (is_active = true);

create policy "school_questions: anon read active" on public.school_questions
  for select to anon using (is_active = true);

-- Policies: school_question_answers
create policy "school_question_answers: user read own" on public.school_question_answers
  for select to authenticated using (user_id = auth.uid());

create policy "school_question_answers: user upsert own" on public.school_question_answers
  for insert to authenticated with check (user_id = auth.uid());

create policy "school_question_answers: user update own" on public.school_question_answers
  for update to authenticated using (user_id = auth.uid());
