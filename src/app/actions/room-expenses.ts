"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";
import { calculateEqualSplits } from "@/lib/expenses/balances";

const uuidSchema = z.string().uuid();

export interface CreateExpenseInput {
  groupId: string;
  description: string;
  amountDollars: number;
  customSplits?: { userId: string; amountDollars: number }[];
}

export async function createExpense(
  input: CreateExpenseInput,
): Promise<ActionResult<{ expenseId: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(input.groupId).success) return fail("Invalid group ID.");
  if (!input.description.trim()) return fail("Expense description is required.");

  const amountCents = Math.round(input.amountDollars * 100);
  if (amountCents <= 0 || isNaN(amountCents)) {
    return fail("Expense amount must be greater than $0.00.");
  }

  const supabase = createClient();

  // Load group members
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", input.groupId);

  if (membersError || !members || members.length === 0) {
    return fail("Could not load group members.");
  }

  const memberIds = members.map((m) => m.user_id);

  let splits: { userId: string; shareCents: number }[];
  if (input.customSplits && input.customSplits.length > 0) {
    splits = input.customSplits.map((s) => ({
      userId: s.userId,
      shareCents: Math.round(s.amountDollars * 100),
    }));

    const splitSum = splits.reduce((acc, s) => acc + s.shareCents, 0);
    if (splitSum !== amountCents) {
      return fail(
        `Custom splits must sum to exactly $${input.amountDollars.toFixed(2)} (currently $${(splitSum / 100).toFixed(2)}).`,
      );
    }
  } else {
    splits = calculateEqualSplits(amountCents, memberIds, user.id);
  }

  const { data: expense, error: insertError } = await supabase
    .from("expenses")
    .insert({
      group_id: input.groupId,
      payer_id: user.id,
      amount_cents: amountCents,
      currency: "USD",
      description: input.description.trim(),
    })
    .select("id")
    .single();

  if (insertError || !expense) {
    return fail(insertError?.message || "Failed to create expense.");
  }

  const splitsToInsert = splits.map((s) => ({
    expense_id: expense.id,
    user_id: s.userId,
    share_cents: s.shareCents,
  }));

  const { error: splitsError } = await supabase
    .from("expense_splits")
    .insert(splitsToInsert);

  if (splitsError) {
    return fail("Failed to save expense splits: " + splitsError.message);
  }

  revalidatePath(`/groups/${input.groupId}/home`);
  return ok({ expenseId: expense.id });
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(groupId).success || !uuidSchema.safeParse(expenseId).success) {
    return fail("Invalid ID.");
  }

  const supabase = createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("expenses")
    .update({ deleted_at: now })
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .eq("payer_id", user.id);

  if (error) return fail(error.message);

  revalidatePath(`/groups/${groupId}/home`);
  return ok();
}

export async function recordSettlement(
  groupId: string,
  receiverId: string,
  amountDollars: number,
  note?: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(groupId).success || !uuidSchema.safeParse(receiverId).success) {
    return fail("Invalid ID.");
  }
  if (user.id === receiverId) return fail("Cannot settle with yourself.");

  const amountCents = Math.round(amountDollars * 100);
  if (amountCents <= 0 || isNaN(amountCents)) {
    return fail("Settlement amount must be greater than $0.00.");
  }

  const supabase = createClient();
  const { error } = await supabase.from("settlements").insert({
    group_id: groupId,
    payer_id: user.id,
    receiver_id: receiverId,
    amount_cents: amountCents,
    note: note?.trim() || null,
  });

  if (error) return fail(error.message);

  revalidatePath(`/groups/${groupId}/home`);
  return ok();
}
