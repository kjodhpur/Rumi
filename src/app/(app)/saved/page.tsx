import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { displayName } from "@/lib/utils";

export const metadata = { title: "Saved" };

export default async function SavedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: saved } = await supabase
    .from("saved_profiles")
    .select("saved_id, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const ids = (saved ?? []).map((s) => s.saved_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("*").in("id", ids)
    : { data: [] };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold text-asu-maroon">Saved</h1>
      {!profiles?.length ? (
        <EmptyState
          title="No saved profiles"
          description="Tap Save on a match to keep them here."
          action={
            <Link href="/matches" className="text-sm font-semibold text-asu-maroon underline">
              Browse matches
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-rumi-sand rounded-2xl border border-rumi-sand bg-white">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/profile/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-rumi-cream/60"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-rumi-sand text-asu-maroon">
                  {p.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    p.first_name.charAt(0)
                  )}
                </div>
                <div>
                  <p className="font-semibold">
                    {displayName(p.first_name, p.last_initial)}
                  </p>
                  <p className="text-sm text-rumi-muted">
                    {p.year} · {p.major}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
