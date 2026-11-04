import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const { validTwilioSignature } = await import("./sms");

// Twilio's published request-validation example.
const URL = "https://mycompany.com/myapp.php?foo=1&bar=2";
const PARAMS = {
  CallSid: "CA1234567890ABCDE",
  Caller: "+12349013030",
  Digits: "1234",
  From: "+12349013030",
  To: "+18005551212",
};

describe("Twilio webhook signature", () => {
  beforeEach(() => vi.stubEnv("TWILIO_AUTH_TOKEN", "12345"));
  afterEach(() => vi.unstubAllEnvs());

  it("accepts Twilio's documented example", () => {
    expect(validTwilioSignature(URL, PARAMS, "0/KCTR6DLpKmkAf8muzZqo1nDgQ=")).toBe(true);
  });

  it("rejects a changed parameter, a missing signature and an unset token", () => {
    expect(
      validTwilioSignature(URL, { ...PARAMS, Digits: "9999" }, "0/KCTR6DLpKmkAf8muzZqo1nDgQ="),
    ).toBe(false);
    expect(validTwilioSignature(URL, PARAMS, null)).toBe(false);
    vi.stubEnv("TWILIO_AUTH_TOKEN", "");
    expect(validTwilioSignature(URL, PARAMS, "0/KCTR6DLpKmkAf8muzZqo1nDgQ=")).toBe(false);
  });
});
