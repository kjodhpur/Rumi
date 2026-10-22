"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import { firstError, groupSchema } from "@/lib/validation";
import { cleanText } from "@/lib/sanitize";
import { runInBackground } from "@/lib/background";
import { emailGroupInvite } from "@/lib/email/notify";

const uuid = z.string().uuid();
const note = z
  .string()
  .optional()
  .transform((v) => (v ? cleanText(v).slice(0, 300) : undefined));

export async function createGroup(input: { name: string; targetSize: number }): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error));
  const { data, error } = await createClient().rpc("create_group", {
    p_name: parsed.data.name,
    p_target_size: parsed.data.targetSize,
  });
  if (error || !data) return fail(friendlyDbError(error?.message));
  revalidatePath("/groups");
  return ok({ id: data });
}

export async function inviteToGroup(input: { groupId: string; userId: string; message?: string }): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(input.groupId).success || !uuid.safeParse(input.userId).success) return fail("Couldn't send invite.");
  if (!(await rateLimit(`group-invite:${user.id}`, LIMITS.groupInvitesPerDay))) {
    return fail("You've sent a lot of invites today. Try again tomorrow.");
  }
  const { data, error } = await createClient().rpc("invite_to_group", {
    p_group_id: input.groupId,
    p_user: input.userId,
    p_message: note.parse(input.message),
  });
  if (error || !data) return fail(friendlyDbError(error?.message));
  runInBackground("group-invite-email", () => emailGroupInvite(data));
  revalidatePath(`/groups/${input.groupId}`);
  return ok();
}

export async function requestToJoin(input: { groupId: string; message?: string }): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(input.groupId).success) return fail("Couldn't send request.");
  if (!(await rateLimit(`group-request:${user.id}`, LIMITS.groupInvitesPerDay))) {
    return fail("You've sent a lot of requests today. Try again tomorrow.");
  }
  const { error } = await createClient().rpc("request_to_join_group", {
    p_group_id: input.groupId,
    p_message: note.parse(input.message),
  });
  if (error) return fail(friendlyDbError(error.message));
  revalidatePath("/groups");
  return ok();
}

export async function respondToGroupRequest(requestId: string, accept: boolean): Promise<ActionResult<{ groupId: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(requestId).success) return fail("That request is no longer available.");
  const { data, error } = await createClient().rpc("respond_group_request", {
    p_request_id: requestId,
    p_accept: accept,
  });
  if (error || !data) return fail(friendlyDbError(error?.message));
  revalidatePath("/groups");
  revalidatePath("/messages");
  return ok({ groupId: data });
}

export async function cancelGroupRequest(requestId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(requestId).success) return fail("Couldn't cancel.");
  const { error } = await createClient().rpc("cancel_group_request", { p_request_id: requestId });
  if (error) return fail(friendlyDbError(error.message));
  revalidatePath("/groups");
  return ok();
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuid.safeParse(groupId).success) return fail("Couldn't leave the group.");
  const { error } = await createClient().rpc("leave_group", { p_group_id: groupId });
  if (error) return fail(friendlyDbError(error.message));
  revalidatePath("/groups");
  revalidatePath("/messages");
  return ok();
}
