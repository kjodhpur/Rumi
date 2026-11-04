import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { authorizeUrl, configuredProviders, isCalendarProvider } from "@/lib/calendar/oauth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const COOKIE = "rumi_calendar_oauth";

/** Starts a read-only free/busy connection. A random state in an httpOnly cookie guards CSRF. */
export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const back = (status: string) =>
    NextResponse.redirect(new URL(`/settings/accounts?calendar=${status}`, request.url));
  const user = await getUser();
  if (!user)
    return NextResponse.redirect(new URL("/login?next=%2Fsettings%2Faccounts", request.url));
  const provider = params.provider;
  if (!isCalendarProvider(provider) || !configuredProviders().includes(provider))
    return back("unavailable");
  if (!(await rateLimit(`calendar-connect:${user.id}`, LIMITS.calendarConnectsPerHour)))
    return back("busy");

  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(authorizeUrl(provider, state));
  response.cookies.set(COOKIE, JSON.stringify({ state, provider, userId: user.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/calendar",
    maxAge: 600,
  });
  return response;
}
