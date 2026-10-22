import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { afterSignIn, destinationFor } from "@/app/actions/auth";

/** OAuth (Google) and PKCE magic-link landing: exchange the code for a session. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const toLogin = (reason: string) => {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", reason);
    return NextResponse.redirect(login);
  };

  if (providerError) {
    // The sign-up trigger rejects non-school accounts ("Database error saving new user").
    const schoolProblem = /school_email_required|database error saving new user/i.test(providerError);
    return toLogin(schoolProblem ? "school_email" : "oauth");
  }
  if (!code) return toLogin("oauth");

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return toLogin("oauth");

  await afterSignIn(data.user);
  return NextResponse.redirect(new URL(await destinationFor(data.user.id, next), url.origin));
}
