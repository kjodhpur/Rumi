import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAN, isStaffRole, parseScopes, type Capability, type StaffRole, type StaffScopes } from "./roles";

export const STAFF_SCHOOL_COOKIE = "rumi_staff_school";

export interface StaffSchool {
  id: string;
  name: string;
  shortName: string;
  housingOfficeName: string | null;
  isDemo: boolean;
}

export interface StaffContext {
  userId: string;
  email: string;
  firstName: string;
  isPlatformAdmin: boolean;
  /** Schools this person can act for (every active school for platform admins). */
  schools: StaffSchool[];
  school: StaffSchool;
  role: StaffRole | "platform_admin";
  scopes: StaffScopes;
}

/**
 * Who is acting on the staff side, and for which school. Read fresh from the
 * database on every request, so a disabled staff member loses access on their next click.
 */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = createClient();
  const [{ data: admin }, { data: memberships }, { data: profile }] = await Promise.all([
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("staff_members")
      .select("school_id, role, scopes, disabled_at")
      .eq("user_id", user.id)
      .is("disabled_at", null),
    supabase.from("profiles").select("first_name, banned_at").eq("id", user.id).maybeSingle(),
  ]);
  if (!profile || profile.banned_at) return null;

  const isPlatformAdmin = Boolean(admin);
  const active = (memberships ?? []).filter((m) => isStaffRole(m.role));
  if (!isPlatformAdmin && active.length === 0) return null;

  // RLS hides inactive schools from anon; read with the service role and filter here.
  const schoolQuery = createAdminClient()
    .from("schools")
    .select("id, name, short_name, housing_office_name, is_demo")
    .order("created_at");
  const { data: schoolRows } = isPlatformAdmin
    ? await schoolQuery
    : await schoolQuery.in("id", active.map((m) => m.school_id));
  const schools: StaffSchool[] = (schoolRows ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    shortName: s.short_name,
    housingOfficeName: s.housing_office_name,
    isDemo: s.is_demo,
  }));
  if (schools.length === 0) return null;

  const preferred = cookies().get(STAFF_SCHOOL_COOKIE)?.value;
  const school = schools.find((s) => s.id === preferred) ?? schools[0];
  const membership = active.find((m) => m.school_id === school.id);

  return {
    userId: user.id,
    email: (user.email ?? "").toLowerCase(),
    firstName: profile.first_name || (user.email ?? "").split("@")[0],
    isPlatformAdmin,
    schools,
    school,
    role: isPlatformAdmin ? "platform_admin" : (membership!.role as StaffRole),
    scopes: isPlatformAdmin ? { buildings: [], communities: [], accommodations: true } : parseScopes(membership!.scopes),
  };
});

export function can(context: StaffContext, capability: Capability) {
  return context.role === "platform_admin" || (CAN[capability] as readonly string[]).includes(context.role);
}

/** For server actions: re-checks the role in SQL (not just the cached context) before any write. */
export async function assertRole(schoolId: string, capability: Capability) {
  const user = await getUser();
  if (!user) return null;
  const { data } = await createClient().rpc("has_role", {
    p_school: schoolId,
    p_roles: [...CAN[capability]],
  });
  return data === true ? user.id : null;
}

/** For staff pages: the layout already checked staff access; this checks the page's capability. */
export async function requireStaffPage(capability: Capability) {
  const context = await getStaffContext();
  if (!context || !can(context, capability)) notFound();
  return context;
}
