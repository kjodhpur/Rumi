import { describe, expect, it } from "vitest";
import { pilotTargets, reportRows, type TermReport } from "./term-report";
import { proportion, type ArmMetrics } from "@/lib/stats/outcomes";

const arm = (a: "rumi" | "control", k: number, n: number): ArmMetrics => ({
  arm: a,
  students: n,
  roomChange: proportion(k, n),
  medianDaysToFirstChange: null,
  checkinAverage: { value: null, n: 0, suppressed: false },
  agreement: proportion(0, 0),
  roomAgain: proportion(0, 0),
  retention: proportion(0, 0),
});

const base: TermReport = {
  school: "Demo University",
  term: "Fall 2026",
  generatedAt: "2026-11-04",
  synthetic: true,
  overview: {
    kpis: {
      students: 200,
      verified: 200,
      onboarded: 180,
      withStrongMatch: 150,
      matched: 3,
      introsSent: 40,
      introsAccepted: 10,
      medianDaysToMatch: 6,
      unmatched: 20,
      openReports: 0,
    },
    funnel: [
      { stage: "signed_up", n: 200 },
      { stage: "matched", n: 3 },
    ],
    weekly: [],
    distribution: [{ bin: "90-100", n: 2 }],
    segments: [],
    sources: [{ source: "qr", n: null }],
  },
  roomChanges: null,
  reasonLabels: {},
  agreements: [{ building: "Maple Hall", groups: 20, signed: 3 }],
  outcomes: {
    cohorts: [],
    rumi: arm("rumi", 9, 170),
    control: arm("control", 2, 20),
    comparisons: {
      roomChange: {
        p: null,
        significant: false,
        label: "Too few to compare without revealing small counts",
      },
      agreement: { p: null, significant: false, label: "Not enough students to compare" },
      roomAgain: { p: null, significant: false, label: "x" },
      retention: { p: null, significant: false, label: "x" },
    },
  },
  pilot: null,
};

describe("term report", () => {
  it("labels synthetic data and never prints a count of 1–4", () => {
    const rows = reportRows(base);
    expect(rows[0]).toMatchObject({ section: "About", value: "Synthetic data for demonstration" });
    const cells = rows.flatMap((r) => [r.value, r.n]);
    for (const c of cells) expect(c).not.toMatch(/^[1-4]$/);
    expect(rows.find((r) => r.measure === "In a pair or group")).toMatchObject({
      value: "<5",
      n: "<5",
    });
    expect(rows.find((r) => r.section === "Sign-ups by entry link")).toMatchObject({ value: "<5" });
    expect(rows.find((r) => r.measure === "Asked for a room change: comparison")).toMatchObject({
      value: "<5",
    });
    expect(rows.find((r) => r.section === "Signed agreements by building")).toMatchObject({
      value: "<5",
      n: "20",
    });
    expect(rows.filter((r) => r.section === "Methodology").length).toBeGreaterThan(3);
  });

  it("compares pilot targets, treating room changes as a ceiling", () => {
    expect(
      pilotTargets(
        { onboardedPct: 80, roomChangePct: 10, matchedPct: null },
        { onboarded: 0.9, matched: 0.5, agreement: null, roomChange: 0.12 },
      ),
    ).toEqual([
      { label: "Finished profiles", target: 80, actual: "90%", met: true },
      { label: "Room changes at most", target: 10, actual: "12%", met: false },
    ]);
  });
});
