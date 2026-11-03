-- Phase 6 core: aggregate outcomes only. See docs/phase-6.md.

create or replace function public.staff_outcomes(p_school text)
returns table (
  groups_confirmed integer,
  agreements_signed integer,
  checkins_submitted integer,
  checkin_score_sum integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(p_school, array['housing_admin', 'housing_staff', 'analyst']) then
    raise exception 'not_allowed';
  end if;
  return query
  with confirmed as (
    select gr.id
    from public.groups gr
    where gr.school_id = p_school
      and (select count(*) from public.group_members x where x.group_id = gr.id) >= 2
      and exists (
        select 1 from public.group_members x
        where x.group_id = gr.id and public.has_consent(x.user_id, 'share_with_housing')
      )
  )
  select
    (select count(*)::integer from confirmed),
    (select count(*)::integer from public.agreements ag where ag.group_id in (select id from confirmed) and ag.status = 'signed'),
    (select count(*)::integer from public.checkins c
      join public.assignments a on a.id = c.assignment_id
      where a.school_id = p_school and c.submitted_at is not null and public.has_consent(c.user_id, 'checkins')),
    (select coalesce(sum(c.score), 0)::integer from public.checkins c
      join public.assignments a on a.id = c.assignment_id
      where a.school_id = p_school and c.submitted_at is not null and c.score is not null and public.has_consent(c.user_id, 'checkins'));
end;
$$;

revoke execute on function public.staff_outcomes(text) from public, anon;
grant execute on function public.staff_outcomes(text) to authenticated;
