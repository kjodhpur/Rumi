import { describe, expect, it } from "vitest";
import { protectedTopics } from "./fair-housing";

describe("Fair Housing denylist", () => {
  it("blocks questions about protected characteristics", () => {
    expect(protectedTopics("What is your religion?")).toEqual(["religion"]);
    expect(protectedTopics("Do you have any children?")).toEqual(["familial status or pregnancy"]);
    expect(protectedTopics("Which country of origin are you from?")).toEqual([
      "national origin or citizenship",
    ]);
    expect(protectedTopics("Do you take medication or have a disability?")).toEqual([
      "disability or health",
    ]);
    expect(protectedTopics("What's your race or ethnicity?")).toEqual(["race or ethnicity"]);
  });

  it("allows ordinary living questions", () => {
    expect(protectedTopics("How do you feel about music while studying?")).toEqual([]);
    expect(protectedTopics("Your roommate's friends stay late on a Thursday.")).toEqual([]);
    expect(protectedTopics("How often do you cook?")).toEqual([]);
  });
});
