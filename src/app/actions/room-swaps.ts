"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { findSwapCycles, type SwapCandidate } from "@/lib/matching/swaps";

const uuidSchema = z.string().uuid();

export async function optInSwapPool(reason?: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createClient();

  // Find active assignment
  const { data: assignment, error: asgnError } = await supabase
    .from("assignments")
    .select("id, school_id")
    .eq("user_id", user.id)
    .is("closed_at", null)
    .order("moved_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (asgnError || !assignment) {
    return fail("You must have an active dorm assignment to opt into the room swap pool.");
  }

  const { error } = await supabase.from("swap_pool").upsert(
    {
      user_id: user.id,
      assignment_id: assignment.id,
      school_id: assignment.school_id,
      reason: reason?.trim() || null,
      opted_in_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return fail(error.message);

  revalidatePath("/settings");
  revalidatePath("/staff/swaps");
  return ok();
}

export async function optOutSwapPool(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createClient();

  // Delete from swap pool
  const { error } = await supabase.from("swap_pool").delete().eq("user_id", user.id);
  if (error) return fail(error.message);

  // Cancel any active proposals involving this user
  await supabase
    .from("swap_proposals")
    .update({ status: "cancelled" })
    .contains("cycle", [user.id])
    .eq("status", "staff_pending");

  revalidatePath("/settings");
  revalidatePath("/staff/swaps");
  return ok();
}

export async function staffApproveSwapProposal(
  proposalId: string,
  notes?: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(proposalId).success) return fail("Invalid proposal ID.");

  const supabase = createClient();
  const { error } = await supabase
    .from("swap_proposals")
    .update({
      status: "staff_approved",
      staff_notes: notes?.trim() || null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return fail(error.message);

  revalidatePath("/staff/swaps");
  return ok();
}

export async function staffDeclineSwapProposal(
  proposalId: string,
  notes?: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!uuidSchema.safeParse(proposalId).success) return fail("Invalid proposal ID.");

  const supabase = createClient();
  const { error } = await supabase
    .from("swap_proposals")
    .update({
      status: "declined",
      staff_notes: notes?.trim() || null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) return fail(error.message);

  revalidatePath("/staff/swaps");
  return ok();
}
