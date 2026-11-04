import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectByIds } from "@/lib/supabase/paginate";
import type { StaffContext } from "./context";

export interface SignedAgreementRow {
  groupId: string;
  groupName: string;
  building: string | null;
  signedAt: string;
  members: string[];
}

/**
 * Signed agreements staff may read (Phase 4): every member shares results with housing, and
 * for RAs the group lives in one of their buildings. Everything else stays a total.
 */
export async function visibleSignedAgreements(
  context: StaffContext,
): Promise<SignedAgreementRow[]> {
  const db = createAdminClient();
  const school = context.school.id;
  const { data: agreements } = await db
    .from("agreements")
    .select("group_id, member_ids, signed_at, groups!inner(name, school_id)")
    .eq("status", "signed")
    .eq("groups.school_id", school)
    .order("signed_at", { ascending: false })
    .limit(500);
  const rows = agreements ?? [];
  const members = [...new Set(rows.flatMap((a) => a.member_ids))];
  const [consents, profiles, assignments] = await Promise.all([
    selectByIds(members, (c, f, t) =>
      db
        .from("consents")
        .select("id, user_id")
        .eq("kind", "share_with_housing")
        .is("revoked_at", null)
        .in("user_id", c)
        .order("id")
        .range(f, t),
    ),
    selectByIds(members, (c, f, t) =>
      db
        .from("profiles")
        .select("id, first_name, last_initial")
        .in("id", c)
        .order("id")
        .range(f, t),
    ),
    selectByIds(members, (c, f, t) =>
      db
        .from("assignments")
        .select("id, user_id, building")
        .is("closed_at", null)
        .in("user_id", c)
        .order("id")
        .range(f, t),
    ),
  ]);
  const shared = new Set(consents.map((c) => c.user_id));
  const nameOf = new Map(profiles.map((p) => [p.id, `${p.first_name} ${p.last_initial}.`]));
  const buildingOf = new Map(assignments.map((a) => [a.user_id, a.building]));
  const raBuildings = context.role === "ra" ? new Set(context.scopes.buildings) : null;
  return rows
    .filter((a) => a.signed_at && a.member_ids.every((id) => shared.has(id)))
    .map((a) => ({
      groupId: a.group_id,
      groupName: (a.groups as unknown as { name: string }).name,
      building: a.member_ids.map((id) => buildingOf.get(id)).find(Boolean) ?? null,
      signedAt: a.signed_at!,
      members: a.member_ids.map((id) => nameOf.get(id) ?? "A student"),
    }))
    .filter((a) => !raBuildings || (a.building !== null && raBuildings.has(a.building)));
}

export async function loadCompletion(schoolId: string) {
  const { data } = await createClient().rpc("staff_agreement_completion", { p_school: schoolId });
  return (data ?? []).map((r) => ({
    building: r.building,
    groups: r.suppressed ? null : r.groups,
    signed: r.suppressed ? null : r.signed,
  }));
}
