import { describe, it, expect } from "vitest";
import {
  getScoreBand,
  computeScoreBandStats,
  compareCohortArms,
  formatDeidentifiedOutcomesCsv,
  type CohortOutcomesMetrics,
  type DeidentifiedOutcomeRow,
} from "./outcomes";
import { wilson } from "./wilson";

describe("Outcomes statistics", () => {
  it("assigns score bands accurately", () => {
    expect(getScoreBand(30)).toBe("under_50");
    expect(getScoreBand(49)).toBe("under_50");
    expect(getScoreBand(50)).toBe("50_69");
    expect(getScoreBand(69)).toBe("50_69");
    expect(getScoreBand(70)).toBe("70_84");
    expect(getScoreBand(84)).toBe("70_84");
    expect(getScoreBand(85)).toBe("85_plus");
    expect(getScoreBand(99)).toBe("85_plus");
  });

  it("computes score band stats with n < 5 suppression", () => {
    const pairings = [
      { score: 40, roomChangeRequested: true },
      { score: 42, roomChangeRequested: true },
      // 2 in under_50 -> suppressed
      { score: 55, roomChangeRequested: false },
      { score: 60, roomChangeRequested: false },
      { score: 62, roomChangeRequested: true },
      { score: 65, roomChangeRequested: false },
      { score: 68, roomChangeRequested: false },
      // 5 in 50_69 -> not suppressed
    ];

    const stats = computeScoreBandStats(pairings);
    const under50 = stats.find((s) => s.band === "under_50")!;
    const band5069 = stats.find((s) => s.band === "50_69")!;

    expect(under50.suppressed).toBe(true);
    expect(under50.totalPairings).toBe(2);

    expect(band5069.suppressed).toBe(false);
    expect(band5069.totalPairings).toBe(5);
    expect(band5069.roomChanges).toBe(1);
    expect(band5069.rate).toBeCloseTo(0.2);
    expect(band5069.interval).not.toBeNull();
  });

  it("detects statistically significant reduction between arms", () => {
    const rumiArm: CohortOutcomesMetrics = {
      name: "Rumi Pilot",
      arm: "rumi",
      studentsTotal: 200,
      pairingsConfirmed: 100,
      agreementsSigned: 95,
      agreementRate: 0.95,
      agreementInterval: wilson(95, 100),
      checkinsSubmitted: 180,
      checkinsAverageScore: 4.6,
      roomChanges: 3,
      roomChangeRate: 0.03, // 3%
      roomChangeInterval: wilson(3, 100),
      roomAgainYesCount: 88,
      roomAgainTotalSurveys: 92,
      roomAgainRate: 88 / 92,
      roomAgainInterval: wilson(88, 92),
    };

    const controlArm: CohortOutcomesMetrics = {
      name: "Control",
      arm: "control",
      studentsTotal: 200,
      pairingsConfirmed: 100,
      agreementsSigned: 30,
      agreementRate: 0.30,
      agreementInterval: wilson(30, 100),
      checkinsSubmitted: 90,
      checkinsAverageScore: 3.2,
      roomChanges: 25,
      roomChangeRate: 0.25, // 25%
      roomChangeInterval: wilson(25, 100),
      roomAgainYesCount: 40,
      roomAgainTotalSurveys: 90,
      roomAgainRate: 40 / 90,
      roomAgainInterval: wilson(40, 90),
    };

    const comparison = compareCohortArms(rumiArm, controlArm);
    expect(comparison.roomChangeDiffSignificant).toBe(true);
    expect(comparison.agreementDiffSignificant).toBe(true);
    expect(comparison.summaryText).toContain("Statistically significant reduction in room change rate");
  });

  it("formats de-identified outcomes CSV with zero PII", () => {
    const sampleRows: DeidentifiedOutcomeRow[] = [
      {
        cohortArm: "rumi",
        scoreBand: "70_84",
        agreementSigned: "Y",
        checkinSatisfactionAverage: "4.5",
        roomChangeRequested: "N",
        roomAgainResponse: "yes",
      },
    ];

    const csv = formatDeidentifiedOutcomesCsv(sampleRows);
    expect(csv).toContain("CohortArm,ScoreBand,AgreementSigned,CheckinAvg,RoomChangeRequested,RoomAgain");
    expect(csv).toContain("rumi,70_84,Y,4.5,N,yes");
    // Ensure zero PII like @asu.edu, names, or dates
    expect(csv).not.toContain("@");
    expect(csv).not.toContain("2026-");
  });
});
