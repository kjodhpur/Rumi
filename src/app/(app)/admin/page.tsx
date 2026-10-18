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
      <h1 className="font-display text-3xl font-black tracking-brand text-asu-maroon">Rumi admin</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Signups", signups ?? 0],
          ["Onboarded", onboarded ?? 0],
          ["Spotify connected", spotify ?? 0],
          ["Conversations", conversations ?? 0],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-rumi-sand bg-white p-4"
          >
            <p className="text-xs uppercase tracking-wide text-rumi-muted">{label}</p>
            <p className="font-display text-3xl font-bold text-asu-maroon">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-rumi-sand bg-white p-5">
        <h2 className="font-display text-xl text-asu-maroon">Events</h2>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {Array.from(eventCounts.entries()).map(([name, count]) => (
            <li key={name}>
              {name}: <strong>{count}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-asu-maroon">Reports</h2>
        {!reports?.length ? (
          <p className="text-sm text-rumi-muted">No reports.</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => {
              const reported = reportedMap.get(r.reported_id);
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-rumi-sand bg-white p-4 text-sm"
                >
                  <p>
                    <strong>{r.reason}</strong> · {r.status} ·{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                  <p className="text-rumi-muted">
                    Reported: {reported?.email ?? r.reported_id}
                  </p>
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
