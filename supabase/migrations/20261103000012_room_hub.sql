-- Phase 4.2 & 4.3: room calendar, chores and expenses. See docs/phase-4-room-hub.md.
-- Everything here is visible to the group's members only. Money and chore writes go
-- through security-definer functions so a split or rotation can never name an outsider
-- and an expense can never exist without its splits.

-- 1. Room calendar
create table public.room_events (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.groups (id) on delete cascade,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('guest', 'quiet', 'away', 'shared')),
  title        text not null check (char_length(title) between 1 and 120),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  overnight    boolean not null default false,
  guest_count  integer not null default 0 check (guest_count between 0 and 20),
  -- Weekly repeats only (quiet hours, standing study time), as an RFC 5545 RRULE.
  rrule        text check (
    rrule is null
    or rrule ~ '^FREQ=WEEKLY(;BYDAY=(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU)){0,6})?(;UNTIL=[0-9]{8}T[0-9]{6}Z)?$'
  ),
  notes        text check (char_length(notes) <= 1000),
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '14 days'),
  check (kind = 'guest' or (guest_count = 0 and not overnight))
);

create index room_events_group_idx on public.room_events (group_id, starts_at);

-- Private .ics feed per member. Only the hash is stored; the token is derived on the server.
create table public.room_calendar_tokens (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  token_hash  text not null unique check (char_length(token_hash) = 64),
  rotated_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (group_id, user_id)
);

-- 2. Chores
create table public.chores (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 100),
  cadence     text not null check (cadence in ('daily', 'weekly', 'biweekly', 'monthly')),
  rotation    uuid[] not null default '{}',
  -- Set when the chore came from the roommate agreement's chores section.
  from_agreement boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
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
  completed_by uuid references public.profiles (id) on delete set null,
  reminded_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (chore_id, due_on)
);

create index chore_instances_group_idx on public.chore_instances (group_id, due_on);

-- 3. Expenses (integer cents only; Rumi never moves money)
create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  payer_id      uuid not null references public.profiles (id) on delete cascade,
  amount_cents  integer not null check (amount_cents between 1 and 10000000),
  currency      text not null default 'USD' check (currency in ('USD')),
  description   text not null check (char_length(description) between 1 and 200),
  deleted_at    timestamptz,
  deleted_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index expenses_group_idx on public.expenses (group_id, created_at desc);

create table public.expense_splits (
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  share_cents integer not null check (share_cents >= 0),
  primary key (expense_id, user_id)
);

create table public.settlements (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  payer_id      uuid not null references public.profiles (id) on delete cascade,
  receiver_id   uuid not null references public.profiles (id) on delete cascade,
  amount_cents  integer not null check (amount_cents between 1 and 10000000),
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

grant select, insert, delete on public.room_events to authenticated;
grant select, insert, delete on public.room_calendar_tokens to authenticated;
grant select on public.chores, public.chore_instances, public.expenses,
  public.expense_splits, public.settlements to authenticated;
grant delete on public.chores to authenticated;
grant insert on public.settlements to authenticated;

create policy "room_events: members read" on public.room_events
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));
create policy "room_events: members add their own" on public.room_events
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_group_member(group_id, auth.uid())
  );
create policy "room_events: creator deletes" on public.room_events
  for delete to authenticated using (
    created_by = auth.uid() and public.is_group_member(group_id, auth.uid())
  );

create policy "room_calendar_tokens: own read" on public.room_calendar_tokens
  for select to authenticated using (user_id = auth.uid());
create policy "room_calendar_tokens: own create" on public.room_calendar_tokens
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_group_member(group_id, auth.uid())
  );
create policy "room_calendar_tokens: own delete" on public.room_calendar_tokens
  for delete to authenticated using (user_id = auth.uid());

create policy "chores: members read" on public.chores
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));
create policy "chores: members delete" on public.chores
  for delete to authenticated using (public.is_group_member(group_id, auth.uid()));
create policy "chore_instances: members read" on public.chore_instances
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));

create policy "expenses: members read" on public.expenses
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));
create policy "expense_splits: members read" on public.expense_splits
  for select to authenticated using (
    exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id, auth.uid()))
  );
create policy "settlements: members read" on public.settlements
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));
create policy "settlements: payer records" on public.settlements
  for insert to authenticated with check (
    payer_id = auth.uid()
    and public.is_group_member(group_id, auth.uid())
    and public.is_group_member(group_id, receiver_id)
  );

-- Next due date for a cadence, from a given day.
create or replace function public.chore_next_due(p_from date, p_cadence text)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_cadence
    when 'daily' then p_from + 1
    when 'weekly' then p_from + 7
    when 'biweekly' then p_from + 14
    else (p_from + interval '1 month')::date
  end;
$$;

-- Create a chore with a rotation of current members, and its first instance.
create or replace function public.add_chore(
  p_group uuid, p_title text, p_cadence text, p_rotation uuid[], p_first_due date, p_from_agreement boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  members uuid[];
  rot uuid[];
  new_id uuid;
begin
  if me is null or not public.is_group_member(p_group, me) then
    raise exception 'not_member';
  end if;
  if (select count(*) from public.chores c where c.group_id = p_group) >= 30 then
    raise exception 'too_many';
  end if;
  select array_agg(gm.user_id order by gm.joined_at, gm.user_id) into members
  from public.group_members gm where gm.group_id = p_group;
  rot := coalesce(nullif(p_rotation, '{}'), members);
  if not rot <@ members then
    raise exception 'not_member';
  end if;
  insert into public.chores (group_id, title, cadence, rotation, from_agreement, created_by)
  values (p_group, btrim(p_title), p_cadence, rot, p_from_agreement, me)
  returning id into new_id;
  insert into public.chore_instances (chore_id, group_id, assignee_id, due_on)
  values (new_id, p_group, rot[1], coalesce(p_first_due, current_date));
  return new_id;
end;
$$;

-- Mark an instance done (by anyone in the room) and schedule the next person's turn.
create or replace function public.complete_chore(p_instance uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  inst public.chore_instances%rowtype;
  ch public.chores%rowtype;
  pos integer;
  next_assignee uuid;
  next_id uuid;
begin
  select * into inst from public.chore_instances i where i.id = p_instance for update;
  if not found or not public.is_group_member(inst.group_id, me) then
    raise exception 'not_found';
  end if;
  if inst.completed_at is not null then
    return null;
  end if;
  update public.chore_instances set completed_at = now(), completed_by = me where id = p_instance;
  select * into ch from public.chores c where c.id = inst.chore_id;
  if coalesce(array_length(ch.rotation, 1), 0) = 0 then
    return null;
  end if;
  pos := array_position(ch.rotation, inst.assignee_id);
  next_assignee := ch.rotation[coalesce(pos, 0) % array_length(ch.rotation, 1) + 1];
  insert into public.chore_instances (chore_id, group_id, assignee_id, due_on)
  values (ch.id, ch.group_id, next_assignee, public.chore_next_due(greatest(inst.due_on, current_date), ch.cadence))
  on conflict (chore_id, due_on) do nothing
  returning id into next_id;
  return next_id;
end;
$$;

-- Add an expense paid by the caller, split across current members. Splits must sum to
-- the amount exactly; everyone named must be in the room.
create or replace function public.add_expense(p_group uuid, p_amount_cents integer, p_description text, p_splits jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
  total integer;
  outsiders integer;
begin
  if me is null or not public.is_group_member(p_group, me) then
    raise exception 'not_member';
  end if;
  if jsonb_typeof(p_splits) <> 'array' or jsonb_array_length(p_splits) = 0 or jsonb_array_length(p_splits) > 4 then
    raise exception 'invalid_splits';
  end if;
  select coalesce(sum((s ->> 'share_cents')::integer), 0),
         count(*) filter (where not public.is_group_member(p_group, (s ->> 'user_id')::uuid))
  into total, outsiders
  from jsonb_array_elements(p_splits) s;
  if outsiders > 0 then
    raise exception 'not_member';
  end if;
  if total <> p_amount_cents then
    raise exception 'splits_must_sum';
  end if;
  insert into public.expenses (group_id, payer_id, amount_cents, description)
  values (p_group, me, p_amount_cents, btrim(p_description))
  returning id into new_id;
  insert into public.expense_splits (expense_id, user_id, share_cents)
  select new_id, (s ->> 'user_id')::uuid, (s ->> 'share_cents')::integer
  from jsonb_array_elements(p_splits) s;
  return new_id;
end;
$$;

-- Soft delete, kept for the record. Only the payer can remove their expense.
create or replace function public.delete_expense(p_expense uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.expenses e set deleted_at = now(), deleted_by = auth.uid()
  where e.id = p_expense and e.payer_id = auth.uid() and e.deleted_at is null
    and public.is_group_member(e.group_id, auth.uid());
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

revoke execute on function public.add_chore(uuid, text, text, uuid[], date, boolean) from public, anon;
revoke execute on function public.complete_chore(uuid) from public, anon;
revoke execute on function public.add_expense(uuid, integer, text, jsonb) from public, anon;
revoke execute on function public.delete_expense(uuid) from public, anon;
grant execute on function public.add_chore(uuid, text, text, uuid[], date, boolean) to authenticated;
grant execute on function public.complete_chore(uuid) to authenticated;
grant execute on function public.add_expense(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.delete_expense(uuid) to authenticated;

-- A member who leaves: their future events and feed go, they drop out of chore rotations
-- and their open chores move to the next person. Expenses stay, so balances still show.
create or replace function public.room_hub_member_left()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The whole group is being deleted: its rows cascade away on their own.
  if not exists (select 1 from public.groups g where g.id = old.group_id) then
    return old;
  end if;
  update public.chores c set rotation = array_remove(c.rotation, old.user_id)
  where c.group_id = old.group_id and old.user_id = any (c.rotation);
  -- The account is being deleted: its events, feed and chores cascade away.
  if not exists (select 1 from public.profiles p where p.id = old.user_id) then
    return old;
  end if;
  delete from public.room_events e
  where e.group_id = old.group_id and e.created_by = old.user_id and e.starts_at > now() and e.rrule is null;
  update public.room_events e
  set rrule = regexp_replace(e.rrule, ';UNTIL=[0-9TZ]+', '') || ';UNTIL=' || to_char(now() at time zone 'utc', 'YYYYMMDD"T"HH24MISS"Z"')
  where e.group_id = old.group_id and e.created_by = old.user_id and e.rrule is not null;
  delete from public.room_calendar_tokens t where t.group_id = old.group_id and t.user_id = old.user_id;
  update public.chore_instances i
  set assignee_id = coalesce(
    (select c.rotation[1] from public.chores c where c.id = i.chore_id and array_length(c.rotation, 1) > 0),
    i.assignee_id
  )
  where i.group_id = old.group_id and i.assignee_id = old.user_id and i.completed_at is null;
  delete from public.chore_instances i
  where i.group_id = old.group_id and i.assignee_id = old.user_id and i.completed_at is null;
  return old;
end;
$$;

create trigger room_hub_member_left
  after delete on public.group_members
  for each row execute function public.room_hub_member_left();
