import { describe, expect, it } from "vitest";
import { isPublicAddress, normalizeFeedUrl } from "./feed-url";

describe("calendar feed URLs (SSRF guard)", () => {
  it("accepts https and webcal links", () => {
    expect(
      normalizeFeedUrl("https://canvas.asu.edu/feeds/calendars/user_abc.ics")?.toString(),
    ).toBe("https://canvas.asu.edu/feeds/calendars/user_abc.ics");
    expect(normalizeFeedUrl("webcal://p01-calendars.icloud.com/x.ics")?.protocol).toBe("https:");
  });

  it.each([
    "http://canvas.example.edu/feed.ics",
    "file:///etc/passwd",
    "https://user:pass@example.com/feed.ics",
    "https://example.com:8443/feed.ics",
    "https://localhost/feed.ics",
    "https://127.0.0.1/feed.ics",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/feed.ics",
    "https://10.0.0.5/feed.ics",
    "https://printer.local/feed.ics",
    "not a url",
  ])("rejects %s", (url) => {
    expect(normalizeFeedUrl(url)).toBeNull();
  });

  it("classifies addresses", () => {
    for (const ip of [
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.1",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ])
      expect(isPublicAddress(ip)).toBe(false);
    for (const ip of ["8.8.8.8", "172.32.0.1", "2607:f8b0:4005:80a::200e", "::ffff:8.8.8.8"])
      expect(isPublicAddress(ip)).toBe(true);
  });
});
