"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/action";

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user || !z.string().uuid().safeParse(id).success) return fail("Couldn't update.");
  const { error } = await createClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return fail("Couldn't update.");
  return ok();
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("Please sign in again.");
  const { error } = await createClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  if (error) return fail("Couldn't update.");
  revalidatePath("/notifications");
  return ok();
}
