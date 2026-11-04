import "server-only";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { keyedHash } from "@/lib/crypto";
import { SOURCE_COOKIE, parseSourceCookie } from "./attribution";

/**
 * Records a new student's entry source once, when onboarding finishes. A cookie for a
 * different school than the student's own is ignored. Never throws.
 */
export async function recordAttribution(userId: string, schoolId: string | null) {
  try {
    const jar = cookies();
    const parsed = parseSourceCookie(jar.get(SOURCE_COOKIE)?.value);
    if (!parsed || !schoolId || parsed.school !== schoolId) return;
    const expected = Buffer.from(keyedHash("src", `${parsed.school}.${parsed.source}`));
    const given = Buffer.from(parsed.signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return;
    await createAdminClient()
      .from("link_attributions")
      .upsert(
        { school_id: schoolId, source: parsed.source, user_id: userId },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    jar.delete(SOURCE_COOKIE);
  } catch (error) {
    console.error("[attribution] record failed", error);
  }
}
