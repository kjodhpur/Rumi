import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { markNotificationsRead } from "@/app/actions/notifications";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: items } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  await markNotificationsRead();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-ui text-3xl font-bold tracking-brand text-ink">Notifications</h1>
      {!(items ?? []).length ? (
        <EmptyState
          title="All caught up"
          description="Intros, messages, and strong matches will show up here."
        />
      ) : (
        <ul className="space-y-2">
          {(items ?? []).map((n) => (
            <li key={n.id}>
              <Link
                href={n.href || "/matches"}
                className={`block rounded-lg border border-border p-4 shadow-elevation1 transition hover:shadow-elevation2 ${
                  n.read_at ? "bg-bg-elevated" : "bg-accent-soft"
                }`}
              >
                <p className="font-ui font-semibold text-ink">{n.title}</p>
                <p className="mt-1 text-sm text-ink-muted">{n.body}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
