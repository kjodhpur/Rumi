import { describe, expect, it } from "vitest";
import { consentTitle, visibleConsents } from "./consent";

describe("consent visibility", () => {
  it("hides housing-office consents until a school has a partnered office", () => {
    expect(visibleConsents(null)).toEqual([]);
    expect(visibleConsents("Demo University Housing")).toEqual(["share_with_housing"]);
  });

  it("names the office in the title", () => {
    expect(consentTitle("share_with_housing", "ASU Housing")).toBe("Share my Rumi results with ASU Housing");
  });

  it("keeps consents that don't involve the office visible once their feature ships", () => {
    expect(visibleConsents(null, ["social_verification"])).toEqual(["social_verification"]);
  });
});
