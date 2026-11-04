"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import { firstError } from "@/lib/validation";
import { CAMPUS_TZ } from "@/lib/time";
import { calculateEqualSplits } from "@/lib/expenses/balances";
import { choresFromAgreement, firstDueDate } from "@/lib/chores/rotation";

const uuid = z.string().uuid();
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: CAMPUS_TZ });

async function member(groupId: string) {
  if (!uuid.safeParse(groupId).success) return null;
  const user = await getUser();
  if (!user) return null;
  if (!(await rateLimit(`room-hub:${user.id}`, LIMITS.roomHubWritesPerHour)))
    return "limited" as const;
  return user;
}

function done(groupId: string) {
  revalidatePath(`/groups/${groupId}/home`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Chores
// ─────────────────────────────────────────────────────────────────────────────

const choreInput = z.object({
  groupId: uuid,
  title: z
    .string()
    .transform((v) => cleanText(v, { multiline: false }))
    .pipe(z.string().min(1, "Name the chore.").max(100)),
  cadence: z.enum(["daily", "weekly", "biweekly", "monthly"]),
});

export async function addChore(raw: z.input<typeof choreInput>): Promise<ActionResult> {
  const parsed = choreInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const user = await member(parsed.data.groupId);
  if (!user) return fail("That room isn't available.");
  if (user === "limited") return fail("Too many changes. Try again in a bit.");
  const { error } = await createClient().rpc("add_chore", {
    p_group: parsed.data.groupId,
    p_title: parsed.data.title,
    p_cadence: parsed.data.cadence,
    p_rotation: [],
    p_first_due: firstDueDate(today(), parsed.data.cadence),
    p_from_agreement: false,
  });
  if (error) return fail(friendlyDbError(error.message));
  done(parsed.data.groupId);
  return ok();
}

/** One tap: chores from the roommate agreement's cleaning section (or sensible defaults). */
export async function seedChores(groupId: string): Promise<ActionResult<{ added: number }>> {
  const user = await member(groupId);
  if (!user) return fail("That room isn't available.");
  if (user === "limited") return fail("Too many changes. Try again in a bit.");
  const supabase = createClient();
  const { count } = await supabase
    .from("chores")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);
  if (count) return ok({ added: 0 });
  const { data: agreement } = await supabase
    .from("agreements")
    .select("id, status")
    .eq("group_id", groupId)
    .maybeSingle();
  const { data: section } =
    agreement && agreement.status !== "void"
      ? await supabase
          .from("agreement_sections")
          .select("content")
          .eq("agreement_id", agreement.id)
          .eq("key", "cleaning")
          .maybeSingle()
      : { data: null };
  const templates = choresFromAgreement(section?.content);
  let added = 0;
  for (const t of templates) {
    const { error } = await supabase.rpc("add_chore", {
      p_group: groupId,
      p_title: t.title,
      p_cadence: t.cadence,
      p_rotation: [],
      p_first_due: firstDueDate(today(), t.cadence),
      p_from_agreement: Boolean(section),
    });
    if (error) return fail(friendlyDbError(error.message));
    added += 1;
  }
  done(groupId);
  return ok({ added });
}

export async function completeChore(groupId: string, instanceId: string): Promise<ActionResult> {
  if (!uuid.safeParse(instanceId).success) return fail("That chore isn't available.");
  const user = await member(groupId);
  if (!user) return fail("That room isn't available.");
  if (user === "limited") return fail("Too many changes. Try again in a bit.");
  const { error } = await createClient().rpc("complete_chore", { p_instance: instanceId });
  if (error) return fail(friendlyDbError(error.message));
  done(groupId);
  return ok();
}

export async function removeChore(groupId: string, choreId: string): Promise<ActionResult> {
  if (!uuid.safeParse(choreId).success) return fail("That chore isn't available.");
  const user = await member(groupId);
  if (!user) return fail("That room isn't available.");
  if (user === "limited") return fail("Too many changes. Try again in a bit.");
  const { data, error } = await createClient()
    .from("chores")
    .delete()
    .eq("id", choreId)
    .eq("group_id", groupId)
    .select("id");
  if (error || !data?.length) return fail("Couldn't remove that chore.");
  done(groupId);
  return ok();
}

// ─────────────────────────────────────────────────────────────────────────────
// Expenses (integer cents; Rumi never moves money)
// ─────────────────────────────────────────────────────────────────────────────

const cents = z
  .number()
  .int()
  .min(1, "Enter an amount.")
  .max(10_000_000, "That's more than Rumi tracks.");

const expenseInput = z.object({
  groupId: uuid,
  description: z
    .string()
    .transform((v) => cleanText(v, { multiline: false }))
    .pipe(z.string().min(1, "What was it for?").max(200)),
  amountCents: cents,
  /** Equal split across these members (payer keeps any leftover cent), or exact custom shares. */
  split: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("equal"), memberIds: z.array(uuid).min(1).max(4) }),
    z.object({
      kind: z.literal("custom"),
      shares: z
        .array(z.object({ userId: uuid, cents: z.number().int().min(0) }))
        .min(1)
        .max(4),
    }),
  ]),
});

export async function addExpense(raw: z.input<typeof expenseInput>): Promise<ActionResult> {
  const parsed = expenseInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const e = parsed.data;
  const user = await member(e.groupId);
  if (!user) return fail("That room isn't available.");
  if (user === "limited") return fail("Too many changes. Try again in a bit.");
  const splits =
    e.split.kind === "equal"
      ? calculateEqualSplits(e.amountCents, [...new Set(e.split.memberIds)], user.id).map((s) => ({
          user_id: s.userId,
          share_cents: s.shareCents,
        }))
      : e.split.shares.map((s) => ({ user_id: s.userId, share_cents: s.cents }));
  if (splits.reduce((sum, s) => sum + s.share_cents, 0) !== e.amountCents)
    return fail("The split has to add up to the full amount.");
  const { error } = await createClient().rpc("add_expense", {
    p_group: e.groupId,
    p_amount_cents: e.amountCents,
    p_description: e.description,
    p_splits: splits,
  });
  if (error) return fail(friendlyDbError(error.message));
  done(e.groupId);
  return ok();
}

/** Soft delete, kept for the record. Only the payer can remove their expense. */
export async function deleteExpense(groupId: string, expenseId: string): Promise<ActionResult> {
  if (!uuid.safeParse(expenseId).success) return fail("That expense isn't available.");
  const user = await member(groupId);
  if (!user) return fail("That room isn't available.");
  if (user === "limited") return fail("Too many changes. Try again in a bit.");
  const { error } = await createClient().rpc("delete_expense", { p_expense: expenseId });
  if (error) return fail("Only the person who paid can remove an expense.");
  done(groupId);
  return ok();
}

const settleInput = z.object({
  groupId: uuid,
  receiverId: uuid,
  amountCents: cents,
  note: z
    .string()
    .max(200)
    .transform((v) => cleanText(v, { multiline: false }))
    .optional(),
});

/** "I paid them back" — a record only. Rumi doesn't move money or link payment apps. */
export async function recordSettlement(raw: z.input<typeof settleInput>): Promise<ActionResult> {
  const parsed = settleInput.safeParse(raw);
  if (!parsed.success) return fail(firstError(parsed.error));
  const s = parsed.data;
  const user = await member(s.groupId);
  if (!user) return fail("That room isn't available.");
  if (user === "limited") return fail("Too many changes. Try again in a bit.");
  if (s.receiverId === user.id) return fail("Pick who you paid.");
  const { error } = await createClient()
    .from("settlements")
    .insert({
      group_id: s.groupId,
      payer_id: user.id,
      receiver_id: s.receiverId,
      amount_cents: s.amountCents,
      note: s.note || null,
    });
  if (error) return fail("Couldn't record that.");
  done(s.groupId);
  return ok();
}
