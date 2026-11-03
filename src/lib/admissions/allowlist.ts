import { createHash } from "node:crypto";
import type { ServerSupabase } from "@/lib/supabase/server";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPersonalEmail(email: string): string {
  const normalized = normalizeEmail(email);
  return createHash("sha256").update(normalized).digest("hex");
}

export interface ParsedAllowlistRow {
  email: string;
  emailHash: string;
}

/**
 * Parses a raw CSV or newline-delimited list of emails into validated,
 * normalized hashes ready for storage without saving plaintext emails.
 */
export function parseAllowlistCsv(content: string): ParsedAllowlistRow[] {
  const lines = content.split(/\r?\n/);
  const rows: ParsedAllowlistRow[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.toLowerCase() === "email") {
      continue;
    }
    // Handle comma-separated columns if present
    const firstCol = trimmed.split(",")[0].trim().replace(/^["']|["']$/g, "");
    if (!firstCol || !firstCol.includes("@")) continue;

    const email = normalizeEmail(firstCol);
    const emailHash = hashPersonalEmail(email);

    if (!seen.has(emailHash)) {
      seen.add(emailHash);
      rows.push({ email, emailHash });
    }
  }

  return rows;
}

/**
 * Checks whether an incoming applicant personal email has been allowlisted by the school.
 */
export async function isEmailAllowlisted(
  supabase: ServerSupabase,
  schoolId: string,
  email: string,
): Promise<{ allowlisted: boolean; termId: string | null; alreadyUsed: boolean }> {
  const hash = hashPersonalEmail(email);

  const { data, error } = await supabase
    .from("admit_allowlist")
    .select("id, term_id, used_at")
    .eq("school_id", schoolId)
    .eq("email_hash", hash)
    .maybeSingle();

  if (error || !data) {
    return { allowlisted: false, termId: null, alreadyUsed: false };
  }

  return {
    allowlisted: true,
    termId: data.term_id,
    alreadyUsed: Boolean(data.used_at),
  };
}
