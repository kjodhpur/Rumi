"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { dispatchMany } from "@/lib/notifications/dispatch";
import { findSwapCycles, pickDisjoint, type SwapCandidate } from "@/lib/matching/swaps";
import type { Json } from "@/types/database";

const uuid = z.string().uuid();
const schoolId = z.string().regex(/^[a-z0-9-]{2,32}$/);

// ─────────────────────────────────────────────────────────────────────────────
// Students
// ─────────────────────────────────────────────────────────────────────────────

export async function joinSwapPool(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`swap:${user.id}`, LIMITS.swapActionsPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const { error } = await createClient().rpc("join_swap_pool");
  if (error) return fail(friendlyDbError(error.message));
  revalidatePath("/check-in");
  return ok();
}

/** Leaving cancels any live proposal you're in (database trigger). */
export async function leaveSwapPool(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  const { error } = await createClient().from("swap_pool").delete().eq("user_id", user.id);
  if (error) return fail("Couldn't leave the pool.");
  revalidatePath("/check-in");
  return ok();
}

export async function respondToSwap(
  proposalId: string,
  accept: boolean,
): Promise<ActionResult<{ result: string }>> {
  if (!uuid.safeParse(proposalId).success || typeof accept !== "boolean")
    return fail("That swap isn't available.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`swap:${user.id}`, LIMITS.swapActionsPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const { data, error } = await createClient().rpc("respond_swap", {
    p_id: proposalId,
    p_accept: accept,
  });
  if (error) return fail(friendlyDbError(error.message));
  const db = createAdminClient();
  const { data: proposal } = await db
    .from("swap_proposals")
    .select("school_id, cycle")
    .eq("id", proposalId)
    .maybeSingle();
  if (proposal && (data === "declined" || data === "accepted")) {
    const others = proposal.cycle.filter((id) => id !== user.id);
    await dispatchMany(
      "checkins",
      others.map((id) => ({
        userId: id,
        type: "swap_proposal",
        entityId: proposalId,
        title:
          data === "declined" ? "A room swap was called off" : "Everyone accepted the room swap",
        body:
          data === "declined"
            ? "Someone in the swap said no, so it's cancelled."
            : "Your housing office will confirm the move.",
        href: "/check-in",
      })),
    );
  }
  revalidatePath("/check-in");
  revalidatePath("/staff/swaps");
  return ok({ result: data ?? "waiting" });
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff (housing_admin, housing_staff)
// ─────────────────────────────────────────────────────────────────────────────

/** Finds 2- and 3-way swaps in the pool. Existing pending proposals are replaced. */
export async function runSwapFinder(
  school: string,
): Promise<ActionResult<{ proposals: number; pool: number }>> {
  if (!schoolId.safeParse(school).success) return fail("Pick a school.");
  const actorId = await assertRole(school, "managePairings");
  if (!actorId) return fail("Only housing staff can run swaps.");
  if (!(await rateLimit(`staff-write:${actorId}`, LIMITS.staffWritesPerHour)))
    return fail("Too many changes. Try again in a bit.");

  const db = createAdminClient();
  const { data: pool } = await db
    .from("swap_pool")
    .select("user_id, assignment_id")
    .eq("school_id", school);
  const { data: assignments } = await db
    .from("assignments")
    .select("id, user_id, building, room")
    .eq("school_id", school)
    .is("closed_at", null);
  const byRoom = new Map<string, string[]>();
  for (const a of assignments ?? []) {
    if (!a.room) continue;
    const key = `${a.building}|${a.room}`;
    byRoom.set(key, [...(byRoom.get(key) ?? []), a.user_id]);
  }
  const assignmentOf = new Map((assignments ?? []).map((a) => [a.id, a]));

  // Only two-person rooms where the roommate is known can be swapped.
  const pairs: { userId: string; assignmentId: string; roommateId: string }[] = [];
  for (const p of pool ?? []) {
    const a = assignmentOf.get(p.assignment_id);
    if (!a?.room) continue;
    const mates = (byRoom.get(`${a.building}|${a.room}`) ?? []).filter((id) => id !== p.user_id);
    if (mates.length === 1)
      pairs.push({ userId: p.user_id, assignmentId: a.id, roommateId: mates[0]! });
  }
  const people = [...new Set(pairs.flatMap((p) => [p.userId, p.roommateId]))];
  const { data: scores } = people.length
    ? await db
        .from("match_scores")
        .select("viewer_id, candidate_id, score")
        .in("viewer_id", people)
        .in("candidate_id", people)
    : { data: [] };
  const scoreOf = new Map((scores ?? []).map((s) => [`${s.viewer_id}|${s.candidate_id}`, s.score]));
  const compat = (x: string, y: string) => scoreOf.get(`${x}|${y}`) ?? null;
  const candidates: SwapCandidate[] = pairs.map((p) => ({
    ...p,
    currentScore: compat(p.userId, p.roommateId) ?? 0,
  }));

  const chosen = pickDisjoint(findSwapCycles(candidates, compat));
  await db
    .from("swap_proposals")
    .update({ status: "cancelled", decided_at: new Date().toISOString() })
    .eq("school_id", school)
    .eq("status", "staff_pending");
  if (chosen.length) {
    const { error } = await db.from("swap_proposals").insert(
      chosen.map((c) => ({
        school_id: school,
        cycle: c.cycle,
        assignment_ids: c.cycle.map((id) => candidates.find((x) => x.userId === id)!.assignmentId),
        scores: {
          moves: c.moves,
          stayers: c.stayers,
          averageDelta: c.averageDelta,
        } as unknown as NonNullable<Json>,
      })),
    );
    if (error) return fail("Couldn't save the proposals.");
  }
  await logAudit({
    actorId,
    schoolId: school,
    action: "swap_finder_run",
    entity: "swap_proposals",
    meta: { pool: pool?.length ?? 0, proposals: chosen.length },
  });
  revalidatePath("/staff/swaps");
  return ok({ proposals: chosen.length, pool: pool?.length ?? 0 });
}

const decideInput = z.object({
  schoolId,
  proposalId: uuid,
  approve: z.boolean(),
  notes: z
    .string()
    .max(500)
    .transform((v) => cleanText(v))
    .optional(),
});

/** Approve sends the proposal to the students; decline closes it. */
export async function decideSwapProposal(raw: z.input<typeof decideInput>): Promise<ActionResult> {
  const parsed = decideInput.safeParse(raw);
  if (!parsed.success) return fail("Check the proposal.");
  const { schoolId: school, proposalId, approve, notes } = parsed.data;
  const actorId = await assertRole(school, "managePairings");
  if (!actorId) return fail("Only housing staff can review swaps.");
  const db = createAdminClient();
  const { data, error } = await db
    .from("swap_proposals")
    .update({
      status: approve ? "staff_approved" : "declined",
      staff_notes: notes || null,
      approved_by: approve ? actorId : null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .eq("school_id", school)
    .eq("status", "staff_pending")
    .select("cycle")
    .maybeSingle();
  if (error || !data) return fail("That proposal was already decided.");
  if (approve) {
    await dispatchMany(
      "checkins",
      data.cycle.map((id) => ({
        userId: id,
        type: "swap_proposal",
        entityId: proposalId,
        title: "Housing suggested a room swap",
        body: "Every match in it gets better. Take a look and say yes or no.",
        href: "/check-in",
      })),
    );
  }
  await logAudit({
    actorId,
    schoolId: school,
    action: approve ? "swap_approved" : "swap_declined",
    entity: "swap_proposal",
    entityId: proposalId,
  });
  revalidatePath("/staff/swaps");
  return ok();
}

/** After staff carry out the move in the housing system. */
export async function completeSwap(school: string, proposalId: string): Promise<ActionResult> {
  if (!schoolId.safeParse(school).success || !uuid.safeParse(proposalId).success)
    return fail("Check the proposal.");
  const actorId = await assertRole(school, "managePairings");
  if (!actorId) return fail("Only housing staff can complete swaps.");
  const db = createAdminClient();
  const { data, error } = await db
    .from("swap_proposals")
    .update({ status: "completed", decided_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("school_id", school)
    .eq("status", "student_accepted")
    .select("cycle")
    .maybeSingle();
  if (error || !data) return fail("Only accepted swaps can be marked done.");
  // The requests are resolved and the students leave the pool.
  await db
    .from("room_change_requests")
    .update({ status: "moved", closed_at: new Date().toISOString() })
    .in("user_id", data.cycle)
    .eq("status", "open");
  await db.from("swap_pool").delete().in("user_id", data.cycle);
  await logAudit({
    actorId,
    schoolId: school,
    action: "swap_completed",
    entity: "swap_proposal",
    entityId: proposalId,
  });
  revalidatePath("/staff/swaps");
  return ok();
}
