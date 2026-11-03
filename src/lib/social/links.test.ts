import { describe, expect, it } from "vitest";
import {
  buildSocialUrl,
  cleanHandle,
  generateVerificationCode,
  isSocialPlatform,
  verifyBioCode,
} from "./links";

describe("social links handling", () => {
  it("cleans instagram handles correctly", () => {
    expect(cleanHandle("instagram", "@student_asu")).toBe("student_asu");
    expect(cleanHandle("instagram", "https://instagram.com/student_asu")).toBe("student_asu");
    expect(cleanHandle("instagram", "https://www.instagram.com/student_asu/")).toBe("student_asu");
    expect(cleanHandle("instagram", "student_asu?igshid=123")).toBe("student_asu");
  });

  it("cleans linkedin handles correctly", () => {
    expect(cleanHandle("linkedin", "@sparky-dev")).toBe("sparky-dev");
    expect(cleanHandle("linkedin", "https://linkedin.com/in/sparky-dev/")).toBe("sparky-dev");
    expect(cleanHandle("linkedin", "https://www.linkedin.com/in/sparky-dev")).toBe("sparky-dev");
  });

  it("builds valid URLs", () => {
    expect(buildSocialUrl("instagram", "@asu_freshman")).toBe("https://instagram.com/asu_freshman");
    expect(buildSocialUrl("linkedin", "asu_freshman")).toBe("https://linkedin.com/in/asu_freshman");
  });

  it("generates unique 9-char verification code format", () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^RUMI-[2-9A-HJ-NP-Z]{4}$/);
  });

  it("validates platform keys", () => {
    expect(isSocialPlatform("instagram")).toBe(true);
    expect(isSocialPlatform("linkedin")).toBe(true);
    expect(isSocialPlatform("twitter")).toBe(false);
  });

  it("verifies bio verification codes correctly", () => {
    const code = "RUMI-9K4P";
    expect(verifyBioCode("ASU CS '28 | Tooker House | RUMI-9K4P", code)).toBe(true);
    expect(verifyBioCode("rumi-9k4p in bio", code)).toBe(true);
    expect(verifyBioCode("ASU Freshman | No code here", code)).toBe(false);
    expect(verifyBioCode("", code)).toBe(false);
  });
});
