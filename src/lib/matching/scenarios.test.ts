import { describe, expect, it } from "vitest";
import { DEFAULT_SCENARIOS, MAX_SCENARIOS, activeQuestions, toScenarioAnswers, validChoices, type Question } from "./scenarios";

const schoolQ = (key: string, kind: Question["kind"] = "scenario", version = 1): Question => ({
  key,
  version,
  kind,
  factor: "noise",
  topic: "music",
  stem: "A school question about music volume",
  choices: [
    { key: "loud", label: "Loud", value: 5, reason: "You both like it loud" },
    { key: "soft", label: "Soft", value: 1, reason: "You both like it soft" },
  ],
  schoolId: "asu",
});

describe("default scenario set", () => {
  it("has eight questions with valid, distinct choices", () => {
    expect(DEFAULT_SCENARIOS).toHaveLength(MAX_SCENARIOS);
    expect(new Set(DEFAULT_SCENARIOS.map((q) => q.key)).size).toBe(DEFAULT_SCENARIOS.length);
    for (const q of DEFAULT_SCENARIOS) expect(validChoices(q.choices)).toBe(true);
  });

  it("includes the partner-stays-over question from the brief", () => {
    expect(DEFAULT_SCENARIOS.find((q) => q.key === "partner_overnight")?.choices.map((c) => c.key)).toEqual(["fine", "talk_first", "too_often", "not_okay"]);
  });
});

describe("activeQuestions", () => {
  it("puts school scenarios first and never exceeds the per-term cap", () => {
    const active = activeQuestions([schoolQ("music_volume")]);
    const scenarios = active.filter((q) => q.kind === "scenario");
    expect(scenarios[0]?.key).toBe("music_volume");
    expect(scenarios).toHaveLength(MAX_SCENARIOS);
  });

  it("keeps non-scenario school questions on top of the cap", () => {
    expect(activeQuestions([schoolQ("quiet_hours", "scale")]).filter((q) => q.kind !== "scenario")).toHaveLength(1);
  });
});

describe("toScenarioAnswers", () => {
  it("maps answers to factor values and drops old versions and unknown choices", () => {
    const qs = [schoolQ("music_volume", "scenario", 2), ...DEFAULT_SCENARIOS];
    const out = toScenarioAnswers(
      [
        { question_key: "music_volume", question_version: 1, choice_key: "loud" },
        { question_key: "dishes", question_version: 1, choice_key: "before_bed" },
        { question_key: "dishes_typo", question_version: 1, choice_key: "x" },
        { question_key: "early_alarm", question_version: 1, choice_key: "nope" },
      ],
      qs,
    );
    expect(Object.keys(out)).toEqual(["dishes@1"]);
    expect(out["dishes@1"]).toMatchObject({ factor: "cleanliness", value: 5 });
  });
});

describe("validChoices", () => {
  it("rejects duplicate keys and out-of-range values", () => {
    const base = schoolQ("q").choices;
    expect(validChoices([...base, { ...base[0]! }])).toBe(false);
    expect(validChoices([{ ...base[0]!, value: 6 }, base[1]!])).toBe(false);
    expect(validChoices([base[0]!])).toBe(false);
  });
});
