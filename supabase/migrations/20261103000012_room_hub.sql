-- Phase 4.2 & 4.3: Room Hub (Calendar, Quiet-Hours, Chores, Expenses)

-- 1. Room Calendar & Events
create table public.room_events (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('guest', 'quiet', 'away', 'shared')),
  title        text not null check (char_length(title) between 1 and 120),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  overnight    boolean not null default false,
  guest_count  integer not null default 0 check (guest_count >= 0 and guest_count <= 20),
  notes        text check (char_length(notes) <= 1000),
  created_at   timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create index room_events_group_idx on public.room_events (group_id, starts_at);

create table public.room_calendar_tokens (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  token       text not null unique,
  token_hash  text not null unique,
  rotated_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (group_id, user_id)
);

create index room_calendar_tokens_hash_idx on public.room_calendar_tokens (token_hash);

-- 2. Chores & Instances
create table public.chores (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 100),
  cadence     text not null check (cadence in ('daily', 'weekly', 'biweekly', 'monthly')),
  rotation    uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);

create index chores_group_idx on public.chores (group_id);

create table public.chore_instances (
  id           uuid primary key default gen_random_uuid(),
  chore_id     uuid not null references public.chores (id) on delete cascade,
  group_id     uuid not null references public.groups (id) on delete cascade,
  assignee_id  uuid not null references public.profiles (id) on delete cascade,
  due_on       date not null,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index chore_instances_group_idx on public.chore_instances (group_id, due_on);

-- 3. Expenses, Splits & Settlements
create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  payer_id      uuid not null references public.profiles (id) on delete cascade,
  amount_cents  integer not null check (amount_cents > 0),
  currency      text not null default 'USD' check (currency in ('USD')),
  description   text not null check (char_length(description) between 1 and 200),
  receipt_path  text,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index expenses_group_idx on public.expenses (group_id, created_at desc);

create table public.expense_splits (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  share_cents integer not null check (share_cents >= 0),
  settled_at  timestamptz
);

create index expense_splits_expense_idx on public.expense_splits (expense_id);

create table public.settlements (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  payer_id      uuid not null references public.profiles (id) on delete cascade,
  receiver_id   uuid not null references public.profiles (id) on delete cascade,
  amount_cents  integer not null check (amount_cents > 0),
  note          text check (char_length(note) <= 200),
  created_at    timestamptz not null default now(),
  check (payer_id <> receiver_id)
);

create index settlements_group_idx on public.settlements (group_id, created_at desc);

-- RLS
alter table public.room_events enable row level security;
alter table public.room_calendar_tokens enable row level security;
alter table public.chores enable row level security;
alter table public.chore_instances enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

revoke all on public.room_events, public.room_calendar_tokens, public.chores,
  public.chore_instances, public.expenses, public.expense_splits, public.settlements
  from anon, authenticated;

grant select, insert, update, delete on public.room_events, public.chores,
  public.chore_instances, public.expenses, public.expense_splits, public.settlements
  to authenticated;

grant select, insert, update, delete on public.room_calendar_tokens to authenticated;
grant select on public.room_calendar_tokens to anon;

-- Policies: room_events
create policy "room_events: members read" on public.room_events
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));

create policy "room_events: members insert" on public.room_events
  for insert to authenticated with check (
    public.is_group_member(group_id, auth.uid()) and created_by = auth.uid()
  );

create policy "room_events: creator update" on public.room_events
  for update to authenticated using (
    public.is_group_member(group_id, auth.uid()) and created_by = auth.uid()
  );

create policy "room_events: creator delete" on public.room_events
  for delete to authenticated using (
    public.is_group_member(group_id, auth.uid()) and created_by = auth.uid()
  );

-- Policies: room_calendar_tokens
create policy "room_calendar_tokens: user read" on public.room_calendar_tokens
  for select to authenticated using (user_id = auth.uid() and public.is_group_member(group_id, auth.uid()));

create policy "room_calendar_tokens: user insert" on public.room_calendar_tokens
  for insert to authenticated with check (user_id = auth.uid() and public.is_group_member(group_id, auth.uid()));

create policy "room_calendar_tokens: user update" on public.room_calendar_tokens
  for update to authenticated using (user_id = auth.uid() and public.is_group_member(group_id, auth.uid()));

create policy "room_calendar_tokens: anon read valid" on public.room_calendar_tokens
  for select to anon using (true);

-- Policies: chores & instances
create policy "chores: members all" on public.chores
  for all to authenticated using (public.is_group_member(group_id, auth.uid()))
  with check (public.is_group_member(group_id, auth.uid()));

create policy "chore_instances: members all" on public.chore_instances
  for all to authenticated using (public.is_group_member(group_id, auth.uid()))
  with check (public.is_group_member(group_id, auth.uid()));

-- Policies: expenses & splits
create policy "expenses: members read" on public.expenses
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));

create policy "expenses: members insert" on public.expenses
  for insert to authenticated with check (
    public.is_group_member(group_id, auth.uid()) and payer_id = auth.uid()
  );

create policy "expenses: payer soft delete" on public.expenses
  for update to authenticated using (
    public.is_group_member(group_id, auth.uid()) and payer_id = auth.uid()
  );

create policy "expense_splits: members all" on public.expense_splits
  for all to authenticated using (
    exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id, auth.uid()))
  )
  with check (
    exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id, auth.uid()))
  );

-- Policies: settlements
create policy "settlements: members read" on public.settlements
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));

create policy "settlements: payer insert" on public.settlements
  for insert to authenticated with check (
    public.is_group_member(group_id, auth.uid()) and payer_id = auth.uid()
  );
