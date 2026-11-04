"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDraft } from "@/lib/agreements/template";
import {
  afterAccept,
  afterEdit,
  membersMatch,
  readyToSign,
  signatureMatches,
} from "@/lib/agreements/rules";
import { cleanName, cleanText } from "@/lib/sanitize";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fail, ok, type ActionResult } from "@/lib/action";

const uuid = z.string().uuid();

/** Membership is checked with the member's own session, then writes use the service role. */
async function memberOf(groupId: string) {
  const user = await getUser();
  if (!user || !uuid.safeParse(groupId).success) return null;
  const { data } = await createClient().rpc("is_group_member", { gid: groupId, uid: user.id });
  return data === true ? user.id : null;
}

async function groupMembers(groupId: string) {
  const { data } = await createAdminClient()
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);
  return (data ?? []).map((m) => m.user_id);
}

function refresh(groupId: string) {
  revalidatePath(`/groups/${groupId}/agreement`);
  revalidatePath(`/groups/${groupId}`);
}

/** Starts (or restarts, after members changed) a draft prefilled from everyone's profile. */
export async function startAgreement(groupId: string): Promise<ActionResult> {
  const userId = await memberOf(groupId);
  if (!userId) return fail("You're not in this group.");
  if (!(await rateLimit(`agreement:${userId}`, LIMITS.agreementEditsPerHour)))
    return fail("Too many changes. Try again later.");
  const db = createAdminClient();
  const memberIds = await groupMembers(groupId);
  if (memberIds.length < 2) return fail("You need at least one roommate to start an agreement.");

  const { data: existing } = await db
    .from("agreements")
    .select("id, member_ids, version")
    .eq("group_id", groupId)
    .maybeSingle();
  if (existing && membersMatch(existing.member_ids, memberIds))
    return fail("Your group already has an agreement.");

  const [{ data: profiles }, { data: prefs }, { data: scores }] = await Promise.all([
    db.from("profiles").select("id, first_name").in("id", memberIds),
    db
      .from("preferences")
      .select("user_id, sleep_schedule, cleanliness, noise, guests, smoking, drinking, pets")
      .in("user_id", memberIds),
    db
      .from("match_scores")
      .select("viewer_id, watchouts")
      .in("viewer_id", memberIds)
      .in("candidate_id", memberIds),
  ]);
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.first_name]));
  const draft = buildDraft(
    (prefs ?? []).map((p) => ({
      id: p.user_id,
      firstName: nameOf.get(p.user_id) || "A roommate",
      sleepSchedule: p.sleep_schedule,
      cleanliness: p.cleanliness,
      noise: p.noise,
      guests: p.guests,
      smoking: p.smoking,
      drinking: p.drinking,
      pets: p.pets,
    })),
    (scores ?? []).flatMap((s) =>
      Array.isArray(s.watchouts)
        ? (s.watchouts as { label?: string }[])
            .map((w) => w.label)
            .filter((l): l is string => Boolean(l))
        : [],
    ),
  );

  // A stale agreement (members changed) is replaced; its history goes with it.
  if (existing) await db.from("agreements").delete().eq("id", existing.id);
  const { data: agreement, error } = await db
    .from("agreements")
    .insert({
      group_id: groupId,
      member_ids: memberIds,
      version: existing ? existing.version + 1 : 1,
    })
    .select("id")
    .single();
  if (error || !agreement) return fail("Couldn't start the agreement.");
  await db.from("agreement_sections").insert(
    draft.map((s, position) => ({
      agreement_id: agreement.id,
      key: s.key,
      title: s.title,
      position,
      content: s.content,
    })),
  );
  await db
    .from("agreement_events")
    .insert({ agreement_id: agreement.id, actor_id: userId, kind: "created" });
  refresh(groupId);
  return ok();
}

async function liveAgreement(groupId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("agreements")
    .select("id, status, member_ids, version")
    .eq("group_id", groupId)
    .maybeSingle();
  if (!data) return { error: "Start the agreement first." } as const;
  if (!membersMatch(data.member_ids, await groupMembers(groupId)))
    return { error: "Your group changed. Start a new agreement." } as const;
  return { agreement: data } as const;
}

const editInput = z.object({
  groupId: uuid,
  key: z.string().regex(/^[a-z_]{2,32}$/),
  content: z
    .string()
    .transform((v) => cleanText(v))
    .pipe(
      z.string().min(1, "A section can't be empty.").max(2000, "Keep it under 2,000 characters."),
    ),
});

/** Editing a section: the editor's version needs everyone else's acceptance again. Reopens a signed agreement. */
export async function editSection(raw: z.input<typeof editInput>): Promise<ActionResult> {
  const parsed = editInput.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the text.");
  const { groupId, key, content } = parsed.data;
  const userId = await memberOf(groupId);
  if (!userId) return fail("You're not in this group.");
  if (!(await rateLimit(`agreement:${userId}`, LIMITS.agreementEditsPerHour)))
    return fail("Too many changes. Try again later.");
  const live = await liveAgreement(groupId);
  if ("error" in live) return fail(live.error!);
  if (live.agreement.status === "signed") return fail("Reopen the agreement before changing it.");
  const db = createAdminClient();
  const { data: section } = await db
    .from("agreement_sections")
    .select("content")
    .eq("agreement_id", live.agreement.id)
    .eq("key", key)
    .maybeSingle();
  if (!section) return fail("That section no longer exists.");
  if (section.content === content) return ok();
  await db
    .from("agreement_sections")
    .update({
      content,
      proposed_by: userId,
      accepted_by: afterEdit(userId),
      updated_at: new Date().toISOString(),
    })
    .eq("agreement_id", live.agreement.id)
    .eq("key", key);
  await db.from("agreement_events").insert({
    agreement_id: live.agreement.id,
    actor_id: userId,
    kind: "edited",
    section_key: key,
    before: section.content,
    after: content,
  });
  await db
    .from("agreements")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", live.agreement.id);
  refresh(groupId);
  return ok();
}

export async function acceptSection(input: {
  groupId: string;
  key: string;
}): Promise<ActionResult> {
  const userId = await memberOf(input.groupId);
  if (!userId) return fail("You're not in this group.");
  if (!/^[a-z_]{2,32}$/.test(input.key)) return fail("Unknown section.");
  const live = await liveAgreement(input.groupId);
  if ("error" in live) return fail(live.error!);
  if (live.agreement.status === "signed") return fail("This agreement is already signed.");
  const db = createAdminClient();
  const { data: section } = await db
    .from("agreement_sections")
    .select("accepted_by")
    .eq("agreement_id", live.agreement.id)
    .eq("key", input.key)
    .maybeSingle();
  if (!section) return fail("That section no longer exists.");
  await db
    .from("agreement_sections")
    .update({ accepted_by: afterAccept(section.accepted_by, userId) })
    .eq("agreement_id", live.agreement.id)
    .eq("key", input.key);
  await db.from("agreement_events").insert({
    agreement_id: live.agreement.id,
    actor_id: userId,
    kind: "accepted",
    section_key: input.key,
  });
  refresh(input.groupId);
  return ok();
}

const signInput = z.object({ groupId: uuid, typedName: z.string().max(80) });

/** Typed-name signature. The agreement is signed once every member has signed this version. */
export async function signAgreement(
  raw: z.input<typeof signInput>,
): Promise<ActionResult<{ signed: boolean }>> {
  const parsed = signInput.safeParse(raw);
  if (!parsed.success) return fail("Type your full name to sign.");
  const { groupId } = parsed.data;
  const typedName = cleanName(parsed.data.typedName);
  const userId = await memberOf(groupId);
  if (!userId) return fail("You're not in this group.");
  const live = await liveAgreement(groupId);
  if ("error" in live) return fail(live.error!);
  const db = createAdminClient();
  const memberIds = live.agreement.member_ids;
  const [{ data: sections }, { data: me }] = await Promise.all([
    db.from("agreement_sections").select("key, accepted_by").eq("agreement_id", live.agreement.id),
    db.from("profiles").select("first_name").eq("id", userId).single(),
  ]);
  if (
    !readyToSign(
      (sections ?? []).map((s) => ({ key: s.key, acceptedBy: s.accepted_by })),
      memberIds,
    )
  ) {
    return fail("Everyone needs to accept every section before signing.");
  }
  if (!signatureMatches(typedName, me?.first_name ?? ""))
    return fail("Type your full name, starting with your first name.");

  await db.from("agreement_signatures").upsert({
    agreement_id: live.agreement.id,
    user_id: userId,
    version: live.agreement.version,
    typed_name: typedName,
    signed_at: new Date().toISOString(),
  });
  await db
    .from("agreement_events")
    .insert({ agreement_id: live.agreement.id, actor_id: userId, kind: "signed" });
  const { data: signatures } = await db
    .from("agreement_signatures")
    .select("user_id")
    .eq("agreement_id", live.agreement.id)
    .eq("version", live.agreement.version);
  const signedIds = new Set((signatures ?? []).map((s) => s.user_id));
  const allSigned = memberIds.every((id) => signedIds.has(id));
  if (allSigned) {
    await db
      .from("agreements")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", live.agreement.id);
  }
  refresh(groupId);
  return ok({ signed: allSigned });
}

/** Any member can reopen a signed agreement: a new version, signatures cleared, history kept. */
export async function reopenAgreement(groupId: string): Promise<ActionResult> {
  const userId = await memberOf(groupId);
  if (!userId) return fail("You're not in this group.");
  const live = await liveAgreement(groupId);
  if ("error" in live) return fail(live.error!);
  if (live.agreement.status !== "signed") return fail("Only a signed agreement can be reopened.");
  const db = createAdminClient();
  await db
    .from("agreements")
    .update({
      status: "reopened",
      version: live.agreement.version + 1,
      signed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", live.agreement.id);
  await db
    .from("agreement_events")
    .insert({ agreement_id: live.agreement.id, actor_id: userId, kind: "reopened" });
  refresh(groupId);
  return ok();
}

/** Accepts every section the member hasn't accepted yet, in one step. */
export async function acceptAllSections(
  groupId: string,
): Promise<ActionResult<{ accepted: number }>> {
  const userId = await memberOf(groupId);
  if (!userId) return fail("You're not in this group.");
  const live = await liveAgreement(groupId);
  if ("error" in live) return fail(live.error!);
  if (live.agreement.status === "signed") return fail("This agreement is already signed.");
  const db = createAdminClient();
  const { data: sections } = await db
    .from("agreement_sections")
    .select("key, accepted_by")
    .eq("agreement_id", live.agreement.id);
  const pending = (sections ?? []).filter((s) => !s.accepted_by.includes(userId));
  for (const s of pending) {
    await db
      .from("agreement_sections")
      .update({ accepted_by: afterAccept(s.accepted_by, userId) })
      .eq("agreement_id", live.agreement.id)
      .eq("key", s.key);
  }
  if (pending.length) {
    await db.from("agreement_events").insert(
      pending.map((s) => ({
        agreement_id: live.agreement.id,
        actor_id: userId,
        kind: "accepted",
        section_key: s.key,
      })),
    );
  }
  refresh(groupId);
  return ok({ accepted: pending.length });
}
