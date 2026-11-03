-- Phase 7.2: count of mutual connections. See docs/phase-7-2.md.
-- A person counts only when both students know them (accepted intro or shared group)
-- and that person, plus both students, turned on social_verification.

create or replace function public.mutual_count(p_other uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null or viewer = p_other then
    return 0;
  end if;
  if not public.has_consent(viewer, 'social_verification') or not public.has_consent(p_other, 'social_verification') then
    return 0;
  end if;
  return (
    select count(distinct mine.person)::integer
    from (
      select i.sender_id as user_id, i.recipient_id as person from public.intros i where i.status = 'accepted'
      union
      select i.recipient_id, i.sender_id from public.intros i where i.status = 'accepted'
      union
      select a.user_id, b.user_id
      from public.group_members a
      join public.group_members b on b.group_id = a.group_id and b.user_id <> a.user_id
    ) mine
    join (
      select i.sender_id as user_id, i.recipient_id as person from public.intros i where i.status = 'accepted'
      union
      select i.recipient_id, i.sender_id from public.intros i where i.status = 'accepted'
      union
      select a.user_id, b.user_id
      from public.group_members a
      join public.group_members b on b.group_id = a.group_id and b.user_id <> a.user_id
    ) theirs on theirs.person = mine.person and theirs.user_id = p_other
    where mine.user_id = viewer
      and mine.person <> viewer
      and mine.person <> p_other
      and public.has_consent(mine.person, 'social_verification')
  );
end;
$$;

revoke execute on function public.mutual_count(uuid) from public, anon;
grant execute on function public.mutual_count(uuid) to authenticated;
