import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAsuEmail } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/matches";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email && !isAsuEmail(user.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?error=asu_only`,
        );
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user!.id)
        .maybeSingle();
      if (profile && !profile.onboarding_complete) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
