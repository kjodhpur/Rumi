import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOverview } from "./dashboard";
import { loadOutcomesReport } from "./outcomes";
import { parseRoomChangeStats } from "./room-changes";
import { pilotTargets, type TermReport } from "./term-report";
import type { StaffContext } from "./context";

/** Everything in the term report, read as the signed-in staff member (aggregate RPCs check roles). */
export async function loadTermReport(context: StaffContext): Promise<TermReport> {
  const school = context.school.id;
  const supabase = createClient();
  const db = createAdminClient();
  const [
    overview,
    rc,
    agreements,
    outcomes,
    { data: reasons },
    { data: pilot },
    { data: colleges },
    { data: schoolRow },
  ] = await Promise.all([
    loadOverview(school, 16),
    supabase.rpc("staff_room_changes", { p_school: school }),
    supabase.rpc("staff_agreement_completion", { p_school: school }),
    loadOutcomesReport(school),
    db.from("room_change_reasons").select("key, label").eq("school_id", school),
    db
      .from("pilot_configs")
      .select("scope, starts_on, ends_on, success_metrics")
      .eq("school_id", school)
      .maybeSingle(),
    db
      .from("school_options")
      .select("value, label")
      .eq("school_id", school)
      .eq("kind", "residential_college"),
    db.from("schools").select("is_demo").eq("id", school).maybeSingle(),
  ]);
  const agreementRows = (agreements.data ?? []).map((a) => ({
    building: a.building,
    groups: a.suppressed ? null : a.groups,
    signed: a.suppressed ? null : a.signed,
  }));
  const groups = agreementRows.reduce((s, a) => s + (a.groups ?? 0), 0);
  const signed = agreementRows.reduce((s, a) => s + (a.signed ?? 0), 0);
  const k = overview?.kpis;
  const scope = pilot
    ? ((pilot.scope as { residential_colleges?: string[] }).residential_colleges ?? [])
    : [];
  const hasCohorts =
    outcomes.cohorts.some((c) => c.arm === "rumi") &&
    outcomes.cohorts.some((c) => c.arm === "control");
  return {
    school: context.school.name,
    term: outcomes.term?.name ?? null,
    generatedAt: new Date().toISOString().slice(0, 10),
    synthetic: Boolean(schoolRow?.is_demo),
    overview,
    roomChanges: rc.error ? null : parseRoomChangeStats(rc.data),
    reasonLabels: Object.fromEntries((reasons ?? []).map((r) => [r.key, r.label])),
    agreements: agreementRows,
    outcomes: hasCohorts
      ? {
          cohorts: outcomes.cohorts.map((c) => ({ name: c.name, arm: c.arm })),
          rumi: outcomes.rumi,
          control: outcomes.control,
          comparisons: outcomes.comparisons,
        }
      : null,
    pilot: pilot
      ? {
          startsOn: pilot.starts_on,
          endsOn: pilot.ends_on,
          scope: scope.length
            ? scope.map((v) => colleges?.find((c) => c.value === v)?.label ?? v).join(", ")
            : "Everyone",
          targets: pilotTargets((pilot.success_metrics ?? {}) as Record<string, number | null>, {
            onboarded: k && k.students >= 5 ? k.onboarded / k.students : null,
            matched:
              k && k.onboarded >= 5 && !(k.matched > 0 && k.matched < 5)
                ? k.matched / k.onboarded
                : null,
            agreement: groups >= 5 && !(signed > 0 && signed < 5) ? signed / groups : null,
            roomChange: outcomes.rumi.roomChange.suppressed ? null : outcomes.rumi.roomChange.rate,
          }),
        }
      : null,
  };
}
