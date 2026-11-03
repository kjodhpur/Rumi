import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { parseMapping, type ExportColumn, type ExportRow } from "./csv";

export interface ExportPreview {
  columns: ExportColumn[];
  rows: ExportRow[];
  groups: number;
  /** Approved groups left out, and why. */
  skipped: { name: string; reason: "not_shared" | "members_changed" }[];
  missingStudentIds: number;
}

export async function loadMapping(schoolId: string) {
  const { data } = await createAdminClient()
    .from("integration_mappings")
    .select("mapping")
    .eq("school_id", schoolId)
    .eq("provider", "starrez")
    .eq("direction", "export")
    .maybeSingle();
  return parseMapping(data?.mapping);
}

function safeDecrypt(token: string | null) {
  if (!token) return "";
  try {
    return decrypt(token);
  } catch {
    return "";
  }
}

/**
 * Approved pairings as StarRez roommate-group rows, one per student. A group is
 * exported only when every member chose to share, and only if its members haven't
 * changed since approval. The caller checks the staff role first.
 */
export async function buildStarRezExport(schoolId: string): Promise<ExportPreview & { pairingIds: string[] }> {
  const db = createAdminClient();
  const [columns, { data: pairings }, { data: term }] = await Promise.all([
    loadMapping(schoolId),
    db.from("pairings").select("id, group_id, member_ids").eq("school_id", schoolId).eq("status", "approved"),
    db.from("terms").select("name").eq("school_id", schoolId).eq("active", true).maybeSingle(),
  ]);
  const groupIds = (pairings ?? []).map((p) => p.group_id).filter((id): id is string => Boolean(id));
  const { data: groups } = groupIds.length
    ? await db.from("groups").select("id, name, owner_id, group_members(user_id)").in("id", groupIds)
    : { data: [] as { id: string; name: string; owner_id: string; group_members: { user_id: string }[] }[] };
  const memberIds = [...new Set((groups ?? []).flatMap((g) => g.group_members.map((m) => m.user_id)))];
  const [{ data: profiles }, { data: settings }, { data: consents }] = memberIds.length
    ? await Promise.all([
        db.from("profiles").select("id, first_name, last_initial").in("id", memberIds),
        db.from("user_settings").select("user_id, email, student_id_enc").in("user_id", memberIds),
        db.from("consents").select("user_id").eq("kind", "share_with_housing").is("revoked_at", null).in("user_id", memberIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const profileOf = new Map((profiles ?? []).map((p) => [p.id, p]));
  const settingsOf = new Map((settings ?? []).map((s) => [s.user_id, s]));
  const shared = new Set((consents ?? []).map((c) => c.user_id));
  const groupOf = new Map((groups ?? []).map((g) => [g.id, g]));

  const rows: ExportRow[] = [];
  const skipped: ExportPreview["skipped"] = [];
  const pairingIds: string[] = [];
  let missingStudentIds = 0;

  for (const pairing of pairings ?? []) {
    const group = pairing.group_id ? groupOf.get(pairing.group_id) : undefined;
    if (!group) continue;
    const members = group.group_members.map((m) => m.user_id);
    if ([...members].sort().join(",") !== [...pairing.member_ids].sort().join(",")) {
      skipped.push({ name: group.name, reason: "members_changed" });
      continue;
    }
    if (!members.every((id) => shared.has(id))) {
      skipped.push({ name: group.name, reason: "not_shared" });
      continue;
    }
    pairingIds.push(pairing.id);
    for (const id of members) {
      const profile = profileOf.get(id);
      const studentId = safeDecrypt(settingsOf.get(id)?.student_id_enc ?? null);
      if (!studentId) missingStudentIds += 1;
      rows.push({
        studentId,
        email: settingsOf.get(id)?.email ?? "",
        firstName: profile?.first_name ?? "",
        lastInitial: profile?.last_initial ?? "",
        groupName: group.name,
        groupId: group.id,
        groupLeader: group.owner_id === id ? "Y" : "N",
        groupSize: String(members.length),
        term: term?.name ?? "",
      });
    }
  }

  return { columns, rows, groups: pairingIds.length, skipped, missingStudentIds, pairingIds };
}
