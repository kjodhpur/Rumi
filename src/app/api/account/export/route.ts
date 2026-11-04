import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { collectAccountData } from "@/lib/account/export";

export const dynamic = "force-dynamic";

/**
 * Everything Rumi stores about the signed-in student, as one JSON download.
 * Other people's messages are included only where they're part of a chat with you;
 * reports filed about you, staff notes and third-party tokens are never exported.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in to download your data." }, { status: 401 });
  if (!(await rateLimit(`export:${user.id}`, { max: 5, window: 3600 }))) {
    return NextResponse.json({ error: "Too many exports. Try again in an hour." }, { status: 429 });
  }
  const body = await collectAccountData(user.id, "student");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="rumi-data-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
