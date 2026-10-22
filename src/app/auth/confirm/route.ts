import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { afterSignIn, destinationFor } from "@/app/actions/auth";

/** One-tap link from the sign-in email (token_hash flow). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const next = url.searchParams.get("next");

  if (tokenHash) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error && data.user) {
      await afterSignIn(data.user);
      return NextResponse.redirect(new URL(await destinationFor(data.user.id, next), url.origin));
    }
  }

  const login = new URL("/login", url.origin);
  login.searchParams.set("error", "link_expired");
  return NextResponse.redirect(login);
}
