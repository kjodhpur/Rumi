/**
 * Row Level Security for Phase 1 (dashboard, pairings, auto-pair), against the local
 * Supabase stack. Skipped automatically when the stack isn't running.
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

async function stackUp() {
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(URL) || !ANON || !SERVICE) return false;
  try {
    return (await fetch(`${URL}/auth/v1/health`, { headers: { apikey: ANON }, signal: AbortSignal.timeout(1500) })).ok;
  } catch {
    return false;
  }
}

const available = await stackUp();
type Db = SupabaseClient<Database>;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const run = Date.now().toString(36);
const PASSWORD = `Rls-dash-${run}-pw!`;

describe.skipIf(!available)("RLS: dashboard, pairings and auto-pair", () => {
  const admin = createClient<Database>(URL, SERVICE, options) as Db;
  const ids: Record<string, string> = {};
  const clients: Record<string, Db> = {};
  let proposalId = "";
  let draftId = "";
  let runId = "";

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
    await Promise.all([
      makeUser("lead", `rls-d-lead-${run}@asu.edu`),
      makeUser("analyst", `rls-d-analyst-${run}@asu.edu`),
      makeUser("a", `rls-d-a-${run}@asu.edu`),
      makeUser("b", `rls-d-b-${run}@asu.edu`),
      makeUser("c", `rls-d-c-${run}@asu.edu`),
    ]);
    await admin.from("profiles").update({ is_staff: true }).in("id", [ids.lead, ids.analyst]);
    await admin.from("staff_members").insert([
      { user_id: ids.lead, school_id: "asu", role: "housing_staff", scopes: {} },
      { user_id: ids.analyst, school_id: "asu", role: "analyst", scopes: {} },
    ]);
    const { data: runRow } = await admin.from("auto_pair_runs").insert({ school_id: "asu", params: {}, stats: {} }).select("id").single();
    const { data: sent } = await admin
      .from("auto_pair_proposals")
      .insert({ run_id: runRow!.id, school_id: "asu", member_ids: [ids.a, ids.b], score: 80, status: "sent" })
      .select("id")
      .single();
    const { data: draft } = await admin
      .from("auto_pair_proposals")
      .insert({ run_id: runRow!.id, school_id: "asu", member_ids: [ids.a, ids.c], score: 70, status: "proposed" })
      .select("id")
      .single();
    proposalId = sent!.id;
    draftId = draft!.id;
    runId = runRow!.id;
  });

  afterAll(async () => {
    await admin.from("auto_pair_runs").delete().eq("id", runId);
    for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
  });

  it("only housing leads and analysts get the overview; students get nothing", async () => {
    expect((await clients.lead.rpc("staff_overview", { p_school: "asu", p_weeks: 8 })).error).toBeNull();
    expect((await clients.analyst.rpc("staff_overview", { p_school: "asu", p_weeks: 8 })).error).toBeNull();
    expect((await clients.a.rpc("staff_overview", { p_school: "asu", p_weeks: 8 })).error?.message).toContain("not_allowed");
  });

  it("analysts can't call the student-level functions", async () => {
    expect((await clients.analyst.rpc("staff_unmatched", { p_school: "asu" })).error?.message).toContain("not_allowed");
    expect((await clients.analyst.rpc("staff_pairings", { p_school: "asu" })).error?.message).toContain("not_allowed");
    expect((await clients.lead.rpc("staff_unmatched", { p_school: "asu" })).error).toBeNull();
  });

  it("students can't read runs, pairings or campaigns", async () => {
    for (const table of ["auto_pair_runs", "pairings", "campaigns"] as const) {
      expect((await clients.a.from(table).select("id")).data).toEqual([]);
    }
  });

  it("a proposal is visible to its two students once sent, never before, and never to anyone else", async () => {
    const seenByA = await clients.a.from("auto_pair_proposals").select("id").in("id", [proposalId, draftId]);
    expect(seenByA.data?.map((r) => r.id)).toEqual([proposalId]);
    expect((await clients.b.from("auto_pair_proposals").select("id").eq("id", proposalId)).data).toHaveLength(1);
    expect((await clients.c.from("auto_pair_proposals").select("id").in("id", [proposalId, draftId])).data).toEqual([]);
    expect((await clients.analyst.from("auto_pair_proposals").select("id").eq("id", proposalId)).data).toEqual([]);
    expect((await clients.lead.from("auto_pair_proposals").select("id").in("id", [proposalId, draftId])).data).toHaveLength(2);
  });

  it("only the two students can answer a suggestion, and only while it's open", async () => {
    expect((await clients.c.rpc("respond_housing_suggestion", { p_id: proposalId, p_accept: true })).error?.message).toContain("not_found");
    expect((await clients.a.rpc("respond_housing_suggestion", { p_id: draftId, p_accept: true })).error?.message).toContain("not_pending");
    const decline = await clients.a.rpc("respond_housing_suggestion", { p_id: proposalId, p_accept: false });
    expect(decline.data).toBe("declined");
    expect((await clients.b.rpc("respond_housing_suggestion", { p_id: proposalId, p_accept: true })).error?.message).toContain("not_pending");
  });

  it("export column mappings are housing-admin only, and student IDs stay with their owner", async () => {
    await admin.from("integration_mappings").upsert({ school_id: "asu", provider: "starrez", direction: "export", mapping: [] });
    expect((await clients.lead.from("integration_mappings").select("school_id")).data).toEqual([]);
    expect((await clients.a.from("integration_mappings").select("school_id")).data).toEqual([]);
    await admin.from("integration_mappings").delete().eq("school_id", "asu");
    await admin.from("user_settings").update({ student_id_enc: "sealed" }).eq("user_id", ids.a);
    expect((await clients.b.from("user_settings").select("student_id_enc").eq("user_id", ids.a)).data).toEqual([]);
    const write = await clients.a.from("user_settings").update({ student_id_enc: "forged" }).eq("user_id", ids.a);
    expect(write.error).not.toBeNull();
  });

  it("students can't write proposals or pairings directly", async () => {
    const update = await clients.a.from("auto_pair_proposals").update({ status: "accepted" }).eq("id", proposalId).select("id");
    expect(update.data ?? []).toEqual([]);
    const insert = await clients.a.from("pairings").insert({ school_id: "asu", member_ids: [ids.a] });
    expect(insert.error).not.toBeNull();
  });
});
