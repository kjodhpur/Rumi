import { NextResponse, type NextRequest } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { fetchFeed, loadAreaNames, parseFilters } from "@/lib/matches";

export const dynamic = "force-dynamic";

/** One page of the ranked feed — used by infinite scroll. */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const filters = parseFilters(params);
  const offset = Math.max(0, Math.min(5000, Number(params.get("offset")) || 0));

  try {
    const supabase = createClient();
    const { names } = await loadAreaNames(supabase);
    const page = await fetchFeed(supabase, filters, offset, names);
    return NextResponse.json(page, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[api/matches]", error);
    return NextResponse.json({ error: "Couldn't load matches." }, { status: 500 });
  }
}
