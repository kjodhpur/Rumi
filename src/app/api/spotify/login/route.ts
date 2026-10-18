import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildSpotifyAuthorizeUrl, pkceChallenge, randomVerifier } from "@/lib/spotify";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const verifier = randomVerifier();
  const challenge = await pkceChallenge(verifier);
  const state = user.id;

  const cookieStore = cookies();
  cookieStore.set("spotify_pkce_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  cookieStore.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const url = buildSpotifyAuthorizeUrl({ state, codeChallenge: challenge });
  return NextResponse.redirect(url);
}
