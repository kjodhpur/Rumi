import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unreadMessages = 0;
  let unreadIntros = 0;

  if (user) {
    const { data: parts } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);
    for (const p of parts ?? []) {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", p.conversation_id)
        .neq("sender_id", user.id)
        .gt("created_at", p.last_read_at ?? "1970-01-01");
      unreadMessages += count ?? 0;
    }

    const { count: introCount } = await supabase
      .from("intros")
      .select("*", { count: "exact", head: true })
      .eq("to_user_id", user.id)
      .eq("status", "pending");
    unreadIntros = introCount ?? 0;
  }

  return (
    <AppShell
      unreadMessages={unreadMessages}
      unreadIntros={unreadIntros}
      isAdmin={isAdminEmail(user?.email)}
    >
      {children}
    </AppShell>
  );
}
