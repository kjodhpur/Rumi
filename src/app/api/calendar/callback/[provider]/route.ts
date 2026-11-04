import { NextResponse, type NextRequest } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { connectCalendar, isCalendarProvider } from "@/lib/calendar/oauth";
import { CONSENT_VERSION } from "@/lib/consent";

export const dynamic = "force-dynamic";

const COOKIE = "rumi_calendar_oauth";

export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const url = request.nextUrl;
  let saved: { state?: string; provider?: string; userId?: string } | null = null;
  try {
    saved = JSON.parse(request.cookies.get(COOKIE)?.value ?? "null");
  } catch {
    saved = null;
  }
  const back = (status: string) => {
    const response = NextResponse.redirect(
      new URL(`/settings/accounts?calendar=${status}`, url.origin),
    );
    response.cookies.delete({ name: COOKIE, path: "/api/calendar" });
    return response;
  };

  const user = await getUser();
  const provider = params.provider;
  const code = url.searchParams.get("code");
  if (
    !user ||
    !saved ||
    !isCalendarProvider(provider) ||
    saved.provider !== provider ||
    saved.userId !== user.id ||
    !saved.state ||
    saved.state !== url.searchParams.get("state")
  )
    return back("error");
  if (url.searchParams.get("error") || !code) return back("cancelled");

  try {
    await connectCalendar(user.id, provider, code);
    await createClient().rpc("set_consent", {
      p_kind: "calendar",
      p_granted: true,
      p_version: CONSENT_VERSION,
    });
    return back("connected");
  } catch (error) {
    console.error("[calendar] callback failed", provider, error);
    return back("error");
  }
}
