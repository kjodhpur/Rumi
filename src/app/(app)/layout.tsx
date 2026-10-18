import { AppNav } from "@/components/layout/nav";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unread = 0;
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
      unread += count ?? 0;
    }
  }

  return (
    <div className="min-h-screen bg-rumi-cream">
      <AppNav unread={unread} isAdmin={isAdminEmail(user?.email)} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
