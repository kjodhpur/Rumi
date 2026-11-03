/**
 * Row Level Security for the Phase 0 staff tables, run against the local Supabase
 * stack (`npm run db:start`). Skipped automatically when the stack isn't running.
 * Each role signs in for real and queries through PostgREST, exactly like the app.
 */
import fs from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
const LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)/.test(URL);

async function stackUp() {
  if (!LOCAL || !ANON || !SERVICE) return false;
  try {
    const res = await fetch(`${URL}/auth/v1/health`, { headers: { apikey: ANON }, signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

const available = await stackUp();
type Db = SupabaseClient<Database>;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const run = Date.now().toString(36);
const OTHER = `rls-${run}`.slice(0, 32);
const PASSWORD = `Rls-test-${run}-pw!`;

describe.skipIf(!available)("RLS: staff, consent and audit tables", () => {
  const admin = createClient<Database>(URL, SERVICE, options) as Db;
  const ids: Record<string, string> = {};
  const clients: Record<string, Db> = {};

  function must(result: { error: { message: string } | null }) {
    if (result.error) throw new Error(result.error.message);
  }

  async function makeUser(key: string, email: string) {
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    if (error) throw error;
    ids[key] = data.user.id;
    const client = createClient<Database>(URL, ANON, options) as Db;
    const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (signInError) throw signInError;
    clients[key] = client;
  }

  beforeAll(async () => {
    must(await admin.from("schools").insert({ id: OTHER, name: "Other U", short_name: "OU", email_domains: [`${run}.other.test`] }));
    await Promise.all([
      makeUser("admin", `rls-admin-${run}@asu.edu`),
      makeUser("ra", `rls-ra-${run}@asu.edu`),
      makeUser("analyst", `rls-analyst-${run}@asu.edu`),
      makeUser("studentA", `rls-a-${run}@asu.edu`),
      makeUser("studentB", `rls-b-${run}@asu.edu`),
      makeUser("otherAdmin", `rls-oa-${run}@${run}.other.test`),
    ]);
    const staffRows: Database["public"]["Tables"]["staff_members"]["Insert"][] = [
      { user_id: ids.admin, school_id: "asu", role: "housing_admin", scopes: {} },
      { user_id: ids.ra, school_id: "asu", role: "ra", scopes: { buildings: ["Hall A"] } },
      { user_id: ids.analyst, school_id: "asu", role: "analyst", scopes: {} },
      { user_id: ids.otherAdmin, school_id: OTHER, role: "housing_admin", scopes: {} },
    ];
    must(await admin.from("staff_members").insert(staffRows));
    await admin.from("profiles").update({ is_staff: true }).in("id", [ids.admin, ids.ra, ids.analyst, ids.otherAdmin]);
    await admin
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString(), first_name: "Test" })
      .in("id", [ids.studentA, ids.studentB]);
    await admin.from("staff_invites").insert([
      { school_id: "asu", email: `invitee-${run}@asu.edu`, role: "housing_staff", token_hash: `h-${run}-1`, expires_at: new Date(Date.now() + 86_400_000).toISOString() },
      { school_id: OTHER, email: `invitee-${run}@${run}.other.test`, role: "analyst", token_hash: `h-${run}-2`, expires_at: new Date(Date.now() + 86_400_000).toISOString() },
    ]);
    await admin.from("audit_log").insert([
      { school_id: "asu", action: `test_asu_${run}`, entity: "test" },
      { school_id: OTHER, action: `test_other_${run}`, entity: "test" },
    ]);
    await admin.from("retention_policies").insert({ school_id: "asu", entity: "orphaned_messages", days: 60 });
  });

  afterAll(async () => {
    await admin.from("retention_policies").delete().eq("school_id", "asu").eq("entity", "orphaned_messages");
    await admin.from("schools").update({ hide_seed_profiles: false }).eq("id", "asu");
    await admin.from("staff_invites").delete().like("token_hash", `h-${run}-%`);
    for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
    await admin.from("schools").delete().eq("id", OTHER);
  });

  it("students can't read any staff table", async () => {
    const db = clients.studentA;
    for (const table of ["staff_members", "staff_invites", "audit_log", "retention_policies"] as const) {
      const { data, error } = await db.from(table).select("*");
      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });

  it("a housing admin reads their own school's team, invites, audit and retention — not another school's", async () => {
    const db = clients.admin;
    const staff = await db.from("staff_members").select("school_id");
    expect(new Set(staff.data?.map((r) => r.school_id))).toEqual(new Set(["asu"]));
    const invites = await db.from("staff_invites").select("school_id").like("token_hash", `h-${run}-%`);
    expect(invites.data?.map((r) => r.school_id)).toEqual(["asu"]);
    const audit = await db.from("audit_log").select("action").in("action", [`test_asu_${run}`, `test_other_${run}`]);
    expect(audit.data?.map((r) => r.action)).toEqual([`test_asu_${run}`]);
    const retention = await db.from("retention_policies").select("school_id");
    expect(retention.data?.every((r) => r.school_id === "asu")).toBe(true);
  });

  it("an analyst sees only their own staff row, and no invites or audit entries", async () => {
    const db = clients.analyst;
    const staff = await db.from("staff_members").select("user_id");
    expect(staff.data?.map((r) => r.user_id)).toEqual([ids.analyst]);
    expect((await db.from("staff_invites").select("id")).data).toEqual([]);
    expect((await db.from("audit_log").select("id")).data).toEqual([]);
  });

  it("an RA scoped to Hall A passes the scope check for Hall A only", async () => {
    const db = clients.ra;
    expect((await db.rpc("staff_scope_includes", { p_school: "asu", p_building: "Hall A" })).data).toBe(true);
    expect((await db.rpc("staff_scope_includes", { p_school: "asu", p_building: "Hall B" })).data).toBe(false);
    expect((await clients.admin.rpc("staff_scope_includes", { p_school: "asu", p_building: "Hall B" })).data).toBe(true);
  });

  it("has_role respects school and role", async () => {
    expect((await clients.admin.rpc("has_role", { p_school: "asu", p_roles: ["housing_admin"] })).data).toBe(true);
    expect((await clients.admin.rpc("has_role", { p_school: OTHER, p_roles: ["housing_admin"] })).data).toBe(false);
    expect((await clients.analyst.rpc("has_role", { p_school: "asu", p_roles: ["housing_admin"] })).data).toBe(false);
    expect((await clients.studentA.rpc("has_role", { p_school: "asu", p_roles: ["housing_admin", "analyst"] })).data).toBe(false);
  });

  it("staff can't browse student profiles, and students can't see staff", async () => {
    expect((await clients.admin.from("profiles").select("id").eq("id", ids.studentA)).data).toEqual([]);
    expect((await clients.studentA.from("profiles").select("id").eq("id", ids.admin)).data).toEqual([]);
    expect((await clients.studentA.from("profiles").select("id").eq("id", ids.studentB)).data).toHaveLength(1);
  });

  it("hiding seed profiles removes them from students' view immediately", async () => {
    await admin.from("profiles").update({ is_seed: true }).eq("id", ids.studentB);
    await admin.from("schools").update({ hide_seed_profiles: true }).eq("id", "asu");
    expect((await clients.studentA.from("profiles").select("id").eq("id", ids.studentB)).data).toEqual([]);
    await admin.from("schools").update({ hide_seed_profiles: false }).eq("id", "asu");
    expect((await clients.studentA.from("profiles").select("id").eq("id", ids.studentB)).data).toHaveLength(1);
  });

  it("students change consent only through set_consent, and see only their own", async () => {
    const db = clients.studentA;
    const direct = await db.from("consents").insert({ user_id: ids.studentA, school_id: "asu", kind: "checkins", version: "x" });
    expect(direct.error).not.toBeNull();

    expect((await db.rpc("set_consent", { p_kind: "share_with_housing", p_granted: true, p_version: "t" })).error).toBeNull();
    expect((await db.rpc("set_consent", { p_kind: "share_with_housing", p_granted: true, p_version: "t" })).error).toBeNull();
    const active = await db.from("consents").select("kind, revoked_at").is("revoked_at", null);
    expect(active.data).toEqual([{ kind: "share_with_housing", revoked_at: null }]);

    await db.rpc("set_consent", { p_kind: "share_with_housing", p_granted: false, p_version: "t" });
    const history = await db.from("consents").select("revoked_at");
    expect(history.data).toHaveLength(1);
    expect(history.data?.[0].revoked_at).not.toBeNull();

    expect((await clients.studentB.from("consents").select("id")).data).toEqual([]);
  });

  it("staff can't set consents for themselves", async () => {
    const { error } = await clients.admin.rpc("set_consent", { p_kind: "share_with_housing", p_granted: true, p_version: "t" });
    expect(error?.message).toContain("not_allowed");
  });

  it("nobody can rewrite the audit log, not even the service role", async () => {
    const update = await admin.from("audit_log").update({ action: "tampered" }).eq("action", `test_asu_${run}`);
    expect(update.error?.message).toMatch(/permission denied/i);
    const remove = await admin.from("audit_log").delete().eq("action", `test_asu_${run}`);
    expect(remove.error?.message).toMatch(/permission denied/i);
    const studentInsert = await clients.studentA.from("audit_log").insert({ school_id: "asu", action: "x", entity: "x" });
    expect(studentInsert.error).not.toBeNull();
  });

  it("disabling a staff member removes access on their next request", async () => {
    await admin.from("staff_members").update({ disabled_at: new Date().toISOString() }).eq("user_id", ids.admin);
    expect((await clients.admin.from("staff_invites").select("id").like("token_hash", `h-${run}-%`)).data).toEqual([]);
    expect((await clients.admin.rpc("has_role", { p_school: "asu", p_roles: ["housing_admin"] })).data).toBe(false);
    await admin.from("staff_members").update({ disabled_at: null }).eq("user_id", ids.admin);
  });
});
