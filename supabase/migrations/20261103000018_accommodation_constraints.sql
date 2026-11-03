-- Phase 1.E: Accessibility & Accommodation-Aware Matching

create table if not exists public.accommodation_constraints (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  constraint_key  text not null check (constraint_key in ('esa_approved', 'single_bathroom', 'ground_floor', 'allergen_free', 'mobility_accessible')),
  set_by          uuid not null references public.profiles (id) on delete cascade,
  expires_on      date,
  note_enc        text,
  created_at      timestamptz not null default now(),
  unique (user_id, constraint_key)
);

create index if not exists accommodation_constraints_school_idx
  on public.accommodation_constraints (school_id, user_id);

alter table public.accommodation_constraints enable row level security;
revoke all on public.accommodation_constraints from anon, authenticated;
grant select, insert, update, delete on public.accommodation_constraints to authenticated;

-- Only housing_admin for that school can view/manage accommodation constraints
create policy "accommodation_constraints: housing_admin manage" on public.accommodation_constraints
  for all to authenticated using (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = accommodation_constraints.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  )
  with check (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = accommodation_constraints.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  );
