"use server";

import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";

const MAX_PHOTOS = 6;

const registerSchema = z.object({
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  placeholder: z.string().startsWith("data:image/").max(3000).optional(),
});

export interface PhotoRecord {
  id: string;
  storage_path: string;
  position: number;
  placeholder: string | null;
  width: number | null;
  height: number | null;
}

/** Records a photo the browser just uploaded to the user's own storage folder. */
export async function registerPhoto(input: z.input<typeof registerSchema>): Promise<ActionResult<PhotoRecord>> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success || !parsed.data.path.startsWith(`${user.id}/`)) return fail("That upload didn't work.");

  const supabase = createClient();
  const { data: existing } = await supabase.from("photos").select("position").eq("user_id", user.id);
  const taken = new Set((existing ?? []).map((p) => p.position));
  if (taken.size >= MAX_PHOTOS) return fail(`You can add up to ${MAX_PHOTOS} photos.`);
  let position = 0;
  while (taken.has(position)) position += 1;

  const { data, error } = await supabase
    .from("photos")
    .insert({
      user_id: user.id,
      storage_path: parsed.data.path,
      position,
      width: parsed.data.width,
      height: parsed.data.height,
      placeholder: parsed.data.placeholder ?? null,
    })
    .select("id, storage_path, position, placeholder, width, height")
    .single();
  if (error) {
    console.error("[photos] insert failed", error);
    return fail("Couldn't save that photo. Try again.");
  }
  return ok(data);
}

export async function removePhoto(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const supabase = createClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!photo) return fail("That photo is already gone.");

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) return fail("Couldn't remove that photo.");
  await supabase.storage.from("photos").remove([photo.storage_path]);

  // Close the gap so the first photo is always position 0.
  const { data: rest } = await supabase.from("photos").select("id").eq("user_id", user.id).order("position");
  if (rest && rest.length > 0) await supabase.rpc("reorder_photos", { p_ids: rest.map((p) => p.id) });
  return ok();
}

export async function reorderPhotos(ids: string[]): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const parsed = z.array(z.string().uuid()).max(MAX_PHOTOS).safeParse(ids);
  if (!parsed.success) return fail("Couldn't reorder photos.");
  const { error } = await createClient().rpc("reorder_photos", { p_ids: parsed.data });
  if (error) return fail("Couldn't reorder photos.");
  return ok();
}
