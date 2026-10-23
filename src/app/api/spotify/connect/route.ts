import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { authorizeUrl, spotifyConfigured } from "@/lib/spotify";

function safeReturn(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/settings/accounts";
}

/** Starts Spotify OAuth. A random state in an httpOnly cookie guards against CSRF. */
export async function GET(request: NextRequest) {
  const returnTo = safeReturn(request.nextUrl.searchParams.get("returnTo"));
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(returnTo)}`, request.url));
  if (!spotifyConfigured()) {
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}spotify=unavailable`, request.url));
  }

  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(authorizeUrl(state));
  response.cookies.set("rumi_spotify_oauth", JSON.stringify({ state, returnTo, userId: user.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/spotify",
    maxAge: 600,
  });
  return response;
}
