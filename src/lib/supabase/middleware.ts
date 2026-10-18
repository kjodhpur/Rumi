import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh session + gate protected routes.
 * Public routes (/, /privacy, /terms, /login, …) still work if Supabase env
 * is missing — we skip auth client creation so marketing pages deploy without secrets.
 */
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");
  const isPublic =
    path === "/" ||
    path.startsWith("/privacy") ||
    path.startsWith("/terms") ||
    path.startsWith("/api/cron") ||
    path.startsWith("/api/spotify/callback") ||
    isAuthRoute;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    if (isPublic) {
      return NextResponse.next({ request });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "config");
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/matches";
    return NextResponse.redirect(url);
  }

  if (user && !isPublic && !path.startsWith("/onboarding") && !path.startsWith("/api")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, suspended")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.suspended) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "suspended");
      return NextResponse.redirect(url);
    }

    if (profile && !profile.onboarding_complete) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
