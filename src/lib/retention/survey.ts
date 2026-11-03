import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAMPUS_TZ } from "@/lib/time";
import { evaluateRematchEligibility, surveyOpen, type RematchResult } from "./rematch";

export interface SurveyContext {
  term: { id: string; name: string; endsOn: string } | null;
  open: boolean;
  answered: { roomAgain: "yes" | "maybe" | "no"; score: number; frictionTags: string[]; biggestWin: string | null } | null;
  group: { id: string; name: string; memberIds: string[] } | null;
  /** Offered when a new term started and this group's previous-term answers allow it. */
  carryForward:
    | (RematchResult & { fromTermId: string; fromTermName: string; toTermName: string; keeps: Record<string, boolean>; names: Record<string, string> })
    | null;
}

export const campusToday = () => new Date().toLocaleDateString("en-CA", { timeZone: CAMPUS_TZ });

export async function loadSurveyContext(userId: string): Promise<SurveyContext> {
  const db = createAdminClient();
  const { data: me } = await db.from("profiles").select("school_id").eq("id", userId).maybeSingle();
  if (!me) return { term: null, open: false, answered: null, group: null, carryForward: null };
  const today = campusToday();
  const [{ data: active }, { data: membership }] = await Promise.all([
    db.from("terms").select("id, name, starts_on, ends_on").eq("school_id", me.school_id).eq("active", true).maybeSingle(),
    db.from("group_members").select("group_id, groups(name)").eq("user_id", userId).maybeSingle(),
  ]);
  let group: SurveyContext["group"] = null;
  if (membership) {
    const { data: members } = await db.from("group_members").select("user_id").eq("group_id", membership.group_id);
    group = { id: membership.group_id, name: (membership.groups as { name: string } | null)?.name ?? "Your group", memberIds: (members ?? []).map((m) => m.user_id) };
  }
  const { data: answer } = active
    ? await db.from("outcome_surveys").select("room_again, score, friction_tags, biggest_win").eq("user_id", userId).eq("term_id", active.id).maybeSingle()
    : { data: null };

  // Carry forward: the term before the active one, and this group's answers to it.
  let carryForward: SurveyContext["carryForward"] = null;
  if (active && group && group.memberIds.length >= 2) {
    const { data: previous } = await db
      .from("terms")
      .select("id, name")
      .eq("school_id", me.school_id)
      .eq("active", false)
      .lt("ends_on", active.starts_on)
      .order("ends_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previous) {
      const [{ data: answers }, { data: keeps }, { data: people }, { data: pairing }] = await Promise.all([
        db.from("outcome_surveys").select("user_id, room_again").eq("term_id", previous.id).in("user_id", group.memberIds),
        db.from("group_carry_forwards").select("user_id, keep").eq("group_id", group.id).eq("term_id", active.id),
        db.from("profiles").select("id, first_name").in("id", group.memberIds),
        db.from("pairings").select("term_id").eq("group_id", group.id).maybeSingle(),
      ]);
      const result = evaluateRematchEligibility(
        group.memberIds,
        (answers ?? []).map((a) => ({ userId: a.user_id, roomAgain: a.room_again as "yes" | "maybe" | "no" })),
      );
      const alreadyCarried = pairing?.term_id === active.id;
      if ((answers ?? []).length && !alreadyCarried) {
        carryForward = {
          ...result,
          fromTermId: previous.id,
          fromTermName: previous.name,
          toTermName: active.name,
          keeps: Object.fromEntries((keeps ?? []).map((k) => [k.user_id, k.keep])),
          names: Object.fromEntries((people ?? []).map((p) => [p.id, p.first_name])),
        };
      }
    }
  }

  return {
    term: active ? { id: active.id, name: active.name, endsOn: active.ends_on } : null,
    open: active ? surveyOpen(active.ends_on, today) : false,
    answered: answer
      ? { roomAgain: answer.room_again as "yes" | "maybe" | "no", score: answer.score, frictionTags: answer.friction_tags, biggestWin: answer.biggest_win }
      : null,
    group,
    carryForward,
  };
}
