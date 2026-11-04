import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** A student at this school by their account email (0.2 data-subject tools), or null. */
export async function findSchoolStudent(schoolId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  const db = createAdminClient();
  const { data: settings } = await db
    .from("user_settings")
    .select("user_id")
    .eq("email", normalized)
    .maybeSingle();
  if (!settings) return null;
  const { data: profile } = await db
    .from("profiles")
    .select("id, first_name, last_initial, is_staff")
    .eq("id", settings.user_id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!profile || profile.is_staff) return null;
  const { data: consent } = await db
    .from("consents")
    .select("id")
    .eq("user_id", profile.id)
    .eq("kind", "share_with_housing")
    .is("revoked_at", null)
    .maybeSingle();
  return {
    id: profile.id,
    name: `${profile.first_name} ${profile.last_initial}.`,
    consented: Boolean(consent),
  };
}

export type RequestBasis = "consent" | "legal";

/** Staff may export with the student's sharing consent, or with a written legal basis. */
export function basisProblem(
  basis: RequestBasis,
  consented: boolean,
  reason: string,
): string | null {
  if (basis === "consent" && !consented)
    return "This student hasn't chosen to share with your office. Record the legal basis instead.";
  if (basis === "legal" && reason.trim().length < 15)
    return "Describe the legal basis (for example, the request or policy) in a sentence.";
  return null;
}
