import { describe, expect, it } from "vitest";
import { channelsFor, defaultMatrix, inQuietHours, normalizeUsPhone, smsKeyword } from "./channels";

describe("notification channels", () => {
  it("defaults to in-app and email only", () => {
    expect(
      channelsFor("deadlines", {
        matrix: defaultMatrix(),
        smsReady: true,
        pushReady: true,
        quiet: false,
      }),
    ).toEqual(["in_app", "email"]);
  });

  it("sends texts and push only when turned on, ready, and outside quiet hours", () => {
    const m = defaultMatrix();
    m.deadlines = { in_app: true, email: false, sms: true, push: true };
    expect(
      channelsFor("deadlines", { matrix: m, smsReady: true, pushReady: true, quiet: false }),
    ).toEqual(["in_app", "sms", "push"]);
    expect(
      channelsFor("deadlines", { matrix: m, smsReady: false, pushReady: true, quiet: false }),
    ).toEqual(["in_app", "push"]);
    expect(
      channelsFor("deadlines", { matrix: m, smsReady: true, pushReady: true, quiet: true }),
    ).toEqual(["in_app"]);
    expect(
      channelsFor("deadlines", {
        matrix: m,
        smsReady: true,
        pushReady: true,
        quiet: true,
        urgent: true,
      }),
    ).toEqual(["in_app", "sms", "push"]);
  });

  it("knows campus quiet hours (9pm–8am)", () => {
    const tz = "America/Phoenix"; // UTC-7 all year
    expect(inQuietHours(new Date("2026-11-03T04:30:00Z"), tz)).toBe(true); // 9:30pm
    expect(inQuietHours(new Date("2026-11-03T14:59:00Z"), tz)).toBe(true); // 7:59am
    expect(inQuietHours(new Date("2026-11-03T15:00:00Z"), tz)).toBe(false); // 8am
    expect(inQuietHours(new Date("2026-11-03T20:00:00Z"), tz)).toBe(false); // 1pm
  });

  it("recognises STOP, START and HELP", () => {
    expect(smsKeyword(" stop ")).toBe("stop");
    expect(smsKeyword("Unsubscribe")).toBe("stop");
    expect(smsKeyword("HELP!")).toBe("help");
    expect(smsKeyword("start")).toBe("start");
    expect(smsKeyword("thanks")).toBeNull();
  });

  it("normalises US phone numbers", () => {
    expect(normalizeUsPhone("(480) 555-0199")).toBe("+14805550199");
    expect(normalizeUsPhone("1-480-555-0199")).toBe("+14805550199");
    expect(normalizeUsPhone("555-0199")).toBeNull();
    expect(normalizeUsPhone("123-456-7890")).toBeNull();
  });
});
