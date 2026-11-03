-- Phase 4: roommate agreements. See docs/phase-4.md.

create table public.agreements (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null unique references public.groups (id) on delete cascade,
  version    integer not null default 1 check (version >= 1),
  status     text not null default 'draft' check (status in ('draft', 'signed', 'reopened', 'void')),
  member_ids uuid[] not null,
  signed_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agreement_sections (
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  key          text not null check (key ~ '^[a-z_]{2,32}$'),
  title        text not null check (char_length(title) <= 80),
  position     smallint not null,
  content      text not null check (char_length(content) <= 2000),
  proposed_by  uuid references public.profiles (id) on delete set null,
  accepted_by  uuid[] not null default '{}',
  updated_at   timestamptz not null default now(),
  primary key (agreement_id, key)
);

create table public.agreement_signatures (
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  version      integer not null,
  typed_name   text not null check (char_length(typed_name) between 2 and 80),
  signed_at    timestamptz not null default now(),
  primary key (agreement_id, user_id)
);

create table public.agreement_events (
  id           uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  kind         text not null check (kind in ('created', 'edited', 'accepted', 'signed', 'reopened', 'voided')),
  section_key  text,
  before       text,
  after        text,
  created_at   timestamptz not null default now()
);

create index agreement_events_agreement_idx on public.agreement_events (agreement_id, created_at desc);

alter table public.agreements           enable row level security;
alter table public.agreement_sections   enable row level security;
alter table public.agreement_signatures enable row level security;
alter table public.agreement_events     enable row level security;

revoke all on public.agreements, public.agreement_sections, public.agreement_signatures, public.agreement_events
  from anon, authenticated;
grant select on public.agreements, public.agreement_sections, public.agreement_signatures, public.agreement_events
  to authenticated;

create policy "agreements: group members read" on public.agreements
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));
create policy "agreement_sections: group members read" on public.agreement_sections
  for select to authenticated using (
    exists (select 1 from public.agreements a where a.id = agreement_id and public.is_group_member(a.group_id, auth.uid()))
  );
create policy "agreement_signatures: group members read" on public.agreement_signatures
  for select to authenticated using (
    exists (select 1 from public.agreements a where a.id = agreement_id and public.is_group_member(a.group_id, auth.uid()))
  );
create policy "agreement_events: group members read" on public.agreement_events
  for select to authenticated using (
    exists (select 1 from public.agreements a where a.id = agreement_id and public.is_group_member(a.group_id, auth.uid()))
  );

-- Staff see an agreement's status (never its text) beside each pairing.
drop function public.staff_pairings(text);
create or replace function public.staff_pairings(p_school text)
returns table (
  group_id uuid,
  name text,
  target_size smallint,
  created_at timestamptz,
  members jsonb,
  pair_scores jsonb,
  status text,
  staff_notes text,
  approved_at timestamptz,
  snapshot uuid[],
  agreement_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff']) then
    raise exception 'not_allowed';
  end if;
  return query
  with g as (
    select gr.id, gr.name, gr.target_size, gr.created_at
    from public.groups gr
    where gr.school_id = p_school
      and (select count(*) from public.group_members x where x.group_id = gr.id) >= 2
      and exists (
        select 1 from public.group_members x
        where x.group_id = gr.id and public.has_consent(x.user_id, 'share_with_housing')
      )
  )
  select g.id, g.name, g.target_size, g.created_at,
    (
      select jsonb_agg(jsonb_build_object(
        'id', gm.user_id,
        'shared', public.has_consent(gm.user_id, 'share_with_housing'),
        'firstName', case when public.has_consent(gm.user_id, 'share_with_housing') then p.first_name end,
        'lastInitial', case when public.has_consent(gm.user_id, 'share_with_housing') then p.last_initial end,
        'classYear', case when public.has_consent(gm.user_id, 'share_with_housing') then p.class_year end,
        'hidden', p.is_hidden,
        'joinedAt', gm.joined_at
      ) order by gm.role = 'owner' desc, gm.joined_at, gm.user_id)
      from public.group_members gm join public.profiles p on p.id = gm.user_id
      where gm.group_id = g.id
    ),
    (
      select coalesce(jsonb_agg(jsonb_build_object('a', a.user_id, 'b', b.user_id, 'score', ms.score)), '[]'::jsonb)
      from public.group_members a
      join public.group_members b on b.group_id = a.group_id and a.user_id < b.user_id
      left join public.match_scores ms on ms.viewer_id = a.user_id and ms.candidate_id = b.user_id
      where a.group_id = g.id
    ),
    coalesce(pa.status, 'unreviewed'), pa.staff_notes, pa.approved_at, pa.member_ids,
    (select ag.status from public.agreements ag where ag.group_id = g.id)
  from g
  left join public.pairings pa on pa.group_id = g.id
  order by g.created_at desc;
end;
$$;


revoke execute on function public.staff_pairings(text) from public, anon;
grant execute on function public.staff_pairings(text) to authenticated;
