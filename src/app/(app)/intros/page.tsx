import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { IntroActions } from "@/components/intros/intro-actions";

export const metadata = { title: "Intros" };

export default async function IntrosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: received }, { data: sent }] = await Promise.all([
    supabase
      .from("intros")
      .select("*")
      .eq("to_user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("intros")
      .select("*")
      .eq("from_user_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  const otherIds = [
    ...new Set([
      ...(received ?? []).map((i) => i.from_user_id),
      ...(sent ?? []).map((i) => i.to_user_id),
    ]),
  ];

  const { data: profiles } = otherIds.length
    ? await supabase.from("profiles").select("id, first_name, last_initial, photo_url").in("id", otherIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const pendingReceived = (received ?? []).filter((i) => i.status === "pending");
  const otherReceived = (received ?? []).filter((i) => i.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-ui text-3xl font-bold tracking-brand text-ink">Intros</h1>
        <p className="mt-1 text-ink-muted">
          Chat unlocks after an intro is accepted — no cold DMs.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-ui text-lg font-semibold">Received</h2>
        {!pendingReceived.length && !otherReceived.length ? (
          <EmptyState
            title="No intros yet"
            description="When someone sends you an intro, it shows up here."
          />
        ) : (
          <ul className="space-y-3">
            {[...pendingReceived, ...otherReceived].map((intro) => {
              const p = profileMap.get(intro.from_user_id);
              return (
                <li
                  key={intro.id}
                  className="rounded-lg border border-border bg-bg-elevated p-4 shadow-elevation1"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/profile/${intro.from_user_id}`}
                        className="font-ui font-semibold text-accent hover:underline"
                      >
                        {p ? displayName(p.first_name, p.last_initial) : "Student"}
                      </Link>
                      <p className="mt-1 text-sm text-ink">{intro.message}</p>
                      <p className="mt-1 text-xs capitalize text-ink-muted">{intro.status}</p>
                    </div>
                    {intro.status === "pending" ? <IntroActions introId={intro.id} mode="receive" /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-ui text-lg font-semibold">Sent</h2>
        {!(sent ?? []).length ? (
          <EmptyState
            title="No sent intros"
            description="Browse matches and send an intro to start a conversation."
          />
        ) : (
          <ul className="space-y-3">
            {(sent ?? []).map((intro) => {
              const p = profileMap.get(intro.to_user_id);
              return (
                <li
                  key={intro.id}
                  className="rounded-lg border border-border bg-bg-elevated p-4 shadow-elevation1"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/profile/${intro.to_user_id}`}
                        className="font-ui font-semibold text-accent hover:underline"
                      >
                        {p ? displayName(p.first_name, p.last_initial) : "Student"}
                      </Link>
                      <p className="mt-1 text-sm text-ink">{intro.message}</p>
                      <p className="mt-1 text-xs capitalize text-ink-muted">{intro.status}</p>
                    </div>
                    {intro.status === "pending" ? (
                      <IntroActions introId={intro.id} mode="withdraw" />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
