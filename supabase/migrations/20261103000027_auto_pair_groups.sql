-- 1.C: auto-pair can propose groups of 3–4 as well as pairs. A group forms only when every
-- member says yes; anyone joining another group in the meantime invalidates the proposal.

alter table public.auto_pair_proposals drop constraint if exists auto_pair_proposals_member_ids_check;
alter table public.auto_pair_proposals
  add constraint auto_pair_proposals_member_ids_check check (cardinality(member_ids) between 2 and 4);
-- The weakest pair inside the proposal (score is the average across pairs).
alter table public.auto_pair_proposals add column if not exists min_score smallint check (min_score between 0 and 100);

create or replace function public.respond_housing_suggestion(p_id uuid, p_accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  r public.auto_pair_proposals%rowtype;
  v_group uuid;
  v_conversation uuid;
  v_name text;
  v_member uuid;
  v_size integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into r from public.auto_pair_proposals where id = p_id for update;
  if r.id is null or not (v_uid = any (r.member_ids)) then raise exception 'not_found'; end if;
  if r.status <> 'sent' then raise exception 'not_pending'; end if;

  if not p_accept then
    update public.auto_pair_proposals
    set status = 'declined', responses = responses || jsonb_build_object(v_uid::text, false)
    where id = r.id;
    return 'declined';
  end if;

  update public.auto_pair_proposals
  set responses = responses || jsonb_build_object(v_uid::text, true)
  where id = r.id
  returning * into r;

  -- Everyone has to say yes.
  foreach v_member in array r.member_ids loop
    if coalesce((r.responses ->> v_member::text)::boolean, false) is not true then
      return 'waiting';
    end if;
  end loop;

  -- Someone may have joined a group in the meantime (returning, not raising, keeps the status).
  if exists (select 1 from public.group_members where user_id = any (r.member_ids)) then
    update public.auto_pair_proposals set status = 'invalid' where id = r.id;
    return 'invalid';
  end if;

  v_size := cardinality(r.member_ids);
  select left(string_agg(public.first_name_of(m), case when v_size = 2 then ' & ' else ', ' end order by ord), 40)
    into v_name
  from unnest(r.member_ids) with ordinality as u(m, ord);
  insert into public.groups (school_id, name, owner_id, target_size, status)
  values (r.school_id, v_name, r.member_ids[1], v_size, 'full')
  returning id into v_group;
  insert into public.group_members (group_id, user_id, role)
  select v_group, m, case when ord = 1 then 'owner' else 'member' end
  from unnest(r.member_ids) with ordinality as u(m, ord);
  insert into public.conversations (kind, group_id) values ('group', v_group) returning id into v_conversation;
  insert into public.conversation_members (conversation_id, user_id)
  select v_conversation, m from unnest(r.member_ids) as u(m);
  insert into public.messages (conversation_id, kind, body)
  values (v_conversation, 'system',
          case when v_size = 2 then 'You both said yes to a housing suggestion. Say hi!'
               else 'Everyone said yes to a housing suggestion. Say hi!' end);
  update public.group_requests set status = 'cancelled', responded_at = now()
  where user_id = any (r.member_ids) and status = 'pending';

  update public.auto_pair_proposals set status = 'accepted', group_id = v_group where id = r.id;
  insert into public.notifications (user_id, type, actor_id, entity_id, title, body, href)
  select m, 'group_joined', null, v_group,
    case when v_size = 2
      then 'You and ' || public.first_name_of((select x from unnest(r.member_ids) x where x <> m limit 1)) || ' both said yes'
      else 'Your suggested group of ' || v_size || ' is together' end,
    'Your group chat is open.', '/groups/' || v_group
  from unnest(r.member_ids) as u(m);
  return 'accepted';
end;
$$;

revoke execute on function public.respond_housing_suggestion(uuid, boolean) from public, anon;
grant execute on function public.respond_housing_suggestion(uuid, boolean) to authenticated;
