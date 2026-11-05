/**
 * The cast for the per-table RLS tests (master prompt §4: one test per new table proving
 * allowed and denied access per role and for students). Built once per run by
 * global-setup.ts against the local Supabase stack; each table file reads it with inject().
 */
import fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const ROLES = [
  "anon",
  "studentA",
  "studentB",
  "studentC",
  "housingAdmin",
  "housingStaff",
  "ra",
  "analyst",
  "moderator",
  "otherAdmin",
  "otherStudent",
] as const;
export type Role = (typeof ROLES)[number];

/**
 * studentA owns most rows; studentC shares group G with A; studentB is a stranger at the same
 * school. Staff hold each role at the run's own school; otherAdmin and otherStudent belong to
 * another school.
 */
export interface World {
  url: string;
  anonKey: string;
  run: string;
  /** A throwaway school for this run, so singletons never collide with real local data. */
  school: string;
  otherSchool: string;
  ids: Record<Exclude<Role, "anon">, string>;
  tokens: Record<Exclude<Role, "anon">, string>;
  groupId: string;
  /** The agreement on group G (one per group), for the agreement child tables. */
  agreementId: string;
  termId: string;
  assignmentId: string;
}

export type Admin = SupabaseClient<Database>;

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (fs.existsSync(file)) process.loadEnvFile(file);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return {
    url,
    anon:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      "",
    service: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "",
    local: /^https?:\/\/(127\.0\.0\.1|localhost)/.test(url),
  };
}

export async function stackUp(url: string, anon: string) {
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };

export function adminClient(url: string, service: string): Admin {
  return createClient<Database>(url, service, options);
}

function must<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error || result.data == null) throw new Error(`${what}: ${result.error?.message}`);
  return result.data;
}

export async function buildWorld(url: string, anon: string, admin: Admin): Promise<World> {
  const run = Date.now().toString(36);
  const mainSchool = `rlsw-s-${run}`.slice(0, 32);
  const otherSchool = `rlsw-o-${run}`.slice(0, 32);
  const password = `Rls-world-${run}-pw!`;
  const schools = await admin.from("schools").insert([
    {
      id: mainSchool,
      name: "RLS University",
      short_name: "RU",
      email_domains: [`${run}.main.test`],
    },
    {
      id: otherSchool,
      name: "Other University",
      short_name: "OU",
      email_domains: [`${run}.other.test`],
    },
  ]);
  if (schools.error) throw new Error(`schools: ${schools.error.message}`);

  const emails: Record<Exclude<Role, "anon">, string> = {
    studentA: `rlsw-a-${run}@${run}.main.test`,
    studentB: `rlsw-b-${run}@${run}.main.test`,
    studentC: `rlsw-c-${run}@${run}.main.test`,
    housingAdmin: `rlsw-ha-${run}@${run}.main.test`,
    housingStaff: `rlsw-hs-${run}@${run}.main.test`,
    ra: `rlsw-ra-${run}@${run}.main.test`,
    analyst: `rlsw-an-${run}@${run}.main.test`,
    moderator: `rlsw-mo-${run}@${run}.main.test`,
    otherAdmin: `rlsw-oa-${run}@${run}.other.test`,
    otherStudent: `rlsw-os-${run}@${run}.other.test`,
  };
  const ids = {} as World["ids"];
  const tokens = {} as World["tokens"];
  for (const [role, email] of Object.entries(emails) as [Exclude<Role, "anon">, string][]) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`user ${role}: ${error?.message}`);
    ids[role] = data.user.id;
  }

  const staff: [Exclude<Role, "anon">, string, string][] = [
    ["housingAdmin", mainSchool, "housing_admin"],
    ["housingStaff", mainSchool, "housing_staff"],
    ["ra", mainSchool, "ra"],
    ["analyst", mainSchool, "analyst"],
    ["moderator", mainSchool, "moderator"],
    ["otherAdmin", otherSchool, "housing_admin"],
  ];
  const staffRows = await admin.from("staff_members").insert(
    staff.map(([role, school_id, staffRole]) => ({
      user_id: ids[role],
      school_id,
      role: staffRole,
      scopes: staffRole === "ra" ? { buildings: ["Hall A"] } : {},
    })),
  );
  if (staffRows.error) throw new Error(`staff: ${staffRows.error.message}`);
  await admin
    .from("profiles")
    .update({ is_staff: true })
    .in(
      "id",
      staff.map(([role]) => ids[role]),
    );
  await admin
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString(), first_name: "Rls" })
    .in("id", [ids.studentA, ids.studentB, ids.studentC, ids.otherStudent]);

  // Group G: A and C.
  const group = must(
    await admin
      .from("groups")
      .insert({ name: `RLS ${run}`, owner_id: ids.studentA, target_size: 2, school_id: mainSchool })
      .select("id")
      .single(),
    "group",
  );
  const members = await admin.from("group_members").insert([
    { group_id: group.id, user_id: ids.studentA, role: "owner" },
    { group_id: group.id, user_id: ids.studentC, role: "member" },
  ]);
  if (members.error) throw new Error(`group members: ${members.error.message}`);

  const term = must(
    await admin
      .from("terms")
      .insert({
        school_id: mainSchool,
        name: `RLS ${run}`,
        starts_on: "2027-08-15",
        ends_on: "2027-12-15",
        // Inactive: a school has one active term, and the app's may already be set.
        active: false,
      })
      .select("id")
      .single(),
    "term",
  );
  const assignment = must(
    await admin
      .from("assignments")
      .insert({
        user_id: ids.studentA,
        school_id: mainSchool,
        building: "Hall A",
        room: "101",
        moved_in_at: "2027-08-16",
        term_id: term.id,
      })
      .select("id")
      .single(),
    "assignment",
  );

  const agreement = must(
    await admin
      .from("agreements")
      .insert({ group_id: group.id, member_ids: [ids.studentA, ids.studentC] })
      .select("id")
      .single(),
    "agreement",
  );

  for (const [role, email] of Object.entries(emails) as [Exclude<Role, "anon">, string][]) {
    const client = createClient<Database>(url, anon, options);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(`sign in ${role}: ${error?.message}`);
    tokens[role] = data.session.access_token;
  }

  return {
    url,
    anonKey: anon,
    run,
    school: mainSchool,
    otherSchool,
    ids,
    tokens,
    groupId: group.id,
    agreementId: agreement.id,
    termId: term.id,
    assignmentId: assignment.id,
  };
}

export async function teardownWorld(world: World, admin: Admin) {
  await admin.from("groups").delete().eq("id", world.groupId);
  for (const id of Object.values(world.ids)) await admin.auth.admin.deleteUser(id);
  await admin.from("terms").delete().eq("id", world.termId);
  await admin.from("schools").delete().in("id", [world.school, world.otherSchool]);
}
