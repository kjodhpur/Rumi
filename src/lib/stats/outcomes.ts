import { wilson, suppressCount, intervalsDiffer, type Interval } from "./wilson";

export type ScoreBand = "under_50" | "50_69" | "70_84" | "85_plus";

export interface ScoreBandStats {
  band: ScoreBand;
  label: string;
  totalPairings: number;
  roomChanges: number;
  rate: number;
  interval: Interval | null;
  suppressed: boolean;
}

export interface CohortOutcomesMetrics {
  name: string;
  arm: "rumi" | "control";
  studentsTotal: number;
  pairingsConfirmed: number;
  agreementsSigned: number;
  agreementRate: number;
  agreementInterval: Interval | null;
  checkinsSubmitted: number;
  checkinsAverageScore: number | null;
  roomChanges: number;
  roomChangeRate: number;
  roomChangeInterval: Interval | null;
  roomAgainYesCount: number;
  roomAgainTotalSurveys: number;
  roomAgainRate: number | null;
  roomAgainInterval: Interval | null;
}

export interface ArmComparisonResult {
  rumi: CohortOutcomesMetrics;
  control: CohortOutcomesMetrics;
  roomChangeDiffSignificant: boolean;
  agreementDiffSignificant: boolean;
  retentionDiffSignificant: boolean;
  summaryText: string;
}

export function getScoreBand(score: number): ScoreBand {
  if (score < 50) return "under_50";
  if (score < 70) return "50_69";
  if (score < 85) return "70_84";
  return "85_plus";
}

export function getScoreBandLabel(band: ScoreBand): string {
  switch (band) {
    case "under_50":
      return "< 50 (Low Match)";
    case "50_69":
      return "50–69 (Moderate)";
    case "70_84":
      return "70–84 (Strong)";
    case "85_plus":
      return "85+ (High Compatibility)";
  }
}

/**
 * Calculates score-band room change statistics with n < 5 suppression.
 */
export function computeScoreBandStats(
  pairings: { score: number; roomChangeRequested: boolean }[]
): ScoreBandStats[] {
  const bands: ScoreBand[] = ["under_50", "50_69", "70_84", "85_plus"];
  const counts: Record<ScoreBand, { total: number; changes: number }> = {
    under_50: { total: 0, changes: 0 },
    "50_69": { total: 0, changes: 0 },
    "70_84": { total: 0, changes: 0 },
    "85_plus": { total: 0, changes: 0 },
  };

  for (const p of pairings) {
    const band = getScoreBand(p.score);
    counts[band].total++;
    if (p.roomChangeRequested) counts[band].changes++;
  }

  return bands.map((band) => {
    const { total, changes } = counts[band];
    const isSuppressed = total < 5;
    const rate = total > 0 ? changes / total : 0;
    const interval = total >= 5 ? wilson(changes, total) : null;

    return {
      band,
      label: getScoreBandLabel(band),
      totalPairings: total,
      roomChanges: changes,
      rate,
      interval,
      suppressed: isSuppressed,
    };
  });
}

/**
 * Compares Rumi arm vs Control arm and evaluates statistical significance.
 */
export function compareCohortArms(
  rumi: CohortOutcomesMetrics,
  control: CohortOutcomesMetrics
): ArmComparisonResult {
  const roomChangeDiffSignificant = intervalsDiffer(
    rumi.roomChangeInterval,
    control.roomChangeInterval
  );
  const agreementDiffSignificant = intervalsDiffer(
    rumi.agreementInterval,
    control.agreementInterval
  );
  const retentionDiffSignificant = intervalsDiffer(
    rumi.roomAgainInterval,
    control.roomAgainInterval
  );

  let summaryText = "Differences are not statistically significant at 95% confidence (intervals overlap).";
  if (roomChangeDiffSignificant && rumi.roomChangeRate < control.roomChangeRate) {
    summaryText = `Statistically significant reduction in room change rate: Rumi (${Math.round(rumi.roomChangeRate * 100)}%) vs Control (${Math.round(control.roomChangeRate * 100)}%).`;
  }

  return {
    rumi,
    control,
    roomChangeDiffSignificant,
    agreementDiffSignificant,
    retentionDiffSignificant,
    summaryText,
  };
}

export interface DeidentifiedOutcomeRow {
  cohortArm: string;
  scoreBand: string;
  agreementSigned: "Y" | "N";
  checkinSatisfactionAverage: string;
  roomChangeRequested: "Y" | "N";
  roomAgainResponse: string;
}

/**
 * Formats de-identified outcome rows as a research-grade CSV.
 * Absolutely zero PII (no names, emails, dorm numbers, or dates).
 */
export function formatDeidentifiedOutcomesCsv(rows: DeidentifiedOutcomeRow[]): string {
  const header = "CohortArm,ScoreBand,AgreementSigned,CheckinAvg,RoomChangeRequested,RoomAgain\r\n";
  const lines = rows.map((r) =>
    [
      r.cohortArm,
      r.scoreBand,
      r.agreementSigned,
      r.checkinSatisfactionAverage,
      r.roomChangeRequested,
      r.roomAgainResponse,
    ].join(",")
  );
  return header + lines.join("\r\n") + "\r\n";
}

export { wilson, suppressCount, intervalsDiffer };
