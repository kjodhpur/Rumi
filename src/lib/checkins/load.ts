import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RiskLevel } from "@/lib/retention/risk";

export interface CheckinHome {
  assignment: { id: string; building: string; room: string | null; movedInAt: string } | null;
  next: { dueOn: string } | null;
  history: { score: number; tags: string[]; submittedAt: string }[];
  risk: { level: RiskLevel; reasons: string[] } | null;
  /** Tags from the latest check-in, for guided mediation. */
  latestTags: string[];
  /** The student's room agreement sections (key → text), for mediation prompts. */
  agreement: { groupId: string; status: string; sections: Record<string, string> } | null;
  conversationId: string | null;
  roomChange: { status: "open"; reasonKeys: string[]; inSwapPool: boolean } | null;
  reasons: { key: string; label: string }[];
  shareConsent: boolean;
  /** A staff-approved swap waiting on this student's answer. */
  swapOffer: { id: string; currentScore: number; newScore: number; answered: boolean } | null;
}

export async function loadCheckinHome(userId: string): Promise<CheckinHome> {
  const supabase = createClient();
  const [{ data: profile }, { data: assignment }] = await Promise.all([
    supabase.from("profiles").select("school_id").eq("id", userId).maybeSingle(),
    supabase.from("assignments").select("id, building, room, moved_in_at").eq("user_id", userId).is("closed_at", null).maybeSingle(),
  ]);
  const [{ data: reasons }, { data: consent }, { data: membership }, { data: request }, { data: pool }, { data: offers }] = await Promise.all([
    supabase.from("room_change_reasons").select("key, label").eq("school_id", profile?.school_id ?? "").eq("active", true).order("position"),
    supabase.from("consents").select("id").eq("user_id", userId).eq("kind", "checkins").is("revoked_at", null).maybeSingle(),
    supabase.from("group_members").select("group_id, groups(conversations(id))").eq("user_id", userId).maybeSingle(),
    supabase.from("room_change_requests").select("reason_keys").eq("user_id", userId).eq("status", "open").maybeSingle(),
    supabase.from("swap_pool").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase.from("swap_proposals").select("id, scores, responses").eq("status", "staff_approved").contains("cycle", [userId]).limit(1),
  ]);
  const offer = offers?.[0];
  const move = offer ? ((offer.scores as { moves?: Record<string, { currentScore: number; newScore: number }> } | null)?.moves ?? {})[userId] : undefined;
  const swapOffer = offer && move ? { id: offer.id, currentScore: move.currentScore, newScore: move.newScore, answered: userId in ((offer.responses ?? {}) as Record<string, boolean>) } : null;

  let agreement: CheckinHome["agreement"] = null;
  if (membership) {
    const { data: a } = await supabase.from("agreements").select("id, status").eq("group_id", membership.group_id).maybeSingle();
    if (a && a.status !== "void") {
      const { data: sections } = await supabase.from("agreement_sections").select("key, content").eq("agreement_id", a.id);
      agreement = { groupId: membership.group_id, status: a.status, sections: Object.fromEntries((sections ?? []).map((s) => [s.key, s.content])) };
    }
  }
  const conversations = (membership?.groups as { conversations: { id: string }[] | { id: string } | null } | null)?.conversations;
  const conversationId = Array.isArray(conversations) ? (conversations[0]?.id ?? null) : (conversations?.id ?? null);

  const base = {
    agreement,
    conversationId,
    roomChange: request ? { status: "open" as const, reasonKeys: request.reason_keys, inSwapPool: Boolean(pool) } : null,
    reasons: reasons ?? [],
    shareConsent: Boolean(consent),
    swapOffer,
  };
  if (!assignment) return { assignment: null, next: null, history: [], risk: null, latestTags: [], ...base };

  const [{ data: checkins }, { data: risk }] = await Promise.all([
    supabase.from("checkins").select("due_on, score, tags, submitted_at").eq("assignment_id", assignment.id).order("due_on"),
    supabase.from("risk_events").select("level, reasons").eq("assignment_id", assignment.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const rows = checkins ?? [];
  const submitted = rows.filter((r) => r.submitted_at && r.score !== null).sort((a, b) => a.submitted_at!.localeCompare(b.submitted_at!));
  const next = rows.find((r) => !r.submitted_at);
  return {
    assignment: { id: assignment.id, building: assignment.building, room: assignment.room, movedInAt: assignment.moved_in_at },
    next: next ? { dueOn: next.due_on } : null,
    history: submitted.map((r) => ({ score: r.score!, tags: r.tags, submittedAt: r.submitted_at! })),
    risk: risk ? { level: risk.level as RiskLevel, reasons: risk.reasons } : null,
    latestTags: submitted.at(-1)?.tags ?? [],
    ...base,
  };
}
