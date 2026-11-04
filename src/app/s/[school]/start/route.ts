import { NextResponse, type NextRequest } from "next/server";
import { keyedHash } from "@/lib/crypto";
import { getUser } from "@/lib/supabase/server";
import {
  SOURCE_COOKIE,
  SOURCE_COOKIE_MAX_AGE,
  isSchoolSlug,
  normalizeSource,
  sourceCookieValue,
} from "@/lib/integrations/attribution";

export const dynamic = "force-dynamic";

/** Remembers where the student came from (signed, httpOnly), then sends them to sign in. */
export async function GET(request: NextRequest, { params }: { params: { school: string } }) {
  const school = params.school.toLowerCase();
  if (!isSchoolSlug(school)) return NextResponse.redirect(new URL("/", request.url));
  const user = await getUser();
  const response = NextResponse.redirect(
    new URL(user ? "/matches" : "/login?next=/onboarding", request.url),
  );
  if (user) return response;
  const source = normalizeSource(request.nextUrl.searchParams.get("src"));
  try {
    response.cookies.set(
      SOURCE_COOKIE,
      sourceCookieValue(school, source, keyedHash("src", `${school}.${source}`)),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SOURCE_COOKIE_MAX_AGE,
        path: "/",
      },
    );
  } catch (error) {
    // Without the signing key, attribution is skipped; sign-in still works.
    console.error("[attribution] couldn't sign the source cookie", error);
  }
  return response;
}
