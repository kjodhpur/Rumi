# Phase 1.F — Behavioral Micro-Questions (Scenario Questions)

Written before code per master prompt §1.F.

## 1. Principles

- **Realistic scenarios, fast answers:** Instead of abstract ratings, students answer 6–8 concrete, everyday roommate situations ("Dishes in the sink overnight", "Alarm clocks & snoozing", "Spontaneous weeknight visitors"). Takes < 45 seconds total.
- **Factor mapping & explanations:** Each choice maps into behavioral alignment factors (cleanliness, noise, guests, study, communication style).
- **Match explanations & reasons:** Concordant answers generate rich reasons in "Why you match" (e.g., "Both prefer a quick text before overnight guests", "Aligned dish expectations").
- **Graceful degradation:** Scenario questions are optional. Missing scenario answers never penalize or break compatibility scores. Adding, answering, or removing a scenario question never crashes the engine or invalidates hard dealbreakers.

## 2. Schema

```sql
create table public.school_questions (
  id           uuid primary key default gen_random_uuid(),
  school_id    text references public.schools (id) on delete cascade, -- null = global default
  version      integer not null default 1,
  kind         text not null check (kind in ('scenario', 'general')),
  factor       text not null,
  stem         text not null check (char_length(stem) between 5 and 250),
  choices      jsonb not null, -- [{ "key": "wash", "label": "...", "description": "..." }]
  factor_map   jsonb not null, -- { "wash": { "cleanliness": 3 }, ... }
  is_active    boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create table public.school_question_answers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  question_id  uuid not null references public.school_questions (id) on delete cascade,
  choice_key   text not null,
  updated_at   timestamptz not null default now(),
  unique (user_id, question_id)
);
```

## 3. Pure Calculation & Engine

`src/lib/matching/scenarios.ts`:
- `DEFAULT_SCENARIOS`: 8 pre-seeded scenario questions with 4 choices each.
- `calculateScenarioAlignment(answersA, answersB, questions)`:
  - Computes concordance (0–1).
  - Generates positive reason strings for aligned scenarios.
  - Generates conversation starter strings for divergent scenarios.
