import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMutualSummary } from "./mutuals";
import { displayName } from "./utils";
import type { MutualSummary } from "./types";

/** Load mutual/trust summary between viewer and target (D8). */
export async function loadMutualSummary(
  supabase: SupabaseClient,
  viewerId: string,
  targetId: string,
): Promise<MutualSummary> {
  const [a, b] = viewerId < targetId ? [viewerId, targetId] : [targetId, viewerId];

  const [{ data: edges }, { data: viewerLinks }, { data: targetLinks }, { data: viewerOrgs }, { data: targetOrgs }] =
    await Promise.all([
      supabase
        .from("connection_edges")
        .select("user_a, user_b, source, strength, meta")
        .eq("user_a", a)
        .eq("user_b", b),
      supabase.from("social_links").select("provider, handle").eq("user_id", viewerId),
      supabase.from("social_links").select("provider, handle").eq("user_id", targetId),
      supabase
        .from("profile_orgs")
        .select("org_id, campus_orgs(name)")
        .eq("user_id", viewerId),
      supabase
        .from("profile_orgs")
        .select("org_id, campus_orgs(name)")
        .eq("user_id", targetId),
    ]);

  // Friends-of-friends via accepted intros
  const { data: viewerIntros } = await supabase
    .from("intros")
    .select("from_user_id, to_user_id")
    .eq("status", "accepted")
    .or(`from_user_id.eq.${viewerId},to_user_id.eq.${viewerId}`);

  const viewerFriendIds = new Set<string>();
  for (const i of viewerIntros ?? []) {
    viewerFriendIds.add(i.from_user_id === viewerId ? i.to_user_id : i.from_user_id);
  }
  viewerFriendIds.delete(targetId);

  let mutualFriends: Array<{ id: string; name: string; photoUrl?: string | null }> = [];
  if (viewerFriendIds.size) {
    const friendIds = [...viewerFriendIds];
    const { data: targetIntros } = await supabase
      .from("intros")
      .select("from_user_id, to_user_id")
      .eq("status", "accepted")
      .or(`from_user_id.eq.${targetId},to_user_id.eq.${targetId}`);

    const targetFriends = new Set<string>();
    for (const i of targetIntros ?? []) {
      targetFriends.add(i.from_user_id === targetId ? i.to_user_id : i.from_user_id);
    }

    const mutualIds = friendIds.filter((id) => targetFriends.has(id)).slice(0, 8);
    if (mutualIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_initial, photo_url")
        .in("id", mutualIds);
      mutualFriends = (profiles ?? []).map((p) => ({
        id: p.id,
        name: displayName(p.first_name, p.last_initial),
        photoUrl: p.photo_url,
      }));
    }
  }

  const mapOrgs = (
    rows: Array<{ org_id: string; campus_orgs: { name: string } | { name: string }[] | null }> | null,
  ) =>
    (rows ?? []).map((r) => {
      const org = Array.isArray(r.campus_orgs) ? r.campus_orgs[0] : r.campus_orgs;
      return { org_id: r.org_id, name: org?.name ?? "Org" };
    });

  return buildMutualSummary({
    viewerId,
    targetId,
    edges: (edges ?? []).map((e) => ({
      user_a: e.user_a,
      user_b: e.user_b,
      source: e.source,
      strength: e.strength,
      meta: (e.meta ?? {}) as Record<string, unknown>,
    })),
    viewerLinks: viewerLinks ?? [],
    targetLinks: targetLinks ?? [],
    viewerOrgs: mapOrgs(viewerOrgs as never),
    targetOrgs: mapOrgs(targetOrgs as never),
    mutualFriends,
  });
}

/** Batch mutual counts for match cards. */
export async function loadMutualCounts(
  supabase: SupabaseClient,
  viewerId: string,
  otherIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!otherIds.length) return map;

  // Cheap signal: connection_edges involving viewer + other, plus shared orgs count later
  const { data: edges } = await supabase
    .from("connection_edges")
    .select("user_a, user_b, source")
    .or(`user_a.eq.${viewerId},user_b.eq.${viewerId}`);

  for (const id of otherIds) map.set(id, 0);

  for (const e of edges ?? []) {
    const otherId = e.user_a === viewerId ? e.user_b : e.user_b === viewerId ? e.user_a : null;
    if (otherId && map.has(otherId)) {
      map.set(otherId, (map.get(otherId) ?? 0) + 1);
    }
  }

  // Shared campus orgs
  const { data: viewerOrgs } = await supabase
    .from("profile_orgs")
    .select("org_id")
    .eq("user_id", viewerId);
  const viewerOrgSet = new Set((viewerOrgs ?? []).map((o) => o.org_id));
  if (viewerOrgSet.size) {
    const { data: theirOrgs } = await supabase
      .from("profile_orgs")
      .select("user_id, org_id")
      .in("user_id", otherIds);
    for (const row of theirOrgs ?? []) {
      if (viewerOrgSet.has(row.org_id) && map.has(row.user_id)) {
        map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
      }
    }
  }

  // Prefer match_cache.mutual_count when present
  const { data: cache } = await supabase
    .from("match_cache")
    .select("other_id, mutual_count")
    .eq("user_id", viewerId)
    .in("other_id", otherIds);
  for (const row of cache ?? []) {
    if (typeof row.mutual_count === "number" && row.mutual_count > 0) {
      map.set(row.other_id, Math.max(map.get(row.other_id) ?? 0, row.mutual_count));
    }
  }

  return map;
}
