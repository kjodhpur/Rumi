import { describe, expect, it } from "vitest";
import { evaluateRematchEligibility, type SurveyResponse } from "./rematch";

describe("Phase 6.2 Next-Year Re-Match Eligibility", () => {
  it("allows group to carry forward when all members say yes", () => {
    const responses: SurveyResponse[] = [
      { userId: "u1", roomAgain: "yes", score: 5 },
      { userId: "u2", roomAgain: "yes", score: 5 },
    ];

    const result = evaluateRematchEligibility(responses);
    expect(result.eligible).toBe(true);
    expect(result.carries).toEqual(["u1", "u2"]);
    expect(result.leaving).toHaveLength(0);
  });

  it("allows carry forward when members say maybe", () => {
    const responses: SurveyResponse[] = [
      { userId: "u1", roomAgain: "maybe", score: 4 },
      { userId: "u2", roomAgain: "yes", score: 4 },
    ];

    const result = evaluateRematchEligibility(responses);
    expect(result.eligible).toBe(true);
    expect(result.carries).toHaveLength(2);
  });

  it("handles graduating or leaving members by shrinking the group if >=2 remain", () => {
    const responses: SurveyResponse[] = [
      { userId: "u1", roomAgain: "yes", score: 5 },
      { userId: "u2", roomAgain: "yes", score: 4 },
      { userId: "u3", roomAgain: "no", score: 2 },
    ];

    const result = evaluateRematchEligibility(responses);
    expect(result.eligible).toBe(true);
    expect(result.carries).toEqual(["u1", "u2"]);
    expect(result.leaving).toEqual(["u3"]);
    expect(result.reason).toContain("1 roommate opted out");
  });

  it("rejects carry forward when fewer than 2 roommates agree", () => {
    const responses: SurveyResponse[] = [
      { userId: "u1", roomAgain: "yes", score: 5 },
      { userId: "u2", roomAgain: "no", score: 1 },
    ];

    const result = evaluateRematchEligibility(responses);
    expect(result.eligible).toBe(false);
    expect(result.carries).toEqual(["u1"]);
    expect(result.leaving).toEqual(["u2"]);
  });

  it("rejects single member input", () => {
    const responses: SurveyResponse[] = [{ userId: "u1", roomAgain: "yes", score: 5 }];
    expect(evaluateRematchEligibility(responses).eligible).toBe(false);
  });
});
