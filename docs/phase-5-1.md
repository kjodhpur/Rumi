# Phase 5.1 — Smart Room-Swap Marketplace

Written before code per master prompt §5.1.

## 1. Principles

- **Cycle finder:** Discovers bilateral (2-way) and 3-way circular room swaps where:
  - Every participating student's new mutual score with their new roommates is strictly greater than their current mutual score by **≥ 10 points** (`MIN_SWAP_IMPROVEMENT_DELTA = 10`).
  - Hard dealbreakers, building compatibility, and gender-housing constraints are strictly preserved.
- **Staff-in-the-loop review:**
  - Proposals flow to `housing_staff` first in `/staff/swaps`.
  - Once staff approve, participating students receive notifications and prompt to accept or decline.
  - If any participant declines or withdraws, the whole proposal cycle cancels gracefully.
- **Mathematical correctness:** Graph cycle detection in `src/lib/matching/swaps.ts` verified by unit tests comparing cycle finder against brute-force enumeration.

## 2. Schema

```sql
create table public.swap_pool (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  assignment_id  uuid not null references public.assignments(id) on delete cascade,
  school_id      text not null references public.schools(id) on delete cascade,
  reason         text,
  opted_in_at    timestamptz not null default now(),
  unique (user_id)
);

create table public.swap_proposals (
  id             uuid primary key default gen_random_uuid(),
  school_id      text not null references public.schools(id) on delete cascade,
  cycle          uuid[] not null, -- ordered array of user_ids in the swap loop
  scores         jsonb not null, -- { "userId": { "currentScore": 60, "newScore": 85, "delta": 25 } }
  status         text not null default 'staff_pending'
                 check (status in ('staff_pending', 'staff_approved', 'student_accepted', 'declined', 'cancelled', 'completed')),
  staff_notes    text,
  decided_at     timestamptz,
  created_at     timestamptz not null default now()
);
```
