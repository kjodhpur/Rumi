-- Phase 5.1: smart room-swap marketplace. See docs/phase-5-1.md.
-- Only students with an open room-change request can join the pool. Proposals go to staff
-- first; students see a proposal only after housing staff approve it, and any decline
-- cancels the whole cycle. Rumi never moves anyone: staff carry out approved swaps in the
-- housing system.

create table public.swap_pool (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  school_id      text not null references public.schools (id) on delete cascade,
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  request_id     uuid not null references public.room_change_requests (id) on delete cascade,
  opted_in_at    timestamptz not null default now()
);

create index swap_pool_school_idx on public.swap_pool (school_id, opted_in_at);

create table public.swap_proposals (
  id           uuid primary key default gen_random_uuid(),
  school_id    text not null references public.schools (id) on delete cascade,
  -- cycle[i] moves into the room of cycle[i + 1] (the last moves into cycle[1]'s room)
  cycle        uuid[] not null check (cardinality(cycle) between 2 and 3),
  -- assignment ids in cycle order, so an outside change can invalidate the proposal
  assignment_ids uuid[] not null,
  -- { "<user id>": { "current": n, "proposed": n } }
  scores       jsonb not null,
  responses    jsonb not null default '{}'::jsonb,
  status       text not null default 'staff_pending'
               check (status in ('staff_pending', 'staff_approved', 'student_accepted', 'declined', 'cancelled', 'completed')),
  staff_notes  text check (char_length(staff_notes) <= 500),
  approved_by  uuid references public.profiles (id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index swap_proposals_school_idx on public.swap_proposals (school_id, status);

alter table public.swap_pool enable row level security;
alter table public.swap_proposals enable row level security;

revoke all on public.swap_pool, public.swap_proposals from anon, authenticated;
grant select, delete on public.swap_pool to authenticated;
grant select on public.swap_proposals to authenticated;

create policy "swap_pool: read own" on public.swap_pool
  for select to authenticated using (user_id = auth.uid());
create policy "swap_pool: leave" on public.swap_pool
  for delete to authenticated using (user_id = auth.uid());
create policy "swap_pool: housing staff read" on public.swap_pool
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff']));

create policy "swap_proposals: participants read approved" on public.swap_proposals
  for select to authenticated using (
    auth.uid() = any (cycle) and status <> 'staff_pending'
  );
create policy "swap_proposals: housing staff read" on public.swap_proposals
  for select to authenticated using (public.has_role(school_id, array['housing_admin', 'housing_staff']));

-- Join the pool: needs an open room-change request and an open assignment.
create or replace function public.join_swap_pool()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  req public.room_change_requests%rowtype;
  asg uuid;
begin
  select * into req from public.room_change_requests r where r.user_id = me and r.status = 'open';
  if not found then
    raise exception 'no_request';
  end if;
  select a.id into asg from public.assignments a where a.user_id = me and a.closed_at is null;
  if asg is null then
    raise exception 'no_assignment';
  end if;
  insert into public.swap_pool (user_id, school_id, assignment_id, request_id)
  values (me, req.school_id, asg, req.id)
  on conflict (user_id) do update set assignment_id = excluded.assignment_id, request_id = excluded.request_id;
end;
$$;

-- A student answers an approved proposal. One decline cancels it for everyone.
create or replace function public.respond_swap(p_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  prop public.swap_proposals%rowtype;
  answers jsonb;
begin
  select * into prop from public.swap_proposals s where s.id = p_id and me = any (s.cycle) for update;
  if not found then
    raise exception 'not_found';
  end if;
  if prop.status <> 'staff_approved' then
    return 'not_pending';
  end if;
  answers := prop.responses || jsonb_build_object(me::text, p_accept);
  if not p_accept then
    update public.swap_proposals set responses = answers, status = 'declined', decided_at = now() where id = p_id;
    return 'declined';
  end if;
  if (select count(*) from unnest(prop.cycle) u where coalesce((answers ->> u::text)::boolean, false)) = cardinality(prop.cycle) then
    update public.swap_proposals set responses = answers, status = 'student_accepted', decided_at = now() where id = p_id;
    return 'accepted';
  end if;
  update public.swap_proposals set responses = answers where id = p_id;
  return 'waiting';
end;
$$;

revoke execute on function public.join_swap_pool() from public, anon;
revoke execute on function public.respond_swap(uuid, boolean) from public, anon;
grant execute on function public.join_swap_pool() to authenticated;
grant execute on function public.respond_swap(uuid, boolean) to authenticated;

-- Leaving the pool, closing the request or the assignment changing cancels live proposals.
create or replace function public.swap_invalidate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.swap_proposals s set status = 'cancelled', decided_at = now()
  where s.status in ('staff_pending', 'staff_approved', 'student_accepted')
    and old.user_id = any (s.cycle);
  return null;
end;
$$;

create trigger swap_pool_left after delete on public.swap_pool
  for each row execute function public.swap_invalidate();
create trigger swap_assignment_changed after update of closed_at, room, building on public.assignments
  for each row when (old.closed_at is null) execute function public.swap_invalidate();
