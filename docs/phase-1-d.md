# Phase 1.D — Answer-Consistency Checks

Written before code per master prompt §1.D.

## Decisions

- **Gentle guidance, never a blocker.** Contradictions or ideal-everything selections trigger a polite inline hint ("These answers pull in different directions — want to adjust?"). The student can dismiss it or proceed without changing anything.
- **Never modifies the score.** Flags are purely informational. `evaluateMatch` is never modified by flags, preserving mathematical purity and student agency.
- **Strictly private.** Other students never see inconsistency flags; staff only see aggregate rates without student IDs.
- **Pure rule engine.** `src/lib/matching/consistency.ts` is pure and table-driven.

## Schema

```sql
preference_flags (
  id uuid PK ·
  user_id references profiles(id) on delete cascade ·
  rule_key text not null ·
  created_at timestamptz not null default now(),
  dismissed_at timestamptz,
  unique (user_id, rule_key)
)
```

## Rules Checked

1. `sleep_noise_divergence`: Early sleep schedule (≤2) with high noise tolerance (≥4).
2. `guest_study_friction`: Frequent guests/socializing (≥4) with silent study preference.
3. `all_must_weights`: All factors weighted as maximum "Must" (narrowing match pool excessively).
4. `cleanliness_extreme`: Cleanliness 5 (spotless) with noise/chores contradiction.

## Tests

- Table-driven unit tests verifying each rule triggers on matching input and stays silent on consistent input.
