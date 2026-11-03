"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import {
  cleanHandle,
  generateVerificationCode,
  isSocialPlatform,
  type SocialPlatform,
} from "@/lib/social/links";
import { recomputeMatchesFor } from "@/lib/matching/recompute";

const uuidSchema = z.string().uuid();

export async function saveSocialLink(
  platform: SocialPlatform,
  rawHandle: string,
): Promise<ActionResult<{ verificationCode: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!isSocialPlatform(platform)) return fail("Invalid social platform.");

  const handle = cleanHandle(platform, rawHandle);
  if (!handle || handle.length < 1 || handle.length > 60) {
    return fail("Please enter a valid handle or username.");
  }

  const verificationCode = generateVerificationCode();
  const supabase = createClient();

  const { error } = await supabase.from("social_links").upsert(
    {
      user_id: user.id,
      platform,
      handle,
      verification_code: verificationCode,
      verified_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" },
  );

  if (error) return fail("Couldn't save social link: " + error.message);

  revalidatePath("/settings/accounts");
  return ok({ verificationCode });
}

export async function verifySocialLink(platform: SocialPlatform): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!isSocialPlatform(platform)) return fail("Invalid social platform.");

  const supabase = createClient();

  const { error } = await supabase
    .from("social_links")
    .update({
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("platform", platform);

  if (error) return fail("Couldn't verify handle. Please try again.");

  try {
    await recomputeMatchesFor(user.id);
  } catch (err) {
    console.error("[matching] Failed to recompute after social verify", err);
  }

  revalidatePath("/settings/accounts");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/matches");
  return ok();
}

export async function removeSocialLink(platform: SocialPlatform): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!isSocialPlatform(platform)) return fail("Invalid social platform.");

  const supabase = createClient();

  const { error } = await supabase
    .from("social_links")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", platform);

  if (error) return fail("Couldn't remove social link.");

  try {
    await recomputeMatchesFor(user.id);
  } catch (err) {
    console.error("[matching] Failed to recompute after social remove", err);
  }

  revalidatePath("/settings/accounts");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/matches");
  return ok();
}

export async function requestPeerConnection(targetUserId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuidSchema.safeParse(targetUserId).success) return fail("Invalid user.");
  if (targetUserId === user.id) return fail("You cannot connect with yourself.");

  if (!(await rateLimit(`connection:${user.id}`, { max: 20, window: 86400 }))) {
    return fail("You have sent several connection requests today.");
  }

  const supabase = createClient();

  const { error } = await supabase.from("connections").upsert(
    {
      user_a: user.id,
      user_b: targetUserId,
      source: "campus_peer",
      status: "pending",
    },
    { onConflict: "user_a,user_b", ignoreDuplicates: true },
  );

  if (error) return fail("Couldn't send connection request.");

  return ok();
}

export async function confirmPeerConnection(connectionId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuidSchema.safeParse(connectionId).success) return fail("Invalid connection.");

  const supabase = createClient();

  const { error } = await supabase
    .from("connections")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("user_b", user.id);

  if (error) return fail("Couldn't confirm connection.");

  try {
    await recomputeMatchesFor(user.id);
  } catch (err) {
    console.error("[matching] Failed to recompute after peer confirm", err);
  }

  revalidatePath("/matches");
  return ok();
}

export async function removePeerConnection(connectionId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  if (!uuidSchema.safeParse(connectionId).success) return fail("Invalid connection.");

  const supabase = createClient();

  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("id", connectionId)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  if (error) return fail("Couldn't remove connection.");

  return ok();
}
