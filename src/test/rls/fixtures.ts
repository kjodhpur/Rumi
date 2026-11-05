/** Shared fixtures for the per-table RLS tests. */
import type { Admin, Role, World } from "./world";

export const HA: Role[] = ["housingAdmin"];
export const LEADS: Role[] = ["housingAdmin", "housingStaff"];
export const LEADS_ANALYST: Role[] = [...LEADS, "analyst"];
/** Students at the run's school (not the other school's student). */
export const STUDENTS: Role[] = ["studentA", "studentB", "studentC"];
/** Everyone with a profile at the run's school: school-wide settings are theirs to read. */
export const SCHOOL: Role[] = [
  ...STUDENTS,
  "housingAdmin",
  "housingStaff",
  "ra",
  "analyst",
  "moderator",
];
/** Group G. */
export const MEMBERS: Role[] = ["studentA", "studentC"];

const created: string[] = [];

/** An onboarded student at the run's school, outside every group. */
export async function freshUser(db: Admin, w: World, n: string) {
  const { data, error } = await db.auth.admin.createUser({
    email: `rlsx-${n}-${crypto.randomUUID().slice(0, 8)}@${w.run}.main.test`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`fresh user: ${error?.message}`);
  created.push(data.user.id);
  await db
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString(), first_name: "Rlsx" })
    .eq("id", data.user.id);
  return data.user.id;
}

/** A group of two fresh students. */
export async function freshGroup(db: Admin, w: World, n: string) {
  const [a, b] = [await freshUser(db, w, `${n}a`), await freshUser(db, w, `${n}b`)];
  const { data, error } = await db
    .from("groups")
    .insert({ name: `RLSX ${n}`, owner_id: a, target_size: 2, school_id: w.school })
    .select("id")
    .single();
  if (error || !data) throw new Error(`fresh group: ${error?.message}`);
  await db.from("group_members").insert([
    { group_id: data.id, user_id: a, role: "owner" },
    { group_id: data.id, user_id: b, role: "member" },
  ]);
  return { groupId: data.id, members: [a, b] as [string, string] };
}

export async function freshTerm(db: Admin, w: World, n: string) {
  const { data, error } = await db
    .from("terms")
    .insert({
      school_id: w.school,
      name: `RLSX ${n}`,
      starts_on: "2029-01-10",
      ends_on: "2029-05-10",
      active: false,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`fresh term: ${error?.message}`);
  return data.id;
}

/** Removes the fresh users (their rows cascade). */
export async function cleanupFresh(db: Admin) {
  for (const id of created.splice(0)) await db.auth.admin.deleteUser(id);
}

export const future = (days = 30) => new Date(Date.now() + days * 86_400_000).toISOString();
export const hex64 = (n: string) =>
  n
    .padStart(64, "0")
    .replace(/[^0-9a-f]/g, "a")
    .slice(-64);

const tracked: { table: string; id: string }[] = [];

/** Remembers a parent row this file created, so cleanup removes exactly that. */
export function track<T extends Record<string, unknown>>(table: string, row: T): T {
  tracked.push({ table, id: String(row.id) });
  return row;
}

export async function cleanupTracked(db: Admin) {
  const loose = db as unknown as {
    from: (t: string) => { delete: () => { eq: (c: string, v: string) => PromiseLike<unknown> } };
  };
  for (const { table, id } of tracked.splice(0).reverse())
    await loose.from(table).delete().eq("id", id);
}

/** Keys that only allow lowercase letters and underscores. */
export const letters = (s: string, max = 30) =>
  s
    .replace(/[0-9]/g, (d) => "abcdefghij"[Number(d)]!)
    .replace(/[^a-z_]/g, "x")
    .slice(0, max);
