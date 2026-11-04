import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { sendExtraChannels } from "@/lib/notifications/dispatch";
import {
  groupInviteEmail,
  introAcceptedEmail,
  introReceivedEmail,
  newMessageEmail,
} from "./templates";
import { isSelectableLocale, type Locale } from "@/lib/i18n/config";

type EmailToggle =
  "notify_email_intros" | "notify_email_messages" | "notify_email_matches" | "notify_email_groups";

async function recipient(userId: string, toggle: EmailToggle) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select(`email, locale, ${toggle}`)
    .eq("user_id", userId)
    .maybeSingle();
  const settings = data as
    ({ email: string; locale: string } & Record<EmailToggle, boolean>) | null;
  if (!settings || !settings[toggle]) return null;
  return {
    email: settings.email,
    locale: isSelectableLocale(settings.locale) ? settings.locale : ("en" as Locale),
  };
}

async function firstName(userId: string) {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("first_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.first_name || "Someone";
}

export async function emailIntroReceived(introId: string) {
  const admin = createAdminClient();
  const { data: intro } = await admin
    .from("intros")
    .select("sender_id, recipient_id, message")
    .eq("id", introId)
    .single();
  if (!intro) return;
  const sender = await firstName(intro.sender_id);
  await sendExtraChannels("intros", {
    userId: intro.recipient_id,
    type: "intro_received",
    title: `${sender} sent you an intro`,
    href: "/messages?tab=requests",
  });
  const to = await recipient(intro.recipient_id, "notify_email_intros");
  if (!to) return;
  await sendEmail({ to: to.email, ...introReceivedEmail(sender, intro.message, to.locale) });
}

export async function emailIntroAccepted(introId: string) {
  const admin = createAdminClient();
  const { data: intro } = await admin
    .from("intros")
    .select("sender_id, recipient_id, conversation_id")
    .eq("id", introId)
    .single();
  if (!intro?.conversation_id) return;
  const accepter = await firstName(intro.recipient_id);
  await sendExtraChannels("intros", {
    userId: intro.sender_id,
    type: "intro_accepted",
    title: `${accepter} accepted your intro`,
    href: `/messages/${intro.conversation_id}`,
  });
  const to = await recipient(intro.sender_id, "notify_email_intros");
  if (!to) return;
  await sendEmail({
    to: to.email,
    ...introAcceptedEmail(accepter, intro.conversation_id, to.locale),
  });
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
      const lastActive = Date.parse(
        (member.profiles as unknown as { last_active_at: string }).last_active_at,
      );
      if (now - lastEmailed < MESSAGE_EMAIL_COOLDOWN_MS) return;
      if (now - lastActive < RECENTLY_ACTIVE_MS) return;
      // The 30-minute window covers texts and push too, so a busy chat never floods a phone.
      const extras = await sendExtraChannels("messages", {
        userId: member.user_id,
        type: "message",
        title: groupName ? `${senderName} in ${groupName}` : `New message from ${senderName}`,
        href: `/messages/${conversationId}`,
      });
      const to = await recipient(member.user_id, "notify_email_messages");
      const sent = to
        ? await sendEmail({
            to: to.email,
            ...newMessageEmail(senderName, preview, conversationId, groupName, to.locale),
          })
        : false;
      if (sent || extras.length) {
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
  const groupName = (request.groups as { name: string } | null)?.name ?? "their group";
  const inviter = await firstName(request.created_by);
  await sendExtraChannels("groups", {
    userId: request.user_id,
    type: "group_invite",
    title: `${inviter} invited you to ${groupName}`,
    href: "/messages?tab=requests",
  });
  const to = await recipient(request.user_id, "notify_email_groups");
  if (!to) return;
  await sendEmail({ to: to.email, ...groupInviteEmail(inviter, groupName, to.locale) });
}
