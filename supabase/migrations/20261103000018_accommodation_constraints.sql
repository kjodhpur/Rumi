-- Phase 1.E: accommodation-aware matching. See docs/phase-1-e.md.
-- Housing staff (never students) attach an approved accommodation to a consented student.
-- Readable only by housing admins and housing staff whose scope includes accommodations
-- (the school's disability-coordination staff). Never RAs, analysts or students. The
-- engine reads these with the service role and applies them as hard constraints; other
-- students only ever see "housing requirement".

-- Which accommodations a school uses, and what it calls them. Keys are the ones the engine
-- understands (lib/safety/accommodations.ts).
create table public.accommodation_types (
  school_id  text not null references public.schools (id) on delete cascade,
  key        text not null check (key in ('esa_approved', 'single_bathroom', 'ground_floor', 'allergen_free', 'mobility_accessible')),
  label      text not null check (char_length(label) between 2 and 80),
  active     boolean not null default true,
  primary key (school_id, key)
);

create table public.accommodation_constraints (
  id              uuid primary key default gen_random_uuid(),
  school_id       text not null references public.schools (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  constraint_key  text not null,
  set_by          uuid references public.profiles (id) on delete set null,
  expires_on      date,
  note_enc        text check (note_enc is null or char_length(note_enc) <= 4000),
  -- Kept after the student stops sharing only when the school's policy requires it
  -- (needs legal review; see docs/phase-1-e.md).
  legal_hold      boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (user_id, constraint_key),
  foreign key (school_id, constraint_key) references public.accommodation_types (school_id, key)
);

create index accommodation_constraints_school_idx on public.accommodation_constraints (school_id, user_id);

alter table public.accommodation_types enable row level security;
alter table public.accommodation_constraints enable row level security;
revoke all on public.accommodation_types, public.accommodation_constraints from anon, authenticated;
grant select on public.accommodation_types, public.accommodation_constraints to authenticated;

create or replace function public.can_manage_accommodations(p_school text, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(p_school, array['housing_admin'], p_uid)
    or exists (
      select 1 from public.staff_members sm
      join public.profiles p on p.id = sm.user_id
      where sm.user_id = p_uid
        and sm.school_id = p_school
        and sm.disabled_at is null
        and sm.role = 'housing_staff'
        and coalesce((sm.scopes ->> 'accommodations')::boolean, false)
        and p.banned_at is null
    );
$$;

revoke execute on function public.can_manage_accommodations(text, uuid) from public, anon;
grant execute on function public.can_manage_accommodations(text, uuid) to authenticated;

create policy "accommodation_types: managers read" on public.accommodation_types
  for select to authenticated using (public.can_manage_accommodations(school_id));
create policy "accommodation_constraints: managers read" on public.accommodation_constraints
  for select to authenticated using (public.can_manage_accommodations(school_id));

insert into public.accommodation_types (school_id, key, label)
select s.id, t.key, t.label
from public.schools s
cross join (values
  ('esa_approved', 'Approved emotional support animal'),
  ('single_bathroom', 'Single-occupancy bathroom'),
  ('ground_floor', 'Ground floor'),
  ('allergen_free', 'Smoke- and allergen-free room'),
  ('mobility_accessible', 'Mobility-accessible room')
) as t (key, label)
on conflict do nothing;

-- Revoking share_with_housing removes accommodations unless a legal hold applies.
create or replace function public.consent_revoked_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'share_with_housing' and new.revoked_at is not null and old.revoked_at is null then
    delete from public.accommodation_constraints c where c.user_id = new.user_id and not c.legal_hold;
  end if;
  return new;
end;
$$;

create trigger consent_revoked_cleanup after update of revoked_at on public.consents
  for each row execute function public.consent_revoked_cleanup();
