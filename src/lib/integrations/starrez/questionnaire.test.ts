import { describe, it, expect } from "vitest";
import {
  mapStarRezAnswer,
  parseStarRezQuestionnaireCsv,
} from "./questionnaire";

describe("mapStarRezAnswer", () => {
  it("maps numeric scales accurately", () => {
    expect(mapStarRezAnswer("CLEANLINESS", "4")).toEqual({
      mappedFactor: "cleanliness",
      mappedValue: "4",
    });
    expect(mapStarRezAnswer("NOISE", "2")).toEqual({
      mappedFactor: "noise",
      mappedValue: "2",
    });
  });

  it("maps StarRez textual codes to Rumi domain values", () => {
    expect(mapStarRezAnswer("SLEEP", "NIGHT_OWL")).toEqual({
      mappedFactor: "sleep_schedule",
      mappedValue: "5",
    });
    expect(mapStarRezAnswer("SMOKING", "NO")).toEqual({
      mappedFactor: "smoking",
      mappedValue: "never",
    });
    expect(mapStarRezAnswer("DRINKING", "SOCIALLY")).toEqual({
      mappedFactor: "drinking",
      mappedValue: "socially",
    });
    expect(mapStarRezAnswer("PETS", "YES")).toEqual({
      mappedFactor: "pets",
      mappedValue: "have",
    });
    expect(mapStarRezAnswer("STUDY", "CAMPUS")).toEqual({
      mappedFactor: "study",
      mappedValue: "campus",
    });
  });

  it("returns null for unmapped codes or unrecognized values", () => {
    expect(mapStarRezAnswer("UNKNOWN_CODE", "5")).toBeNull();
    expect(mapStarRezAnswer("SMOKING", "UNKNOWN_VALUE")).toBeNull();
  });
});

describe("parseStarRezQuestionnaireCsv", () => {
  it("parses valid CSV rows with headers", () => {
    const csv = `StudentID,Email,QuestionCode,AnswerText
1223334444,student1@asu.edu,CLEANLINESS,4
1223334444,student1@asu.edu,SLEEP,EARLY
1223334445,student2@asu.edu,SMOKING,NO`;

    const parsed = parseStarRezQuestionnaireCsv(csv);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({
      externalStudentId: "1223334444",
      email: "student1@asu.edu",
      questionCode: "CLEANLINESS",
      rawValue: "4",
    });
    expect(parsed[1].questionCode).toBe("SLEEP");
    expect(parsed[2].rawValue).toBe("NO");
  });

  it("handles alternative header names (e.g. EntryID, Value)", () => {
    const csv = `EntryID,Mail,Code,Value
99887766,test@asu.edu,NOISE,QUIET`;

    const parsed = parseStarRezQuestionnaireCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].externalStudentId).toBe("99887766");
    expect(parsed[0].questionCode).toBe("NOISE");
    expect(parsed[0].rawValue).toBe("QUIET");
  });

  it("returns empty array for invalid headers or empty content", () => {
    expect(parseStarRezQuestionnaireCsv("")).toEqual([]);
    expect(parseStarRezQuestionnaireCsv("Col1,Col2,Col3\nVal1,Val2,Val3")).toEqual([]);
  });
});
