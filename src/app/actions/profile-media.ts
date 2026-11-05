"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, friendlyDbError, ok, type ActionResult } from "@/lib/action";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { cleanText } from "@/lib/sanitize";
import {
  MAX_MEDIA_BYTES,
  MAX_MEDIA_DURATION_SECONDS,
  validateMediaUpload,
} from "@/lib/media/validation";
import { mediaDurationSeconds, sniffContainer } from "@/lib/media/duration";

export interface ProfileMediaInfo {
  userId: string;
  kind: "video" | "audio";
  signedUrl: string;
  durationSeconds: number;
  transcript: string;
}

const saveInput = z.object({
  path: z.string().max(200),
  transcript: z.string().max(1000),
});

/**
 * After the browser uploads to intros-media/<uid>/…, the server checks the file itself:
 * it must be in the caller's folder, MP4 or WebM, ≤ 20 MB and ≤ 30 s (read from the file).
 * A clip hidden by reports or removed by a moderator stays that way when replaced.
 */
export async function saveProfileMedia(raw: z.input<typeof saveInput>): Promise<ActionResult> {
  const parsed = saveInput.safeParse(raw);
  if (!parsed.success) return fail("Check the clip and transcript.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`media:${user.id}`, LIMITS.mediaUploadsPerHour)))
    return fail("Too many uploads. Try again later.");

  const { path } = parsed.data;
  const transcript = cleanText(parsed.data.transcript);
  const db = createAdminClient();
  const discard = () => db.storage.from("intros-media").remove([path]);
  if (!path.startsWith(`${user.id}/`) || path.includes(".."))
    return fail("That upload isn't yours.");

  const { data: file, error: downloadError } = await db.storage.from("intros-media").download(path);
  if (downloadError || !file) return fail("Couldn't find the upload. Try again.");
  if (file.size > MAX_MEDIA_BYTES) {
    await discard();
    return fail("Clips can be up to 20 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const container = sniffContainer(bytes);
  const seconds = mediaDurationSeconds(bytes);
  const mimeType = (file.type || (container === "mp4" ? "video/mp4" : "video/webm")).split(";")[0]!;
  const check = validateMediaUpload({
    mimeType,
    sizeBytes: file.size,
    durationSeconds: seconds ?? undefined,
    transcript,
  });
  if (!container || seconds === null || !check.valid || !check.kind) {
    await discard();
    return fail(
      check.error ?? `Use an MP4 or WebM clip up to ${MAX_MEDIA_DURATION_SECONDS} seconds.`,
    );
  }
  // A little slack for encoder rounding.
  if (seconds > MAX_MEDIA_DURATION_SECONDS + 0.5) {
    await discard();
    return fail(`Clips can be up to ${MAX_MEDIA_DURATION_SECONDS} seconds.`);
  }

  const { data: existing } = await db
    .from("profile_media")
    .select("path, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.status === "removed") {
    await discard();
    return fail("A moderator removed your last intro, so you can't add a new one right now.");
  }
  const { error } = await db.from("profile_media").upsert(
    {
      user_id: user.id,
      kind: check.kind,
      path,
      mime_type: `${check.kind}/${container}`,
      size_bytes: file.size,
      duration_s: Math.max(1, Math.round(seconds)),
      transcript,
      status: existing?.status === "hidden" ? "hidden" : "active",
    },
    { onConflict: "user_id" },
  );
  if (error) {
    await discard();
    return fail(friendlyDbError(error.message));
  }
  if (existing && existing.path !== path)
    await db.storage.from("intros-media").remove([existing.path]);
  revalidatePath(`/profile/${user.id}`);
  return ok();
}

export async function deleteProfileMedia(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`media:${user.id}`, LIMITS.mediaUploadsPerHour)))
    return fail("Too many changes. Try again in a bit.");
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("profile_media")
    .select("path, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return ok();
  const { error } = await supabase.from("profile_media").delete().eq("user_id", user.id);
  if (error) return fail("Couldn't remove the clip.");
  await createAdminClient().storage.from("intros-media").remove([existing.path]);
  revalidatePath(`/profile/${user.id}`);
  return ok();
}

const reportInput = z.object({
  ownerId: z.string().uuid(),
  reason: z.enum(["inappropriate", "harassment", "spam", "not_them", "other"]),
});

/** Two reports hide a clip until a moderator reviews it. */
export async function reportProfileMedia(raw: z.input<typeof reportInput>): Promise<ActionResult> {
  const parsed = reportInput.safeParse(raw);
  if (!parsed.success) return fail("Pick a reason.");
  const user = await getUser();
  if (!user) return fail("Please sign in.");
  if (!(await rateLimit(`media-report:${user.id}`, LIMITS.mediaReportsPerDay)))
    return fail("You've sent a lot of reports today.");
  const { error } = await createClient().rpc("report_profile_media", {
    p_owner: parsed.data.ownerId,
    p_reason: parsed.data.reason,
  });
  if (error) return fail(friendlyDbError(error.message));
  revalidatePath(`/profile/${parsed.data.ownerId}`);
  return ok();
}
