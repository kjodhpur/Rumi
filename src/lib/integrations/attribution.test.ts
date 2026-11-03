import { describe, it, expect } from "vitest";
import {
  normalizeSource,
  buildDeepLink,
  generatePortalEmbedSnippet,
  generateLmsLinkConfig,
} from "./attribution";

describe("attribution", () => {
  it("normalizes recognized sources correctly", () => {
    expect(normalizeSource("starrez")).toBe("starrez");
    expect(normalizeSource("CANVAS")).toBe("canvas");
    expect(normalizeSource("asuapp")).toBe("asuapp");
    expect(normalizeSource("qr")).toBe("qr");
    expect(normalizeSource("email")).toBe("email");
  });

  it("falls back to direct for unrecognized sources or null", () => {
    expect(normalizeSource(null)).toBe("direct");
    expect(normalizeSource("")).toBe("direct");
    expect(normalizeSource("random_tracker_123")).toBe("direct");
  });

  it("builds clean deep links with query parameters", () => {
    const link = buildDeepLink("asu", "starrez", "https://rumi.app");
    expect(link).toBe("https://rumi.app/s/asu?src=starrez");
  });

  it("generates an embed snippet containing the school link and button", () => {
    const snippet = generatePortalEmbedSnippet("asu", "Arizona State University");
    expect(snippet).toContain("https://rumi.app/s/asu?src=starrez");
    expect(snippet).toContain("Find Your Roommate on Rumi");
    expect(snippet).toContain("Continue with Arizona State University Login");
  });

  it("generates LMS external tool placement configuration", () => {
    const config = generateLmsLinkConfig("asu");
    expect(config.title).toBe("Find Your Roommate (Rumi)");
    expect(config.url).toContain("/s/asu?src=canvas");
    expect(config.target).toBe("_blank");
  });
});
