/**
 * The exportable term report (Phase 1 reports export + 6.3): KPIs, funnel, score
 * distribution, room changes, agreements, outcomes with methodology, and a pilot summary.
 * Pure: the page and the CSV both render from this shape. Counts of 1–4 read "<5".
 */
import { BIN_LABELS, FUNNEL_LABELS, count, share, type Overview } from "./metrics";
import { BAND_LABEL, type RoomChangeStats } from "./room-changes";
import { formatProportion, type ArmMetrics, type Comparison } from "@/lib/stats/outcomes";

export interface TermReport {
  school: string;
  term: string | null;
  generatedAt: string;
  synthetic: boolean;
  overview: Overview | null;
  roomChanges: RoomChangeStats | null;
  reasonLabels: Record<string, string>;
  agreements: { building: string; groups: number | null; signed: number | null }[];
  outcomes: {
    cohorts: { name: string; arm: "rumi" | "control" }[];
    rumi: ArmMetrics;
    control: ArmMetrics;
    comparisons: Record<"roomChange" | "agreement" | "roomAgain" | "retention", Comparison>;
  } | null;
  pilot: {
    startsOn: string;
    endsOn: string;
    scope: string;
    targets: { label: string; target: number; actual: string; met: boolean | null }[];
  } | null;
}

export interface ReportRow {
  section: string;
  measure: string;
  value: string;
  n: string;
  note: string;
}

export const METHODOLOGY = [
  "Counts from 1 to 4 are shown as <5 so no student can be singled out; rates with fewer than 5 students in the denominator are shown as a dash.",
  "Students appear only in totals unless they chose to share their results with the housing office.",
  "Outcome comparisons use 95% Wilson intervals and a pooled two-proportion z-test; anything with p ≥ 0.05 is labeled not statistically significant. No p-value is shown when a count is suppressed.",
  "Comparison groups are set by residential college or building, not randomized, so differences show association, not cause.",
  "Check-in scores count only for students who turned on check-in sharing.",
];

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

export function reportRows(r: TermReport): ReportRow[] {
  const rows: ReportRow[] = [];
  const add = (section: string, measure: string, value: string, n = "", note = "") =>
    rows.push({ section, measure, value, n, note });
  if (r.synthetic)
    add("About", "Data", "Synthetic data for demonstration", "", "Not real outcomes");
  add("About", "School", r.school);
  add("About", "Term", r.term ?? "No active term");
  add("About", "Generated", r.generatedAt);

  const o = r.overview;
  if (o) {
    const k = o.kpis;
    add("Key numbers", "Students", count(k.students));
    add("Key numbers", "Verified", share(k.verified, k.students), count(k.verified));
    add("Key numbers", "Finished profile", share(k.onboarded, k.students), count(k.onboarded));
    add(
      "Key numbers",
      "Have a 70+ match",
      share(k.withStrongMatch, k.onboarded),
      count(k.withStrongMatch),
      "of finished profiles",
    );
    add(
      "Key numbers",
      "In a pair or group",
      share(k.matched, k.onboarded),
      count(k.matched),
      "of finished profiles",
    );
    add("Key numbers", "Unmatched", count(k.unmatched));
    add("Key numbers", "Intros sent", count(k.introsSent));
    add(
      "Key numbers",
      "Intros accepted",
      share(k.introsAccepted, k.introsSent),
      count(k.introsAccepted),
    );
    add(
      "Key numbers",
      "Median days to match",
      k.medianDaysToMatch === null ? "—" : String(k.medianDaysToMatch),
    );
    const first = o.funnel[0]?.n ?? 0;
    for (const f of o.funnel)
      add(
        "Funnel",
        FUNNEL_LABELS[f.stage],
        count(f.n),
        "",
        f === o.funnel[0] ? "" : `${share(f.n, first)} of sign-ups`,
      );
    for (const d of o.distribution) add("Best-match scores", BIN_LABELS[d.bin], count(d.n));
    for (const s of o.sources ?? [])
      add("Sign-ups by entry link", s.source, s.n === null ? "<5" : count(s.n));
  }

  const rc = r.roomChanges;
  if (rc) {
    add("Room changes", "Requests", rc.total === null ? "<5" : count(rc.total));
    add("Room changes", "Untagged", rc.untagged === null ? "<5" : count(rc.untagged));
    for (const x of rc.byReason)
      add(
        "Room changes by reason",
        r.reasonLabels[x.key] ?? (x.key === "untagged" ? "Untagged" : x.key),
        x.n === null ? "<5" : count(x.n),
      );
    for (const b of rc.byBand)
      add(
        "Room changes by match score",
        BAND_LABEL[b.band],
        b.assigned === 0 ? "—" : b.rate === null ? "<5" : pct(b.rate),
        b.assigned === null ? "<5" : count(b.assigned),
        "share of assigned students who asked to move",
      );
  }

  for (const a of r.agreements)
    add(
      "Signed agreements by building",
      a.building,
      a.groups === null || a.signed === null ? "<5" : share(a.signed, a.groups),
      a.groups === null ? "<5" : count(a.groups),
      "of groups",
    );

  if (r.outcomes) {
    const { rumi, control, comparisons } = r.outcomes;
    const line = (measure: string, key: "roomChange" | "agreement" | "roomAgain" | "retention") => {
      add(
        "Outcomes",
        `${measure}: Rumi`,
        formatProportion(rumi[key]),
        rumi[key].suppressed ? "<5" : count(rumi[key].n),
      );
      add(
        "Outcomes",
        `${measure}: comparison`,
        formatProportion(control[key]),
        control[key].suppressed ? "<5" : count(control[key].n),
      );
      add("Outcomes", `${measure}: difference`, comparisons[key].label);
    };
    line("Asked for a room change", "roomChange");
    line("Signed a roommate agreement", "agreement");
    line("Would room together again", "roomAgain");
    line("Back in housing next term", "retention");
  }

  if (r.pilot) {
    add("Pilot", "Dates", `${r.pilot.startsOn} to ${r.pilot.endsOn}`);
    add("Pilot", "Who's included", r.pilot.scope);
    for (const t of r.pilot.targets)
      add(
        "Pilot targets",
        t.label,
        t.actual,
        "",
        `target ${t.target}%${t.met === null ? "" : t.met ? ", met" : ", not met"}`,
      );
  }
  METHODOLOGY.forEach((m, i) => add("Methodology", String(i + 1), m));
  return rows;
}

/** Target vs actual for the pilot's success metrics; "room changes" is a ceiling, the rest floors. */
export function pilotTargets(
  metrics: Partial<
    Record<"onboardedPct" | "matchedPct" | "agreementPct" | "roomChangePct", number | null>
  >,
  actual: {
    onboarded: number | null;
    matched: number | null;
    agreement: number | null;
    roomChange: number | null;
  },
) {
  const rows: { label: string; target: number; actual: string; met: boolean | null }[] = [];
  const add = (
    label: string,
    target: number | null | undefined,
    value: number | null,
    ceiling = false,
  ) => {
    if (target === null || target === undefined) return;
    const pctValue = value === null ? null : Math.round(value * 100);
    rows.push({
      label,
      target,
      actual: pctValue === null ? "—" : `${pctValue}%`,
      met: pctValue === null ? null : ceiling ? pctValue <= target : pctValue >= target,
    });
  };
  add("Finished profiles", metrics.onboardedPct, actual.onboarded);
  add("In a pair or group", metrics.matchedPct, actual.matched);
  add("Signed agreements", metrics.agreementPct, actual.agreement);
  add("Room changes at most", metrics.roomChangePct, actual.roomChange, true);
  return rows;
}
