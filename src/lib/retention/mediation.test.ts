import { describe, expect, it } from "vitest";
import { getGuidedMediationTips } from "./mediation";
import { CHECKIN_TAGS } from "./risk";

describe("guided self-mediation", () => {
  it("maps each tag to the agreement section it's about and quotes the room's own words", () => {
    const tips = getGuidedMediationTips(["noise", "cleanliness"], { noise: "Music low after 11.", cleaning: "We rotate weekly." });
    expect(tips.map((t) => [t.tag, t.sectionKey, t.agreementText])).toEqual([
      ["noise", "noise", "Music low after 11."],
      ["cleanliness", "cleaning", "We rotate weekly."],
    ]);
  });

  it("falls back to talking it through when no tag was picked, and ignores unknown tags", () => {
    expect(getGuidedMediationTips([]).map((t) => t.tag)).toEqual(["communication"]);
    expect(getGuidedMediationTips(["nope"]).map((t) => t.tag)).toEqual(["communication"]);
    expect(getGuidedMediationTips(["guests"])[0]?.agreementText).toBeNull();
  });

  it("has advice and an opener for every check-in tag", () => {
    for (const tag of CHECKIN_TAGS) {
      const [tip] = getGuidedMediationTips([tag]);
      expect(tip?.tag).toBe(tag);
      expect(tip?.advice.length).toBeGreaterThan(10);
      expect(tip?.suggestedMessage.length).toBeGreaterThan(10);
    }
  });
});
