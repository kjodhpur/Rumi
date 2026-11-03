import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse";
import { STARTER_QUESTIONNAIRE_MAPPING, latestPerFactor, parseQuestionnaire, parseQuestionnaireMapping } from "./questionnaire";

describe("questionnaire mapping", () => {
  it("keeps only valid factors and values, and dedupes codes", () => {
    const m = parseQuestionnaireMapping({
      questions: [
        { code: "sleep", factor: "sleep_schedule", values: { early: "1", weird: "9" } },
        { code: "SLEEP", factor: "noise", values: {} },
        { code: "RACE", factor: "ethnicity", values: {} },
      ],
    });
    expect(m.questions).toEqual([{ code: "SLEEP", factor: "sleep_schedule", values: { EARLY: "1" } }]);
    expect(parseQuestionnaireMapping(null)).toEqual({ questions: [] });
  });
});

describe("questionnaire import", () => {
  const csv = `StudentID,Email,QuestionCode,Answer
1001,a@asu.edu,SLEEP,early
1001,a@asu.edu,CLEANLINESS,Spotless
1002,,SMOKING,no
1002,,FAVORITE_COLOR,blue
1003,,NOISE,very loud
,,GUESTS,RARELY
1001,a@asu.edu,SLEEP,night_owl`;

  it("maps codes and values, and lists what it couldn't map", () => {
    const parsed = parseQuestionnaire(parseCsv(csv), STARTER_QUESTIONNAIRE_MAPPING);
    expect(parsed.answers.map((a) => [a.studentId, a.factor, a.value])).toEqual([
      ["1001", "sleep_schedule", "1"],
      ["1001", "cleanliness", "5"],
      ["1002", "smoking", "never"],
      ["1001", "sleep_schedule", "5"],
    ]);
    expect(parsed.unmappedCodes).toEqual(["FAVORITE_COLOR"]);
    expect(parsed.unmappedValues).toEqual([{ code: "NOISE", value: "very loud", count: 1 }]);
    expect(parsed.errors).toEqual([{ line: 7, message: "No student ID or email." }]);
  });

  it("keeps the latest answer per student and factor", () => {
    const parsed = parseQuestionnaire(parseCsv(csv), STARTER_QUESTIONNAIRE_MAPPING);
    expect(latestPerFactor(parsed.answers).filter((a) => a.factor === "sleep_schedule").map((a) => a.value)).toEqual(["5"]);
  });

  it("explains a file without the needed columns", () => {
    expect(parseQuestionnaire(parseCsv("Name,Thing\nx,y"), STARTER_QUESTIONNAIRE_MAPPING).errors[0]?.message).toMatch(/needs StudentID/);
  });
});
