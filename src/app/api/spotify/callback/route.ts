import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeSpotifyCode, persistSpotifyConnection } from "@/lib/spotify";
import { recomputeMatchCache } from "@/lib/matches-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const cookieStore = cookies();
  const verifier = cookieStore.get("spotify_pkce_verifier")?.value;
  const expectedState = cookieStore.get("spotify_oauth_state")?.value;

  if (!code || !verifier || !state || state !== expectedState) {
    return NextResponse.redirect(`${origin}/me?spotify=error`);
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const tokens = await exchangeSpotifyCode(code, verifier);
    await persistSpotifyConnection(user.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
    try {
      await recomputeMatchCache(user.id);
    } catch {
      /* optional */
    }
  } catch {
    return NextResponse.redirect(`${origin}/me?spotify=error`);
  }

  cookieStore.delete("spotify_pkce_verifier");
  cookieStore.delete("spotify_oauth_state");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && !profile.onboarding_complete) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }
  return NextResponse.redirect(`${origin}/me?spotify=connected`);
}
