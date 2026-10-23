import "server-only";
import { createClient, getUser } from "@/lib/supabase/server";

/** Server-side admin gate. Returns the admin's user id or null. */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await createClient().from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? user.id : null;
}
