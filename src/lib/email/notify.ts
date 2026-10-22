import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import {
  groupInviteEmail,
  introAcceptedEmail,
  introReceivedEmail,
  newMessageEmail,
} from "./templates";

type EmailToggle = "notify_email_intros" | "notify_email_messages" | "notify_email_matches" | "notify_email_groups";

async function recipient(userId: string, toggle: EmailToggle) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select(`email, ${toggle}`)
    .eq("user_id", userId)
    .maybeSingle();
  const settings = data as ({ email: string } & Record<EmailToggle, boolean>) | null;
  if (!settings || !settings[toggle]) return null;
  return settings.email;
}

async function firstName(userId: string) {
  const { data } = await createAdminClient().from("profiles").select("first_name").eq("id", userId).maybeSingle();
  return data?.first_name || "Someone";
}

export async function emailIntroReceived(introId: string) {
  const admin = createAdminClient();
  const { data: intro } = await admin.from("intros").select("sender_id, recipient_id, message").eq("id", introId).single();
  if (!intro) return;
  const to = await recipient(intro.recipient_id, "notify_email_intros");
  if (!to) return;
  await sendEmail({ to, ...introReceivedEmail(await firstName(intro.sender_id), intro.message) });
}

export async function emailIntroAccepted(introId: string) {
  const admin = createAdminClient();
  const { data: intro } = await admin
    .from("intros")
    .select("sender_id, recipient_id, conversation_id")
    .eq("id", introId)
    .single();
  if (!intro?.conversation_id) return;
  const to = await recipient(intro.sender_id, "notify_email_intros");
  if (!to) return;
  await sendEmail({ to, ...introAcceptedEmail(await firstName(intro.recipient_id), intro.conversation_id) });
}

const MESSAGE_EMAIL_COOLDOWN_MS = 30 * 60 * 1000;
const RECENTLY_ACTIVE_MS = 3 * 60 * 1000;

/**
 * Emails conversation members about a new message — at most once per 30
 * minutes per conversation, and never to someone who is active right now.
 */
export async function emailNewMessage(conversationId: string, senderId: string, preview: string) {
  const admin = createAdminClient();
  const [{ data: members }, { data: conversation }] = await Promise.all([
    admin
      .from("conversation_members")
      .select("user_id, last_emailed_at, last_read_at, profiles!inner(last_active_at)")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId),
    admin.from("conversations").select("kind, groups(name)").eq("id", conversationId).single(),
  ]);
  if (!members?.length) return;
  const senderName = await firstName(senderId);
  const groupName = (conversation?.groups as { name: string } | null)?.name ?? null;
  const now = Date.now();

  await Promise.all(
    members.map(async (member) => {
      const lastEmailed = member.last_emailed_at ? Date.parse(member.last_emailed_at) : 0;
      const lastActive = Date.parse((member.profiles as unknown as { last_active_at: string }).last_active_at);
      if (now - lastEmailed < MESSAGE_EMAIL_COOLDOWN_MS) return;
      if (now - lastActive < RECENTLY_ACTIVE_MS) return;
      const to = await recipient(member.user_id, "notify_email_messages");
      if (!to) return;
      const sent = await sendEmail({ to, ...newMessageEmail(senderName, preview, conversationId, groupName) });
      if (sent) {
        await admin
          .from("conversation_members")
          .update({ last_emailed_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .eq("user_id", member.user_id);
      }
    }),
  );
}

export async function emailGroupInvite(requestId: string) {
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("group_requests")
    .select("user_id, created_by, kind, groups(name)")
    .eq("id", requestId)
    .single();
  if (!request || request.kind !== "invite") return;
  const to = await recipient(request.user_id, "notify_email_groups");
  if (!to) return;
  const groupName = (request.groups as { name: string } | null)?.name ?? "their group";
  await sendEmail({ to, ...groupInviteEmail(await firstName(request.created_by), groupName) });
}
