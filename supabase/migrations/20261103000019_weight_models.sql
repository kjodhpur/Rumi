-- Phase 1.G: Outcome-Trained Factor Weight Models

create table if not exists public.weight_models (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools (id) on delete cascade,
  trained_on_terms  uuid[] not null default '{}',
  coefficients      jsonb not null,
  metrics           jsonb not null,
  status            text not null default 'suggested' check (status in ('suggested', 'adopted', 'retired')),
  adopted_by        uuid references public.profiles (id) on delete set null,
  adopted_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists weight_models_school_status_idx
  on public.weight_models (school_id, status);

alter table public.weight_models enable row level security;
revoke all on public.weight_models from anon, authenticated;
grant select, insert, update, delete on public.weight_models to authenticated;

create policy "weight_models: housing_admin manage" on public.weight_models
  for all to authenticated using (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = weight_models.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  )
  with check (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = weight_models.school_id
        and sm.disabled_at is null
        and sm.role = 'housing_admin'
    )
  );

create policy "weight_models: staff read" on public.weight_models
  for select to authenticated using (
    exists (
      select 1 from public.staff_members sm
      where sm.user_id = auth.uid()
        and sm.school_id = weight_models.school_id
        and sm.disabled_at is null
        and sm.role in ('housing_admin', 'housing_staff', 'analyst')
    )
  );
