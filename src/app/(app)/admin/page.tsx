import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { AdminActions } from "@/components/admin/admin-actions";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/matches");

  const admin = createAdminClient();
  const [
    { count: signups },
    { count: onboarded },
    { count: spotify },
    { count: conversations },
    { count: pendingIntros },
    { count: groups },
    { count: openReports },
    { data: reports },
    { data: events },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("onboarding_complete", true),
    admin.from("spotify_connections").select("*", { count: "exact", head: true }),
    admin.from("conversations").select("*", { count: "exact", head: true }),
    admin
      .from("intros")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("groups")
      .select("*", { count: "exact", head: true })
      .neq("status", "dissolved"),
    admin
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    admin.from("reports").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("events").select("event_name").limit(5000),
  ]);

  const reportedIds = Array.from(new Set((reports ?? []).map((r) => r.reported_id)));
  const { data: reportedProfiles } = reportedIds.length
    ? await admin
        .from("profiles")
        .select("id, email, first_name, suspended")
        .in("id", reportedIds)
    : { data: [] };
  const reportedMap = new Map((reportedProfiles ?? []).map((p) => [p.id, p]));

  const eventCounts = new Map<string, number>();
  for (const e of events ?? []) {
    eventCounts.set(e.event_name, (eventCounts.get(e.event_name) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <h1 className="font-ui text-3xl font-bold tracking-brand text-ink">Rumi admin</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Signups", signups ?? 0],
          ["Onboarded", onboarded ?? 0],
          ["Pending intros", pendingIntros ?? 0],
          ["Active groups", groups ?? 0],
          ["Spotify connected", spotify ?? 0],
          ["Conversations", conversations ?? 0],
          ["Open reports", openReports ?? 0],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-lg border border-border bg-bg-elevated p-4 shadow-elevation1"
          >
            <p className="font-ui text-xs uppercase tracking-wide text-ink-muted">{label}</p>
            <p className="font-ui text-3xl font-bold tabular-nums text-accent">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1">
        <h2 className="font-ui text-xl font-semibold text-ink">Events</h2>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {Array.from(eventCounts.entries()).map(([name, count]) => (
            <li key={name}>
              {name}: <strong>{count}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-ui text-xl font-semibold text-ink">Reports</h2>
        {!reports?.length ? (
          <p className="text-sm text-ink-muted">No reports.</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => {
              const reported = reportedMap.get(r.reported_id);
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-border bg-bg-elevated p-4 text-sm shadow-elevation1"
                >
                  <p>
                    <strong>{r.reason}</strong> · {r.status} ·{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                  <p className="text-ink-muted">Reported: {reported?.email ?? r.reported_id}</p>
                  {r.details ? <p>{r.details}</p> : null}
                  <AdminActions
                    reportId={r.id}
                    userId={r.reported_id}
                    suspended={Boolean(reported?.suspended)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
