import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCENARIOS,
  evaluateScenarioMatch,
} from "./scenarios";

describe("behavioral micro-questions & scenarios", () => {
  it("provides 8 pre-seeded scenario questions covering key factors", () => {
    expect(DEFAULT_SCENARIOS).toHaveLength(8);
    for (const q of DEFAULT_SCENARIOS) {
      expect(q.stem).toBeTruthy();
      expect(q.choices.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("produces strong alignment reasons and capped bonus when answers match", () => {
    const answersA = {
      scen_dishes: "remind",
      scen_partner_overnight: "talk_first",
      scen_study_exam: "silent",
      scen_room_temp: "cool",
    };

    const answersB = {
      scen_dishes: "remind",
      scen_partner_overnight: "talk_first",
      scen_study_exam: "silent",
      scen_room_temp: "cool",
    };

    const evalResult = evaluateScenarioMatch(answersA, answersB);

    expect(evalResult.sharedAnsweredCount).toBe(4);
    expect(evalResult.agreementRate).toBe(1.0);
    expect(evalResult.bonusScore).toBe(3); // Capped at +3
    expect(evalResult.reasons).toContain("Both prefer a quick heads-up before overnight guests");
    expect(evalResult.watchouts).toHaveLength(0);
  });

  it("flags divergent watch-outs on sharp clashes (e.g. strict vs leave on dishes)", () => {
    const answersA = {
      scen_dishes: "strict",
      scen_partner_overnight: "no",
    };

    const answersB = {
      scen_dishes: "leave",
      scen_partner_overnight: "fine",
    };

    const evalResult = evaluateScenarioMatch(answersA, answersB);

    expect(evalResult.agreementRate).toBe(0);
    expect(evalResult.bonusScore).toBe(0);
    expect(evalResult.watchouts.length).toBeGreaterThanOrEqual(1);
    expect(evalResult.watchouts[0]).toContain("discuss in roommate agreement");
  });

  it("handles missing answers gracefully without altering scores", () => {
    const answersA = {};
    const answersB = { scen_dishes: "wash" };

    const evalResult = evaluateScenarioMatch(answersA, answersB);

    expect(evalResult.sharedAnsweredCount).toBe(0);
    expect(evalResult.agreementRate).toBe(0);
    expect(evalResult.bonusScore).toBe(0);
    expect(evalResult.reasons).toHaveLength(0);
    expect(evalResult.watchouts).toHaveLength(0);
  });
});
