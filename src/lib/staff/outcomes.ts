import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { selectAll, selectByIds } from "@/lib/supabase/paginate";
import {
  armMetrics,
  compareProportions,
  scoreBand,
  type Arm,
  type ArmMetrics,
  type Comparison,
  type DeidentifiedRow,
  type OutcomeStudent,
} from "@/lib/stats/outcomes";

export interface Cohort {
  id: string;
  name: string;
  arm: Arm;
  residentialColleges: string[];
  buildings: string[];
}

export interface OutcomesReport {
  term: { id: string; name: string } | null;
  cohorts: Cohort[];
  rumi: ArmMetrics;
  control: ArmMetrics;
  comparisons: {
    roomChange: Comparison;
    agreement: Comparison;
    roomAgain: Comparison;
    retention: Comparison;
  };
  synthetic: boolean;
}

function parseRule(rule: unknown) {
  const r = rule && typeof rule === "object" ? (rule as Record<string, unknown>) : {};
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return { residentialColleges: list(r.residential_colleges), buildings: list(r.buildings) };
}

export async function loadCohorts(schoolId: string, termId: string | null): Promise<Cohort[]> {
  let q = createAdminClient()
    .from("pilot_cohorts")
    .select("id, name, arm, rule, term_id")
    .eq("school_id", schoolId)
    .order("created_at");
  if (termId) q = q.or(`term_id.eq.${termId},term_id.is.null`);
  const { data } = await q;
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    arm: c.arm as Arm,
    ...parseRule(c.rule),
  }));
}

/**
 * Per-student facts for the active term, read with the service role. Arms come from the
 * school's cohort rules (residential college or building). Check-in scores count only with
 * the checkins consent; research rows only with research_outcomes.
 */
async function loadStudents(schoolId: string, termId: string, cohorts: Cohort[]) {
  const db = createAdminClient();
  const students = await selectAll((from, to) =>
    db.rpc("school_students", { p_school: schoolId }).order("id").range(from, to),
  );
  const ids = students.map((s) => s.id);
  if (!ids.length)
    return [] as (OutcomeStudent & { id: string; research: boolean; score: number | null })[];

  const byIds = <T>(
    build: (
      chunk: string[],
      from: number,
      to: number,
    ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
    chunk?: number,
  ) => selectByIds(ids, build, chunk);
  const [assignments, changes, checkins, consents, members, surveys, { data: nextTerm }] =
    await Promise.all([
      byIds((c, f, t) =>
        db
          .from("assignments")
          .select("id, user_id, building, moved_in_at, term_id")
          .eq("school_id", schoolId)
          .in("user_id", c)
          .order("id")
          .range(f, t),
      ),
      byIds((c, f, t) =>
        db
          .from("room_change_requests")
          .select("id, user_id, created_at, term_id")
          .eq("school_id", schoolId)
          .in("user_id", c)
          .order("created_at")
          .order("id")
          .range(f, t),
      ),
      byIds((c, f, t) =>
        db
          .from("checkins")
          .select("id, user_id, score, term_id")
          .in("user_id", c)
          .not("submitted_at", "is", null)
          .order("id")
          .range(f, t),
      ),
      byIds((c, f, t) =>
        db
          .from("consents")
          .select("id, user_id, kind")
          .in("user_id", c)
          .in("kind", ["checkins", "research_outcomes"])
          .is("revoked_at", null)
          .order("id")
          .range(f, t),
      ),
      byIds((c, f, t) =>
        db
          .from("group_members")
          .select("user_id, group_id")
          .in("user_id", c)
          .order("user_id")
          .order("group_id")
          .range(f, t),
      ),
      byIds((c, f, t) =>
        db
          .from("outcome_surveys")
          .select("id, user_id, room_again")
          .eq("term_id", termId)
          .in("user_id", c)
          .order("id")
          .range(f, t),
      ),
      db
        .from("terms")
        .select("id")
        .eq("school_id", schoolId)
        .gt("starts_on", new Date().toISOString().slice(0, 10))
        .order("starts_on")
        .limit(1)
        .maybeSingle(),
    ]);
  // Changes are read per id chunk; keep them in time order for "time to first change".
  changes.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const groupIds = [...new Set(members.map((m) => m.group_id))];
  const [groupSizes, agreements] = await Promise.all([
    selectByIds(groupIds, (c, f, t) =>
      db
        .from("group_members")
        .select("group_id, user_id")
        .in("group_id", c)
        .order("group_id")
        .order("user_id")
        .range(f, t),
    ),
    selectByIds(groupIds, (c, f, t) =>
      db
        .from("agreements")
        .select("id, group_id, status")
        .in("group_id", c)
        .order("id")
        .range(f, t),
    ),
  ]);
  // Only roommate pairs' scores are needed: ask for exactly those pairs, 40 at a time.
  const byGroup = new Map<string, string[]>();
  for (const m of groupSizes)
    byGroup.set(m.group_id, [...(byGroup.get(m.group_id) ?? []), m.user_id]);
  const pairs = [...byGroup.values()].flatMap((list) =>
    list.flatMap((a) => list.filter((b) => b !== a).map((b) => [a, b] as const)),
  );
  const scores: { viewer_id: string; candidate_id: string; score: number }[] = [];
  for (let i = 0; i < pairs.length; i += 40) {
    const filter = pairs
      .slice(i, i + 40)
      .map(([v, c]) => `and(viewer_id.eq.${v},candidate_id.eq.${c})`)
      .join(",");
    const { data, error } = await db
      .from("match_scores")
      .select("viewer_id, candidate_id, score")
      .or(filter);
    if (error) throw new Error(error.message);
    scores.push(...(data ?? []));
  }
  const size = new Map<string, number>();
  for (const g of groupSizes ?? []) size.set(g.group_id, (size.get(g.group_id) ?? 0) + 1);
  const signed = new Set(
    (agreements ?? []).filter((a) => a.status === "signed").map((a) => a.group_id),
  );
  const consent = (kind: string) =>
    new Set((consents ?? []).filter((c) => c.kind === kind).map((c) => c.user_id));
  const checkinOk = consent("checkins");
  const research = consent("research_outcomes");
  const nextAssigned = nextTerm
    ? new Set((assignments ?? []).filter((a) => a.term_id === nextTerm.id).map((a) => a.user_id))
    : null;

  return (students ?? []).map((st) => {
    const assignment = (assignments ?? []).find(
      (a) => a.user_id === st.id && (a.term_id === termId || a.term_id === null),
    );
    const membership = (members ?? []).find((m) => m.user_id === st.id);
    const grouped = membership ? (size.get(membership.group_id) ?? 0) >= 2 : false;
    const firstChange = (changes ?? []).find(
      (c) => c.user_id === st.id && (c.term_id === termId || c.term_id === null),
    );
    const cohort = cohorts.find(
      (c) =>
        (st.residential_college && c.residentialColleges.includes(st.residential_college)) ||
        (assignment && c.buildings.includes(assignment.building)),
    );
    // The match score with roommates in the same group, for the research score band.
    const mates = membership
      ? (members ?? [])
          .filter((m) => m.group_id === membership.group_id && m.user_id !== st.id)
          .map((m) => m.user_id)
      : [];
    const mateScores = (scores ?? [])
      .filter((x) => x.viewer_id === st.id && mates.includes(x.candidate_id))
      .map((x) => x.score);
    return {
      id: st.id,
      research: research.has(st.id),
      score: mateScores.length
        ? Math.round(mateScores.reduce((a, b) => a + b, 0) / mateScores.length)
        : null,
      arm: cohort?.arm ?? null,
      assigned: Boolean(assignment),
      movedInAt: assignment?.moved_in_at ?? null,
      firstChangeAt: firstChange?.created_at ?? null,
      checkinScores: checkinOk.has(st.id)
        ? (checkins ?? [])
            .filter(
              (c) =>
                c.user_id === st.id &&
                c.score !== null &&
                (c.term_id === termId || c.term_id === null),
            )
            .map((c) => c.score!)
        : [],
      inGroup: grouped,
      agreementSigned: grouped && membership ? signed.has(membership.group_id) : false,
      roomAgain:
        ((surveys ?? []).find((x) => x.user_id === st.id)
          ?.room_again as OutcomeStudent["roomAgain"]) ?? null,
      retained: nextAssigned && assignment ? nextAssigned.has(st.id) : null,
    };
  });
}

export async function loadOutcomesReport(schoolId: string): Promise<OutcomesReport> {
  const db = createAdminClient();
  const [{ data: term }, { data: school }] = await Promise.all([
    db.from("terms").select("id, name").eq("school_id", schoolId).eq("active", true).maybeSingle(),
    db.from("schools").select("is_demo").eq("id", schoolId).maybeSingle(),
  ]);
  const cohorts = await loadCohorts(schoolId, term?.id ?? null);
  const students = term ? await loadStudents(schoolId, term.id, cohorts) : [];
  const rumi = armMetrics("rumi", students);
  const control = armMetrics("control", students);
  return {
    term: term ? { id: term.id, name: term.name } : null,
    cohorts,
    rumi,
    control,
    comparisons: {
      roomChange: compareProportions(rumi.roomChange, control.roomChange),
      agreement: compareProportions(rumi.agreement, control.agreement),
      roomAgain: compareProportions(rumi.roomAgain, control.roomAgain),
      retention: compareProportions(rumi.retention, control.retention),
    },
    synthetic: Boolean(school?.is_demo),
  };
}

/** Research rows: students in an arm who turned on research_outcomes. No ids, names or dates. */
export async function loadDeidentifiedRows(schoolId: string): Promise<DeidentifiedRow[]> {
  const db = createAdminClient();
  const { data: term } = await db
    .from("terms")
    .select("id")
    .eq("school_id", schoolId)
    .eq("active", true)
    .maybeSingle();
  if (!term) return [];
  const cohorts = await loadCohorts(schoolId, term.id);
  const students = await loadStudents(schoolId, term.id, cohorts);
  return students
    .filter((s) => s.research && s.arm)
    .map((s) => ({
      arm: s.arm!,
      scoreBand: scoreBand(s.score),
      agreementSigned: s.inGroup ? (s.agreementSigned ? "Y" : "N") : "",
      checkinAverage: s.checkinScores.length
        ? (
            Math.round((s.checkinScores.reduce((a, b) => a + b, 0) / s.checkinScores.length) * 2) /
            2
          ).toFixed(1)
        : "",
      roomChange: s.firstChangeAt ? "Y" : "N",
      roomAgain: s.roomAgain ?? "",
    }));
}
