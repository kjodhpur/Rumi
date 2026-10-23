import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { exchangeCode, saveConnection, syncTaste } from "@/lib/spotify";
import { recomputeMatchesFor } from "@/lib/matching/recompute";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const raw = request.cookies.get("rumi_spotify_oauth")?.value;
  let saved: { state: string; returnTo: string; userId: string } | null = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  const returnTo = saved?.returnTo ?? "/settings/accounts";
  const back = (status: string) => {
    const target = new URL(returnTo, url.origin);
    target.searchParams.set("spotify", status);
    const response = NextResponse.redirect(target);
    response.cookies.delete({ name: "rumi_spotify_oauth", path: "/api/spotify" });
    return response;
  };

  const user = await getUser();
  const code = url.searchParams.get("code");
  if (!user || !saved || saved.userId !== user.id || saved.state !== url.searchParams.get("state")) return back("error");
  if (url.searchParams.get("error") || !code) return back("cancelled");

  try {
    await saveConnection(user.id, await exchangeCode(code));
    await syncTaste(user.id);
    await recomputeMatchesFor(user.id);
    return back("connected");
  } catch (error) {
    console.error("[spotify] callback failed", error);
    return back("error");
  }
}
