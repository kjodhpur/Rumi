-- Phase 5.1: Smart Room-Swap Marketplace

create table public.swap_pool (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  school_id      text not null references public.schools (id) on delete cascade,
  reason         text check (char_length(reason) <= 500),
  opted_in_at    timestamptz not null default now(),
  unique (user_id)
);

create index swap_pool_school_idx on public.swap_pool (school_id, opted_in_at);

create table public.swap_proposals (
  id           uuid primary key default gen_random_uuid(),
  school_id    text not null references public.schools (id) on delete cascade,
  cycle        uuid[] not null,
  scores       jsonb not null,
  status       text not null default 'staff_pending'
               check (status in ('staff_pending', 'staff_approved', 'student_accepted', 'declined', 'cancelled', 'completed')),
  staff_notes  text check (char_length(staff_notes) <= 500),
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index swap_proposals_school_idx on public.swap_proposals (school_id, status);

alter table public.swap_pool enable row level security;
alter table public.swap_proposals enable row level security;

revoke all on public.swap_pool, public.swap_proposals from anon, authenticated;

grant select, insert, update, delete on public.swap_pool to authenticated;
grant select, update on public.swap_proposals to authenticated;

-- Policies: swap_pool
create policy "swap_pool: student read own" on public.swap_pool
  for select to authenticated using (user_id = auth.uid());

create policy "swap_pool: student upsert own" on public.swap_pool
  for insert to authenticated with check (user_id = auth.uid());

create policy "swap_pool: student delete own" on public.swap_pool
  for delete to authenticated using (user_id = auth.uid());

-- Policies: swap_proposals
create policy "swap_proposals: cycle participants read" on public.swap_proposals
  for select to authenticated using (auth.uid() = any(cycle));

create policy "swap_proposals: staff all" on public.swap_proposals
  for all to authenticated using (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid() and sm.school_id = swap_proposals.school_id
    )
  );
