-- Phase 2a: StarRez CSV export (export half). See docs/phase-2a.md.

-- Optional student ID, encrypted by the app (AES-256-GCM, TOKEN_ENCRYPTION_KEY). Owner-only table,
-- and deliberately outside the student-writable column grant: it's set through a server action.
alter table public.user_settings add column student_id_enc text check (char_length(student_id_enc) <= 512);

alter table public.pairings add column exported_at timestamptz;

create table public.integration_mappings (
  school_id  text not null references public.schools (id) on delete cascade,
  provider   text not null check (provider in ('starrez')),
  direction  text not null check (direction in ('export')),
  mapping    jsonb not null check (jsonb_typeof(mapping) = 'array'),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (school_id, provider, direction)
);

alter table public.integration_mappings enable row level security;
revoke all on public.integration_mappings from anon, authenticated;
grant select on public.integration_mappings to authenticated;
create policy "integration_mappings: housing admins read" on public.integration_mappings
  for select to authenticated using (public.has_role(school_id, array['housing_admin']));
