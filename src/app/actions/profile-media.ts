"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/action";
import { MAX_MEDIA_DURATION_SECONDS } from "@/lib/media/validation";

export interface ProfileMediaInfo {
  id: string;
  userId: string;
  kind: "video" | "audio";
  signedUrl: string;
  durationSeconds: number;
  transcript: string;
}

export async function saveProfileMedia(
  kind: "video" | "audio",
  path: string,
  durationSeconds: number,
  transcript: string,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const dur = Math.round(durationSeconds);
  if (dur <= 0 || dur > MAX_MEDIA_DURATION_SECONDS) {
    return fail(`Clip must be between 1 and ${MAX_MEDIA_DURATION_SECONDS} seconds.`);
  }

  const cleanTranscript = transcript.trim();
  if (cleanTranscript.length < 3 || cleanTranscript.length > 1000) {
    return fail("Transcript must be between 3 and 1,000 characters for accessibility.");
  }

  const supabase = createClient();
  const { error } = await supabase.from("profile_media").upsert(
    {
      user_id: user.id,
      kind,
      path,
      duration_s: dur,
      transcript: cleanTranscript,
      status: "active",
    },
    { onConflict: "user_id" },
  );

  if (error) return fail(error.message);

  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/settings/profile");
  return ok();
}

export async function deleteProfileMedia(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createClient();
  const { error } = await supabase.from("profile_media").delete().eq("user_id", user.id);
  if (error) return fail(error.message);

  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/settings/profile");
  return ok();
}

export async function getSignedMediaUrl(
  path: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  const user = await getUser();
  if (!user) return fail("Please sign in.");

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("intros-media")
    .createSignedUrl(path, 3600); // 1 hour validity

  if (error || !data) {
    return fail("Could not generate secure media URL.");
  }

  return ok({ signedUrl: data.signedUrl });
}
