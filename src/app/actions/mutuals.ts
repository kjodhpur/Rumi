"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeHandle, socialUrl } from "@/lib/mutuals";
import { z } from "zod";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

const linkSchema = z.object({
  provider: z.enum(["instagram", "linkedin", "tiktok", "x", "other"]),
  handle: z.string().min(1).max(64),
});

export async function upsertSocialLink(input: unknown) {
  const data = linkSchema.parse(input);
  const { supabase, user } = await requireUser();
  const handle = normalizeHandle(data.handle);
  const url = socialUrl(data.provider, handle);

  const { error } = await supabase.from("social_links").upsert(
    {
      user_id: user.id,
      provider: data.provider,
      handle,
      url,
      verified: false,
    },
    { onConflict: "user_id,provider" },
  );
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeSocialLink(provider: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("social_links").delete().eq("user_id", user.id).eq("provider", provider);
  revalidatePath("/settings");
  return { ok: true };
}

export async function setProfileOrgs(orgIds: string[]) {
  const { supabase, user } = await requireUser();
  await supabase.from("profile_orgs").delete().eq("user_id", user.id);
  if (orgIds.length) {
    await supabase.from("profile_orgs").insert(orgIds.map((org_id) => ({ user_id: user.id, org_id })));
  }
  revalidatePath("/settings");
  return { ok: true };
}

const assertEdgeSchema = z.object({
  otherUserId: z.string().uuid(),
  provider: z.enum(["instagram", "linkedin", "tiktok", "x", "other"]).optional(),
  sharedHandle: z.string().optional(),
});

/** User-asserted point of contact (no scraping). */
export async function assertSocialConnection(input: unknown) {
  const data = assertEdgeSchema.parse(input);
  const { supabase, user } = await requireUser();
  if (data.otherUserId === user.id) return { error: "Invalid." };

  const [a, b] = user.id < data.otherUserId ? [user.id, data.otherUserId] : [data.otherUserId, user.id];
  const { error } = await supabase.from("connection_edges").upsert(
    {
      user_a: a,
      user_b: b,
      source: "asserted_social",
      strength: 1,
      meta: {
        provider: data.provider ?? null,
        shared_handle: data.sharedHandle ? normalizeHandle(data.sharedHandle) : null,
        asserted_by: user.id,
      },
    },
    { onConflict: "user_a,user_b,source" },
  );
  if (error) return { error: error.message };
  revalidatePath(`/profile/${data.otherUserId}`);
  return { ok: true };
}
