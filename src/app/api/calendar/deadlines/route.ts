import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { housingDatesFor } from "@/lib/calendar/housing-dates";
import { allDayIcs } from "@/lib/calendar/ics";
import { campusToday } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Housing dates as an .ics download, all of them or one (`?uid=`). No OAuth needed. */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const uid = request.nextUrl.searchParams.get("uid");
  const events = (await housingDatesFor(user.id, campusToday())).filter(
    (e) => !uid || e.uid === uid,
  );
  if (!events.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(allDayIcs(events, new Date(), uid ? undefined : "Housing dates"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${uid ? "housing-date" : "housing-dates"}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
