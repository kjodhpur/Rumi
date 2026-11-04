import { createHash } from "node:crypto";
import { headerIndex, parseCsv } from "@/lib/csv/parse";

/**
 * Admitted-student allowlist (3.1). Pure. Staff upload personal emails or their SHA-256
 * hashes; only the hash is stored. Matches public.email_hash() in the database.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPersonalEmail(email: string): string {
  return createHash("sha256").update(normalizeEmail(email), "utf8").digest("hex");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HASH = /^[0-9a-f]{64}$/;

export interface ParsedAllowlist {
  hashes: string[];
  /** 1-based data row numbers that held neither an email nor a hash. */
  invalidRows: number[];
  duplicates: number;
}

/**
 * Reads a CSV with an "email" or "email_hash" column, or a plain list (one per line).
 * School-domain emails are refused: those students sign in with their school account.
 */
export function parseAllowlist(
  content: string,
  schoolDomains: string[] = [],
  maxRows = 20_000,
): ParsedAllowlist {
  const rows = parseCsv(content, maxRows + 1).filter((r) => r.some((c) => c.trim()));
  if (!rows.length) return { hashes: [], invalidRows: [], duplicates: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = headerIndex(header);
  const emailCol = col("email");
  const hashCol = col("email_hash");
  const hasHeader = emailCol >= 0 || hashCol >= 0;
  const data = hasHeader ? rows.slice(1) : rows;
  const domains = schoolDomains.map((d) => d.toLowerCase());

  const seen = new Set<string>();
  const invalidRows: number[] = [];
  let duplicates = 0;
  data.forEach((row, i) => {
    const raw =
      (hasHeader ? row[hashCol >= 0 ? hashCol : emailCol] : row[0])
        ?.trim()
        .replace(/^["']|["']$/g, "") ?? "";
    const value = raw.toLowerCase();
    let hash: string | null = null;
    if (HASH.test(value)) hash = value;
    else if (
      EMAIL.test(value) &&
      !domains.some((d) => value.endsWith(`@${d}`) || value.endsWith(`.${d}`))
    )
      hash = hashPersonalEmail(value);
    if (!hash) {
      invalidRows.push(i + 1);
      return;
    }
    if (seen.has(hash)) duplicates += 1;
    else seen.add(hash);
  });
  return { hashes: [...seen], invalidRows, duplicates };
}
