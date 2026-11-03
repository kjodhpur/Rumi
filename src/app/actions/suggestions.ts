"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";

/** A student's answer to a housing roommate suggestion. The second "yes" creates their group. */
export async function respondToSuggestion(
  proposalId: string,
  accept: boolean,
): Promise<ActionResult<{ state: "accepted" | "waiting" | "declined" | "invalid" }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!z.string().uuid().safeParse(proposalId).success || typeof accept !== "boolean") return fail("Unknown suggestion.");
  if (!(await rateLimit(`suggestion:${user.id}`, LIMITS.suggestionResponsesPerHour))) return fail("Too many tries. Wait a bit.");
  const { data, error } = await createClient().rpc("respond_housing_suggestion", { p_id: proposalId, p_accept: accept });
  if (error) {
    if (error.message.includes("not_pending")) return fail("This suggestion was already answered.");
    return fail(friendlyDbError(error.message));
  }
  revalidatePath(`/suggestions/${proposalId}`);
  revalidatePath("/groups");
  return ok({ state: data as "accepted" | "waiting" | "declined" | "invalid" });
}
