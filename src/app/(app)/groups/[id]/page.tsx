import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { LeaveGroupButton } from "@/components/groups/leave-group-button";
import { GroupHousingForm } from "@/components/groups/group-housing-form";
import { InviteMemberForm } from "@/components/groups/invite-member-form";

export default async function GroupDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", params.id)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!membership) notFound();

  const [{ data: group }, { data: members }, { data: housing }] = await Promise.all([
    supabase.from("groups").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("group_members").select("user_id, role, joined_at").eq("group_id", params.id),
    supabase.from("group_housing_prefs").select("*").eq("group_id", params.id).maybeSingle(),
  ]);

  if (!group) notFound();

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_initial, photo_url")
    .in("id", memberIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Invite candidates: saved profiles + accepted intros not already in group
  const memberSet = new Set(memberIds);
  const [{ data: saved }, { data: acceptedIntros }] = await Promise.all([
    supabase.from("saved_profiles").select("saved_id").eq("user_id", user!.id),
    supabase
      .from("intros")
      .select("from_user_id, to_user_id")
      .eq("status", "accepted")
      .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`),
  ]);
  const candidateIds = new Set<string>();
  for (const s of saved ?? []) if (!memberSet.has(s.saved_id)) candidateIds.add(s.saved_id);
  for (const i of acceptedIntros ?? []) {
    const other = i.from_user_id === user!.id ? i.to_user_id : i.from_user_id;
    if (!memberSet.has(other)) candidateIds.add(other);
  }
  const candList = [...candidateIds].slice(0, 12);
  const { data: candProfiles } = candList.length
    ? await supabase.from("profiles").select("id, first_name, last_initial").in("id", candList)
    : { data: [] };
  const inviteCandidates = (candProfiles ?? []).map((p) => ({
    id: p.id,
    label: `${p.first_name} ${p.last_initial}.`,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">
            <Link href="/groups" className="hover:text-accent">
              Groups
            </Link>{" "}
            / {group.name}
          </p>
          <h1 className="font-ui mt-1 text-3xl font-bold tracking-brand text-ink">{group.name}</h1>
          <p className="capitalize text-ink-muted">
            {group.status} · max {group.max_members}
          </p>
        </div>
        <LeaveGroupButton groupId={group.id} />
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1">
        <h2 className="font-ui text-lg font-semibold">Members</h2>
        <ul className="space-y-2">
          {(members ?? []).map((m) => {
            const p = profileMap.get(m.user_id);
            return (
              <li key={m.user_id} className="flex items-center justify-between text-sm">
                <Link href={`/profile/${m.user_id}`} className="font-medium text-accent hover:underline">
                  {p ? displayName(p.first_name, p.last_initial) : m.user_id.slice(0, 8)}
                </Link>
                <span className="capitalize text-ink-muted">{m.role}</span>
              </li>
            );
          })}
        </ul>
        {membership.role === "owner" ? (
          <InviteMemberForm groupId={group.id} candidates={inviteCandidates} />
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1">
        <h2 className="font-ui text-lg font-semibold">Shared housing prefs</h2>
        <GroupHousingForm
          groupId={group.id}
          initial={{
            budgetMin: housing?.budget_min ?? 600,
            budgetMax: housing?.budget_max ?? 1200,
            preferredAreas: housing?.preferred_areas ?? [],
            moveInDate: housing?.move_in_date ?? null,
            bedroomsWanted: housing?.bedrooms_wanted ?? 2,
          }}
        />
      </section>
    </div>
  );
}
