import { describe, expect, it } from "vitest";
import { carryForwardReady, evaluateRematchEligibility, shouldInvite, surveyOpen } from "./rematch";

describe("survey window", () => {
  it("opens three weeks before the term ends and closes a month after", () => {
    expect(surveyOpen("2027-05-07", "2027-04-15")).toBe(false);
    expect(surveyOpen("2027-05-07", "2027-04-16")).toBe(true);
    expect(surveyOpen("2027-05-07", "2027-06-06")).toBe(true);
    expect(surveyOpen("2027-05-07", "2027-06-07")).toBe(false);
  });
  it("invites only before the term ends", () => {
    expect(shouldInvite("2027-05-07", "2027-04-16")).toBe(true);
    expect(shouldInvite("2027-05-07", "2027-05-10")).toBe(false);
  });
});

describe("keep your group", () => {
  it("is offered when everyone answered and at least two want to stay", () => {
    const r = evaluateRematchEligibility(["a", "b", "c"], [
      { userId: "a", roomAgain: "yes" },
      { userId: "b", roomAgain: "maybe" },
      { userId: "c", roomAgain: "no" },
    ]);
    expect(r).toMatchObject({ eligible: true, everyoneIn: false, carries: ["a", "b"], leaving: ["c"], waiting: [] });
  });
  it("waits for everyone to answer", () => {
    expect(evaluateRematchEligibility(["a", "b"], [{ userId: "a", roomAgain: "yes" }])).toMatchObject({ eligible: false, waiting: ["b"] });
  });
  it("needs two people staying", () => {
    expect(evaluateRematchEligibility(["a", "b"], [{ userId: "a", roomAgain: "yes" }, { userId: "b", roomAgain: "no" }]).eligible).toBe(false);
  });
  it("carries forward only when every staying member tapped keep", () => {
    expect(carryForwardReady(["a", "b"], { a: true })).toBe(false);
    expect(carryForwardReady(["a", "b"], { a: true, b: true })).toBe(true);
    expect(carryForwardReady(["a", "b"], { a: true, b: false })).toBe(false);
  });
});
