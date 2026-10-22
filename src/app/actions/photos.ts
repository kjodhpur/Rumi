"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const photosSchema = z.object({
  urls: z.array(z.string().url()).max(6),
});

export async function saveProfilePhotos(input: unknown) {
  const data = photosSchema.parse(input);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase.from("profile_photos").delete().eq("user_id", user.id);

  if (data.urls.length) {
    const rows = data.urls.map((storage_path, sort_order) => ({
      user_id: user.id,
      storage_path,
      sort_order,
    }));
    const { error } = await supabase.from("profile_photos").insert(rows);
    if (error) throw new Error(error.message);
  }

  const primary = data.urls[0] ?? null;
  await supabase.from("profiles").update({ photo_url: primary }).eq("id", user.id);

  revalidatePath("/onboarding");
  revalidatePath("/settings");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true, primary };
}
