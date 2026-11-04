import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { revokeCalendar, CALENDAR_PROVIDERS } from "@/lib/calendar/oauth";

/**
 * Permanently deletes an account: its files in storage (photos and intro clips), direct
 * chats, a group it owns is handed to the next member (or removed when it's alone), then
 * the auth user, which cascades to every row Rumi keeps about them.
 */
export async function purgeAccount(userId: string) {
  const admin = createAdminClient();
  for (const bucket of ["photos", "intros-media"]) {
    const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (files?.length)
      await admin.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
  }

  const { data: memberships } = await admin
    .from("conversation_members")
    .select("conversation_id, conversations!inner(kind)")
    .eq("user_id", userId);
  const direct = (memberships ?? [])
    .filter((m) => (m.conversations as unknown as { kind: string }).kind === "direct")
    .map((m) => m.conversation_id);
  for (let i = 0; i < direct.length; i += 100)
    await admin
      .from("conversations")
      .delete()
      .in("id", direct.slice(i, i + 100));

  const { data: group } = await admin
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (group) {
    const { data: next } = await admin
      .from("group_members")
      .select("user_id")
      .eq("group_id", group.group_id)
      .neq("user_id", userId)
      .order("joined_at")
      .limit(1)
      .maybeSingle();
    if (next) {
      await admin
        .from("groups")
        .update({ owner_id: next.user_id, status: "open" })
        .eq("id", group.group_id);
      await admin
        .from("group_members")
        .update({ role: "owner" })
        .eq("group_id", group.group_id)
        .eq("user_id", next.user_id);
    } else {
      await admin.from("groups").delete().eq("id", group.group_id);
    }
  }

  // Hand calendar access back to Google/Microsoft rather than leaving live grants behind.
  for (const provider of CALENDAR_PROVIDERS) await revokeCalendar(userId, provider);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}
