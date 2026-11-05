import { describe, expect, it } from "vitest";
import { assessRisk, crisisSignal } from "./risk";

const point = (score: number, tags: string[] = []) => ({ score, tags });

describe("assessRisk", () => {
  it("stays low when nothing is wrong", () => {
    expect(assessRisk({ checkins: [point(4), point(5)] })).toEqual({ level: "low", reasons: [] });
  });

  it("flags two low scores in a row as high", () => {
    const result = assessRisk({ checkins: [point(4), point(2), point(1)] });
    expect(result.level).toBe("high");
    expect(result.reasons).toContain("Two check-ins in a row were 2 or lower.");
  });

  it("flags a sharp drop as high and a smaller drop as medium", () => {
    expect(assessRisk({ checkins: [point(5), point(2)] }).level).toBe("high");
    expect(assessRisk({ checkins: [point(5), point(3)] }).level).toBe("medium");
  });

  it("flags a roommate mismatch", () => {
    expect(assessRisk({ checkins: [point(5)], roommateScores: [1] }).level).toBe("high");
    expect(assessRisk({ checkins: [point(5)], roommateScores: [3] }).level).toBe("medium");
  });

  it("flags a tag that matches a known watch-out", () => {
    const result = assessRisk({ checkins: [point(4, ["noise"])], watchouts: ["noise", "budget"] });
    expect(result.level).toBe("medium");
    expect(result.reasons[0]).toMatch(/difference/);
  });

  it("treats a missed check-in as its own signal", () => {
    expect(assessRisk({ checkins: [], missed: true }).level).toBe("medium");
  });
});

describe("crisisSignal", () => {
  it("matches crisis phrases and ignores ordinary frustration", () => {
    expect(crisisSignal("I want to die")).toBe(true);
    expect(crisisSignal("The noise is killing me")).toBe(false);
  });

  it("matches the same in Spanish", () => {
    expect(crisisSignal("A veces pienso en quitarme la vida")).toBe(true);
    expect(crisisSignal("Me quiero morir")).toBe(true);
    expect(crisisSignal("Pensamientos de autolesión")).toBe(true);
    expect(crisisSignal("El ruido me está matando")).toBe(false);
  });
});

describe("threatSignal", () => {
  it("catches threats and fear for safety, not ordinary friction", async () => {
    const { threatSignal } = await import("./risk");
    expect(threatSignal("He said he'd bring a knife if I complained again")).toBe(true);
    expect(threatSignal("I'm not safe in my room anymore")).toBe(true);
    expect(threatSignal("They keep leaving dishes and it's annoying")).toBe(false);
    expect(threatSignal("Dijo que va a traer un cuchillo")).toBe(true);
    expect(threatSignal("No estoy segura en mi cuarto")).toBe(true);
    expect(threatSignal("Me pegó anoche")).toBe(true);
    expect(threatSignal("Deja los platos sucios y me molesta")).toBe(false);
  });
});
