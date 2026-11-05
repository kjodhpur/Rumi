/**
 * Small-cell suppression in staff segment analytics, against the local Supabase stack.
 * Counts under 5 are hidden, and when exactly one segment is hidden the smallest visible one is
 * hidden too, so the hidden count can't be worked out as the total minus the others.
 * Skipped automatically when the stack isn't running.
 */
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

async function stackUp() {
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(URL) || !ANON || !SERVICE) return false;
  try {
    const res = await fetch(`${URL}/auth/v1/health`, {
      headers: { apikey: ANON },
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const available = await stackUp();
const run = Date.now().toString(36);
const school = `segs-${run}`.slice(0, 32);
const domain = `${run}.segs.test`;

// One student per entry: [class_year, residential_college, llc].
const STUDENTS: [string, string, string][] = [
  ...Array.from({ length: 6 }, (_, i): [string, string, string] => [
    "freshman",
    i < 4 ? "cedar" : "maple",
    i < 2 ? "honors" : "none_llc",
  ]),
  ...Array.from({ length: 7 }, (_, i): [string, string, string] => [
    "sophomore",
    i < 4 ? "cedar" : "maple",
    i < 3 ? "stem" : "none_llc",
  ]),
  ["junior", "maple", "none_llc"],
  ["junior", "maple", "none_llc"],
];

describe.skipIf(!available)("staff segments: small-cell and complementary suppression", () => {
  const admin = createClient<Database>(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient<Database>;
  const ids: string[] = [];

  beforeAll(async () => {
    const created = await admin
      .from("schools")
      .insert({
        id: school,
        name: "Segment University",
        short_name: "SU",
        email_domains: [domain],
      });
    if (created.error) throw created.error;
    const options = await admin.from("school_options").insert([
      { school_id: school, kind: "residential_college", value: "cedar", label: "Cedar" },
      { school_id: school, kind: "residential_college", value: "maple", label: "Maple" },
      { school_id: school, kind: "llc", value: "honors", label: "Honors" },
      { school_id: school, kind: "llc", value: "stem", label: "STEM" },
      { school_id: school, kind: "llc", value: "none_llc", label: "No LLC" },
    ]);
    if (options.error) throw options.error;
    for (const [i, [classYear, college, llc]] of STUDENTS.entries()) {
      const { data, error } = await admin.auth.admin.createUser({
        email: `seg-${i}-${run}@${domain}`,
        email_confirm: true,
      });
      if (error) throw error;
      ids.push(data.user.id);
      const updated = await admin
        .from("profiles")
        .update({ school_id: school, class_year: classYear, residential_college: college, llc })
        .eq("id", data.user.id);
      if (updated.error) throw updated.error;
    }
  }, 60_000);

  afterAll(async () => {
    for (const id of ids) await admin.auth.admin.deleteUser(id);
    await admin.from("schools").delete().eq("id", school);
  });

  async function segments(dimension: string) {
    const { data, error } = await admin.rpc("staff_segments", {
      p_school: school,
      p_dimension: dimension,
      p_metric: "onboarding",
    });
    if (error) throw error;
    return new Map(data.map((row) => [row.value, row]));
  }

  it("hides a lone small segment and the smallest visible one with it", async () => {
    const rows = await segments("class_year");
    expect(rows.get("junior")).toMatchObject({ n: null, suppressed: true, complementary: false });
    // Without this, junior = 15 − 7 − 6.
    expect(rows.get("freshman")).toMatchObject({ n: null, suppressed: true, complementary: true });
    expect(rows.get("sophomore")).toMatchObject({ n: 7, suppressed: false, complementary: false });
    expect(rows.get("__total")).toMatchObject({ n: 15, suppressed: false });
  });

  it("hides nothing extra when no segment is small", async () => {
    const rows = await segments("residential_college");
    expect(rows.get("cedar")).toMatchObject({ n: 8, suppressed: false, complementary: false });
    expect(rows.get("maple")).toMatchObject({ n: 7, suppressed: false, complementary: false });
  });

  it("hides nothing extra when two or more segments are already hidden", async () => {
    const rows = await segments("llc");
    expect(rows.get("honors")).toMatchObject({ n: null, suppressed: true, complementary: false });
    expect(rows.get("stem")).toMatchObject({ n: null, suppressed: true, complementary: false });
    expect(rows.get("none_llc")).toMatchObject({ n: 10, suppressed: false, complementary: false });
  });
});
