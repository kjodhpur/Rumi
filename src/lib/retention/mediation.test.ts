import { describe, expect, it } from "vitest";
import { getGuidedMediationTips } from "./mediation";
import { CHECKIN_TAGS } from "./risk";

describe("Phase 5 Guided Self-Mediation", () => {
  it("provides tailored mediation guidance and openers for reported tags", () => {
    const tips = getGuidedMediationTips(["noise", "cleanliness"]);
    expect(tips).toHaveLength(2);
    expect(tips[0].tag).toBe("noise");
    expect(tips[0].agreementSection).toContain("Quiet Hours");
    expect(tips[0].suggestedMessage).toContain("quiet hours");

    expect(tips[1].tag).toBe("cleanliness");
    expect(tips[1].agreementSection).toContain("Cleanliness");
    expect(tips[1].suggestedMessage).toContain("kitchen");
  });

  it("provides default communication advice when no specific tag was selected", () => {
    const tips = getGuidedMediationTips([]);
    expect(tips).toHaveLength(1);
    expect(tips[0].tag).toBe("communication");
    expect(tips[0].suggestedMessage).toContain("coffee");
  });

  it("guarantees every valid checkin tag has guidance and openers", () => {
    for (const tag of CHECKIN_TAGS) {
      const [tip] = getGuidedMediationTips([tag]);
      expect(tip.tag).toBe(tag);
      expect(tip.title).toBeTruthy();
      expect(tip.agreementSection).toBeTruthy();
      expect(tip.advice).toBeTruthy();
      expect(tip.suggestedMessage).toBeTruthy();
    }
  });
});
