import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Groups" };

export default async function GroupsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role, groups(id, name, status, max_members)")
    .eq("user_id", user!.id);

  const groups = (memberships ?? [])
    .map((m) => {
      const g = m.groups as unknown as {
        id: string;
        name: string;
        status: string;
        max_members: number;
      } | null;
      if (!g) return null;
      return { ...g, role: m.role as string };
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    status: string;
    max_members: number;
    role: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-ui text-3xl font-bold tracking-brand text-ink">Groups</h1>
          <p className="mt-1 text-ink-muted">Form a group of 2–4 and match for multi-bedroom places.</p>
        </div>
        <Link href="/groups/new">
          <Button>Create group</Button>
        </Link>
      </div>

      {!groups.length ? (
        <EmptyState
          title="No groups yet"
          description="Create a group, invite friends you’ve already intro’d, and browse group matches."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="block rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1 transition hover:shadow-elevation2"
              >
                <h2 className="font-ui text-lg font-semibold text-ink">{g.name}</h2>
                <p className="mt-1 text-sm capitalize text-ink-muted">
                  {g.status} · {g.role} · max {g.max_members}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
