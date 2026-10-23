import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const PUBLIC_PREFIXES = ["/login", "/auth", "/privacy", "/terms", "/offline", "/suspended", "/api/cron"];

const MARKETING = new Set(["/", "/privacy", "/terms", "/offline"]);

function isPublic(pathname: string) {
  return pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Refreshes the Supabase session cookie and guards private routes. */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;

  // Marketing pages never need the session, so skip the auth round trip entirely.
  if (MARKETING.has(pathname)) return NextResponse.next();

  // Without Supabase configured, marketing pages still render; app pages can't.
  if (!url || !key) {
    return isPublic(pathname) ? NextResponse.next() : NextResponse.redirect(new URL("/", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Must run before any redirect so refreshed tokens are written to the response.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/matches", request.url));
  }

  return response;
}
