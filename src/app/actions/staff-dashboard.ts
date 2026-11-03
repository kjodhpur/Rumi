"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRole } from "@/lib/staff/context";
import { logAudit } from "@/lib/staff/audit";
import { assignPairs } from "@/lib/matching/assign";
import { parseMapping } from "@/lib/integrations/starrez/csv";
import { sendEmail } from "@/lib/email/send";
import { housingNudgeEmail, housingSuggestionEmail } from "@/lib/email/templates";
import { cleanText } from "@/lib/sanitize";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { firstError } from "@/lib/validation";
import { fail, ok, type ActionResult } from "@/lib/action";
import type { Json } from "@/types/database";

const schoolId = z.string().regex(/^[a-z0-9-]{2,32}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date.");
const optionalDate = z.union([isoDate, z.literal("")]).transform((v) => v || undefined);

async function officeName(school: string) {
  const { data } = await createAdminClient().from("schools").select("housing_office_name").eq("id", school).single();
  return data?.housing_office_name ?? "Your housing office";
}

// ─────────────────────────────────────────────────────────────────────────────
// Term
// ─────────────────────────────────────────────────────────────────────────────

const termInput = z
  .object({
    schoolId,
    name: z.string().transform((v) => cleanText(v, { multiline: false })).pipe(z.string().min(1, "Name the term.").max(60)),
    startsOn: isoDate,
    endsOn: isoDate,
    roommateRequest: optionalDate,
    selectionOpens: optionalDate,
    selectionCloses: optionalDate,
  })
  .refine((t) => t.endsOn > t.startsOn, { message: "The term has to end after it starts.", path: ["endsOn"] })
  .refine((t) => !t.selectionOpens || !t.selectionCloses || t.selectionCloses >= t.selectionOpens, {
    message: "Room selection can't close before it opens.",
    path: ["selectionCloses"],
  });

export async function saveTerm(raw: z.input<typeof termInput>): Promise<ActionResult> {
  const parsed = termInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const t = parsed.data;
  const actorId = await assertRole(t.schoolId, "configureTerm");
  if (!actorId) return fail("Only housing admins can set up terms.");
  const db = createAdminClient();
  const deadlines = { roommateRequest: t.roommateRequest, selectionOpens: t.selectionOpens, selectionCloses: t.selectionCloses };
  const { data: existing } = await db.from("terms").select("id").eq("school_id", t.schoolId).eq("active", true).maybeSingle();
  const row = { name: t.name, starts_on: t.startsOn, ends_on: t.endsOn, deadlines: deadlines as NonNullable<Json> };
  const { error } = existing
    ? await db.from("terms").update(row).eq("id", existing.id)
    : await db.from("terms").insert({ ...row, school_id: t.schoolId, created_by: actorId });
  if (error) return fail("Couldn't save the term.");
  await logAudit({ actorId, schoolId: t.schoolId, action: existing ? "term_updated" : "term_created", entity: "term", meta: { name: t.name } });
  revalidatePath("/staff", "layout");
  return ok();
}

// ─────────────────────────────────────────────────────────────────────────────
// Pairing review
// ─────────────────────────────────────────────────────────────────────────────

const reviewInput = z.object({
  schoolId,
  groupIds: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(["approved", "needs_review", "unreviewed"]),
});

export async function setPairingStatus(raw: z.input<typeof reviewInput>): Promise<ActionResult<{ updated: number }>> {
  const parsed = reviewInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { schoolId: school, groupIds, status } = parsed.data;
  const actorId = await assertRole(school, "managePairings");
  if (!actorId) return fail("Only housing staff can review pairings.");
  const db = createAdminClient();
  const { data: groups } = await db.from("groups").select("id, group_members(user_id)").eq("school_id", school).in("id", groupIds);
  const now = new Date().toISOString();
  const rows = (groups ?? []).map((g) => ({
    school_id: school,
    group_id: g.id,
    member_ids: (g.group_members ?? []).map((m) => m.user_id),
    status,
    approved_by: status === "approved" ? actorId : null,
    approved_at: status === "approved" ? now : null,
    updated_by: actorId,
    updated_at: now,
  }));
  if (rows.length === 0) return fail("Those groups no longer exist.");
  const { error } = await db.from("pairings").upsert(rows, { onConflict: "group_id" });
  if (error) return fail("Couldn't update those pairings.");
  await logAudit({ actorId, schoolId: school, action: `pairing_${status}`, entity: "pairing", meta: { count: rows.length, groups: groupIds } });
  revalidatePath("/staff/pairings");
  return ok({ updated: rows.length });
}

const noteInput = z.object({
  schoolId,
  groupId: z.string().uuid(),
  notes: z.string().max(2000).transform((v) => cleanText(v)),
});

export async function savePairingNote(raw: z.input<typeof noteInput>): Promise<ActionResult> {
  const parsed = noteInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { schoolId: school, groupId, notes } = parsed.data;
  const actorId = await assertRole(school, "managePairings");
  if (!actorId) return fail("Only housing staff can add notes.");
  const db = createAdminClient();
  const { data: group } = await db.from("groups").select("id, group_members(user_id)").eq("id", groupId).eq("school_id", school).maybeSingle();
  if (!group) return fail("That group no longer exists.");
  const { data: existing } = await db.from("pairings").select("id").eq("group_id", groupId).maybeSingle();
  const { error } = existing
    ? await db.from("pairings").update({ staff_notes: notes || null, updated_by: actorId, updated_at: new Date().toISOString() }).eq("id", existing.id)
    : await db.from("pairings").insert({
        school_id: school,
        group_id: groupId,
        member_ids: (group.group_members ?? []).map((m) => m.user_id),
        staff_notes: notes || null,
        updated_by: actorId,
      });
  if (error) return fail("Couldn't save the note.");
  await logAudit({ actorId, schoolId: school, action: "pairing_note", entity: "pairing", entityId: groupId });
  revalidatePath("/staff/pairings");
  return ok();
}

// ─────────────────────────────────────────────────────────────────────────────
// Nudges
// ─────────────────────────────────────────────────────────────────────────────

const NUDGE_COOLDOWN_DAYS = 7;
const nudgeInput = z.object({ schoolId, userIds: z.array(z.string().uuid()).min(1).max(500) });

export async function sendNudges(raw: z.input<typeof nudgeInput>): Promise<ActionResult<{ sent: number; skipped: number }>> {
  const parsed = nudgeInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { schoolId: school, userIds } = parsed.data;
  const actorId = await assertRole(school, "viewStudents");
  if (!actorId) return fail("Only housing staff can send nudges.");
  if (!(await rateLimit(`nudge:${school}`, LIMITS.nudgeCampaignsPerDay))) {
    return fail("That's the most nudges for one day. Try again tomorrow.");
  }

  const db = createAdminClient();
  // Only sharing, onboarded students of this school who aren't in a pair or group.
  const [{ data: eligible }, { data: recent }] = await Promise.all([
    db.rpc("school_students", { p_school: school }).select("id").in("id", userIds).not("onboarding_completed_at", "is", null),
    db
      .from("campaign_sends")
      .select("user_id")
      .in("user_id", userIds)
      .gte("sent_at", new Date(Date.now() - NUDGE_COOLDOWN_DAYS * 86_400_000).toISOString()),
  ]);
  const { data: consents } = await db
    .from("consents")
    .select("user_id")
    .eq("kind", "share_with_housing")
    .is("revoked_at", null)
    .in("user_id", userIds);
  const { data: grouped } = await db.from("group_members").select("user_id, group_id").in("user_id", userIds);
  const groupSizes = new Map<string, number>();
  if (grouped?.length) {
    const { data: all } = await db.from("group_members").select("group_id").in("group_id", grouped.map((g) => g.group_id));
    for (const row of all ?? []) groupSizes.set(row.group_id, (groupSizes.get(row.group_id) ?? 0) + 1);
  }
  const inPair = new Set((grouped ?? []).filter((g) => (groupSizes.get(g.group_id) ?? 0) >= 2).map((g) => g.user_id));
  const shared = new Set((consents ?? []).map((c) => c.user_id));
  const cooled = new Set((recent ?? []).map((r) => r.user_id));
  const targets = ((eligible ?? []) as { id: string }[])
    .map((s) => s.id)
    .filter((id) => shared.has(id) && !inPair.has(id) && !cooled.has(id));
  if (targets.length === 0) return fail(`Everyone selected was nudged in the last ${NUDGE_COOLDOWN_DAYS} days or isn't eligible.`);

  const { data: campaign, error } = await db
    .from("campaigns")
    .insert({ school_id: school, kind: "nudge", audience_count: targets.length, created_by: actorId })
    .select("id")
    .single();
  if (error || !campaign) return fail("Couldn't send the nudge.");

  const office = await officeName(school);
  const { data: settings } = await db
    .from("user_settings")
    .select("user_id, email, notify_email_matches, notify_inapp_matches")
    .in("user_id", targets);
  await db.from("campaign_sends").insert(targets.map((user_id) => ({ campaign_id: campaign.id, user_id })));
  await db.from("notifications").insert(
    (settings ?? [])
      .filter((s) => s.notify_inapp_matches)
      .map((s) => ({
        user_id: s.user_id,
        type: "housing_nudge",
        title: "Still looking for a roommate?",
        body: `${office} wanted to make sure you've seen your best matches.`,
        href: "/matches",
      })),
  );
  for (const s of settings ?? []) {
    if (s.notify_email_matches) await sendEmail({ to: s.email, ...housingNudgeEmail(office) });
  }
  await logAudit({ actorId, schoolId: school, action: "nudge_sent", entity: "campaign", entityId: campaign.id, meta: { count: targets.length } });
  revalidatePath("/staff/students");
  return ok({ sent: targets.length, skipped: userIds.length - targets.length });
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-pair
// ─────────────────────────────────────────────────────────────────────────────

const runInput = z.object({ schoolId, minScore: z.number().int().min(0).max(100) });

export async function runAutoPair(raw: z.input<typeof runInput>): Promise<ActionResult<{ pairs: number }>> {
  const parsed = runInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { schoolId: school, minScore } = parsed.data;
  const actorId = await assertRole(school, "managePairings");
  if (!actorId) return fail("Only housing staff can run auto-pair.");
  if (!(await rateLimit(`autopair:${school}`, LIMITS.autoPairRunsPerHour))) return fail("Give it a few minutes between runs.");

  const db = createAdminClient();
  const { data: students } = await db
    .rpc("school_students", { p_school: school })
    .select("id, created_at, first_name, last_initial")
    .not("onboarding_completed_at", "is", null);
  const pool = (students ?? []) as { id: string; created_at: string; first_name: string; last_initial: string }[];
  const ids = pool.map((s) => s.id);

  // Sharing students only, not in any group, without a suggestion they're still answering.
  const [{ data: consents }, { data: grouped }, { data: pending }] = await Promise.all([
    db.from("consents").select("user_id").eq("kind", "share_with_housing").is("revoked_at", null).in("user_id", ids),
    db.from("group_members").select("user_id").in("user_id", ids),
    db.from("auto_pair_proposals").select("member_ids").eq("school_id", school).eq("status", "sent"),
  ]);
  const shared = new Set((consents ?? []).map((c) => c.user_id));
  const busy = new Set([...(grouped ?? []).map((g) => g.user_id), ...(pending ?? []).flatMap((p) => p.member_ids)]);
  const candidates = pool.filter((s) => shared.has(s.id) && !busy.has(s.id));
  if (candidates.length < 2) return fail("Fewer than two sharing students are waiting for a roommate.");
  const candidateIds = candidates.map((c) => c.id);

  // Existing mutual scores already exclude every pair that fails a hard filter.
  // Both directions share the score; keep whichever side has reasons to show staff.
  const byPair = new Map<string, { a: string; b: string; score: number; reasons: Json }>();
  for (let i = 0; i < candidateIds.length; i += 200) {
    const { data } = await db
      .from("match_scores")
      .select("viewer_id, candidate_id, score, reasons")
      .in("viewer_id", candidateIds.slice(i, i + 200))
      .in("candidate_id", candidateIds);
    for (const row of data ?? []) {
      const [a, b] = row.viewer_id < row.candidate_id ? [row.viewer_id, row.candidate_id] : [row.candidate_id, row.viewer_id];
      const existing = byPair.get(`${a}|${b}`);
      const hasReasons = Array.isArray(row.reasons) && row.reasons.length > 0;
      if (!existing || (hasReasons && !(Array.isArray(existing.reasons) && existing.reasons.length > 0))) {
        byPair.set(`${a}|${b}`, { a, b, score: row.score, reasons: row.reasons });
      }
    }
  }
  const edges = [...byPair.values()];

  const result = assignPairs(
    candidates.map((c) => ({ id: c.id, signedUpAt: c.created_at })),
    edges,
    { minScore },
  );
  const reasonsOf = new Map(edges.map((e) => [`${e.a}|${e.b}`, e.reasons]));
  // Proposals list members by sign-up order; the lookup key is ordered by id.
  const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const nameOf = new Map(candidates.map((c) => [c.id, `${c.first_name}${c.last_initial ? ` ${c.last_initial}.` : ""}`]));

  // A new run supersedes earlier proposals that haven't been sent; sent and answered ones stay.
  const now = new Date().toISOString();
  await db.from("auto_pair_runs").update({ superseded_at: now }).eq("school_id", school).is("superseded_at", null);
  await db
    .from("auto_pair_proposals")
    .update({ status: "superseded" })
    .eq("school_id", school)
    .in("status", ["proposed", "approved", "rejected"]);

  const { data: run, error } = await db
    .from("auto_pair_runs")
    .insert({
      school_id: school,
      params: { minScore },
      stats: {
        ...result.stats,
        unpaired: result.unpaired.map((u) => ({ id: u.id, name: nameOf.get(u.id) ?? "Student", reason: u.reason })),
      } as unknown as NonNullable<Json>,
      created_by: actorId,
    })
    .select("id")
    .single();
  if (error || !run) return fail("Couldn't save the run.");
  if (result.pairs.length > 0) {
    await db.from("auto_pair_proposals").insert(
      result.pairs.map((p) => ({
        run_id: run.id,
        school_id: school,
        member_ids: [p.a, p.b],
        score: p.score,
        reasons: (reasonsOf.get(pairKey(p.a, p.b)) ?? []) as NonNullable<Json>,
      })),
    );
  }
  await logAudit({ actorId, schoolId: school, action: "auto_pair_run", entity: "auto_pair_run", entityId: run.id, meta: { minScore, ...result.stats } });
  revalidatePath("/staff/pairings/auto");
  return ok({ pairs: result.pairs.length });
}

const decideInput = z.object({
  schoolId,
  proposalIds: z.array(z.string().uuid()).min(1).max(1000),
  decision: z.enum(["approved", "rejected", "proposed"]),
});

export async function decideProposals(raw: z.input<typeof decideInput>): Promise<ActionResult<{ updated: number }>> {
  const parsed = decideInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { schoolId: school, proposalIds, decision } = parsed.data;
  const actorId = await assertRole(school, "managePairings");
  if (!actorId) return fail("Only housing staff can review proposals.");
  const { data, error } = await createAdminClient()
    .from("auto_pair_proposals")
    .update({ status: decision, decided_by: actorId, decided_at: new Date().toISOString() })
    .eq("school_id", school)
    .in("id", proposalIds)
    .in("status", ["proposed", "approved", "rejected"])
    .select("id");
  if (error) return fail("Couldn't update those proposals.");
  await logAudit({ actorId, schoolId: school, action: `proposal_${decision}`, entity: "auto_pair_proposal", meta: { count: data?.length ?? 0 } });
  revalidatePath("/staff/pairings/auto");
  return ok({ updated: data?.length ?? 0 });
}

/** Sends every approved proposal: each student gets a notification (and email, per their settings). */
export async function sendApprovedProposals(input: { schoolId: string }): Promise<ActionResult<{ sent: number }>> {
  if (!schoolId.safeParse(input.schoolId).success) return fail("Unknown school.");
  const school = input.schoolId;
  const actorId = await assertRole(school, "managePairings");
  if (!actorId) return fail("Only housing staff can send suggestions.");
  const db = createAdminClient();
  const { data: approved } = await db
    .from("auto_pair_proposals")
    .select("id, member_ids")
    .eq("school_id", school)
    .eq("status", "approved");
  if (!approved?.length) return fail("Approve at least one pair first.");

  // Anyone who joined a group since the run can't take a suggestion anymore.
  const memberIds = approved.flatMap((p) => p.member_ids);
  const { data: grouped } = await db.from("group_members").select("user_id").in("user_id", memberIds);
  const busy = new Set((grouped ?? []).map((g) => g.user_id));
  const valid = approved.filter((p) => !p.member_ids.some((id) => busy.has(id)));
  const invalid = approved.filter((p) => p.member_ids.some((id) => busy.has(id)));
  const now = new Date().toISOString();
  if (invalid.length) await db.from("auto_pair_proposals").update({ status: "invalid" }).in("id", invalid.map((p) => p.id));
  if (valid.length === 0) return fail("Everyone in the approved pairs has since joined a group.");
  await db.from("auto_pair_proposals").update({ status: "sent", sent_at: now }).in("id", valid.map((p) => p.id));

  const office = await officeName(school);
  const { data: settings } = await db
    .from("user_settings")
    .select("user_id, email, notify_email_matches")
    .in("user_id", valid.flatMap((p) => p.member_ids));
  const settingsOf = new Map((settings ?? []).map((s) => [s.user_id, s]));
  await db.from("notifications").insert(
    valid.flatMap((p) =>
      p.member_ids.map((userId) => ({
        user_id: userId,
        type: "housing_suggestion",
        entity_id: p.id,
        title: `${office} suggested a roommate`,
        body: "See why you match, then say yes or no. Nothing happens unless you both say yes.",
        href: `/suggestions/${p.id}`,
      })),
    ),
  );
  for (const p of valid) {
    for (const userId of p.member_ids) {
      const s = settingsOf.get(userId);
      if (s?.notify_email_matches) await sendEmail({ to: s.email, ...housingSuggestionEmail(office, p.id) });
    }
  }
  await logAudit({ actorId, schoolId: school, action: "proposals_sent", entity: "auto_pair_proposal", meta: { count: valid.length, invalid: invalid.length } });
  revalidatePath("/staff/pairings/auto");
  return ok({ sent: valid.length });
}

// ─────────────────────────────────────────────────────────────────────────────
// StarRez export mapping
// ─────────────────────────────────────────────────────────────────────────────

const mappingInput = z.object({
  schoolId,
  columns: z.array(z.object({ field: z.string(), header: z.string().max(60) })).min(1, "Include at least one column.").max(20),
});

export async function saveExportMapping(raw: z.input<typeof mappingInput>): Promise<ActionResult> {
  const parsed = mappingInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { schoolId: school, columns } = parsed.data;
  const actorId = await assertRole(school, "export");
  if (!actorId) return fail("Only housing admins can change the export.");
  const mapping = parseMapping(columns);
  const { error } = await createAdminClient()
    .from("integration_mappings")
    .upsert({ school_id: school, provider: "starrez", direction: "export", mapping: mapping as unknown as NonNullable<Json>, updated_by: actorId, updated_at: new Date().toISOString() });
  if (error) return fail("Couldn't save the columns.");
  await logAudit({ actorId, schoolId: school, action: "starrez_mapping_changed", entity: "integration_mapping", meta: { columns: mapping.length } });
  revalidatePath("/staff/integrations/starrez");
  return ok();
}
