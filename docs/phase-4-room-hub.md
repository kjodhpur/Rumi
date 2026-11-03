# Phase 4.2 & 4.3 — Room Hub: Quiet-Hours, Guest Calendar, Chores & Expenses

Written before code per master prompt §4.2 and §4.3.

## 1. Scope & Principles

- **Shared Room Living:** Once students form a confirmed group, their room hub provides operational tools for daily living:
  - **Quiet-hours & Guest Calendar (`/groups/[id]/calendar`)**: coordinate guests, study/quiet blocks, and room availability. Soft-warn when an event exceeds the limits agreed upon in their signed Roommate Agreement.
  - **Private Webcal / .ics feed (`/api/calendar/[token].ics`)**: allows syncing the room events into Apple Calendar, Google Calendar, or Outlook.
  - **Shared Chores & Expenses (`/groups/[id]/home`)**: rotating chore wheel seeded from roommate agreements, and split expenses strictly in integer cents with guaranteed zero-sum net balance invariant.
- **Privacy & Safety:**
  - Strictly scoped to group members. RAs have no access unless reopened in mediation with mutual consent.
  - No payment processing: Rumi tracks balances and provides payment-safety reminders, but never touches money.
- **Invariants:**
  - Net balance across all group members always sums to zero cents.
  - Remainder cents on custom or non-divisible splits are assigned to the payer.
  - Guest overnight counts are evaluated across sliding 7-day windows against the agreement's guest policy.

## 2. Schema

```sql
-- Phase 4.2 Calendar
create table public.room_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('guest', 'quiet', 'away', 'shared')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  overnight boolean not null default false,
  guest_count integer not null default 0 check (guest_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create table public.room_calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  token_hash text not null unique,
  rotated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- Phase 4.3 Chores & Expenses
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  cadence text not null check (cadence in ('daily', 'weekly', 'biweekly', 'monthly')),
  rotation uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.chore_instances (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  assignee_id uuid not null references public.profiles(id) on delete cascade,
  due_on date not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD',
  description text not null,
  receipt_path text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_cents integer not null check (share_cents >= 0),
  settled_at timestamptz
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  note text,
  created_at timestamptz not null default now(),
  check (payer_id <> receiver_id)
);
```

## 3. Pure Calculation Engines

1. `src/lib/calendar/conflicts.ts`:
   - Checks overlapping quiet hours vs guest requests.
   - Evaluates weekly overnight guest count against agreement limit (default 2 per week).
   - Returns `{ hasWarning: boolean, warnings: string[] }`.
2. `src/lib/calendar/ics.ts`:
   - Generates RFC 5545 valid VCALENDAR feed with VEVENTs, UID, DTSTAMP, DTSTART, DTEND, SUMMARY, DESCRIPTION.
3. `src/lib/expenses/balances.ts`:
   - Pure function taking `members`, `expenses`, `expense_splits`, `settlements`.
   - Computes each member's net balance in cents (positive = owed money, negative = owes money).
   - Invariant: `sum(netBalances) === 0`.
   - Computes suggested settlement transactions to simplify cross-debts.
