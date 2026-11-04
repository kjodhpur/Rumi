import { describe, expect, it } from "vitest";
import {
  buildDeepLink,
  canvasLink,
  normalizeSource,
  parseSourceCookie,
  portalEmbedSnippet,
  sourceCookieValue,
} from "./attribution";

const SIG = "a".repeat(64);

describe("source attribution", () => {
  it("normalizes known sources and falls back to direct", () => {
    expect(normalizeSource("starrez")).toBe("starrez");
    expect(normalizeSource(" CANVAS ")).toBe("canvas");
    expect(normalizeSource("asuapp")).toBe("asuapp");
    expect(normalizeSource(null)).toBe("direct");
    expect(normalizeSource("")).toBe("direct");
    expect(normalizeSource("utm_spam")).toBe("direct");
  });

  it("builds deep links on the app's own origin", () => {
    expect(buildDeepLink("https://rumimatch.app/", "asu", "starrez")).toBe(
      "https://rumimatch.app/s/asu?src=starrez",
    );
    expect(buildDeepLink("http://localhost:3000", "ASU", "direct")).toBe(
      "http://localhost:3000/s/asu",
    );
    expect(canvasLink("https://rumimatch.app", "asu").url).toBe(
      "https://rumimatch.app/s/asu?src=canvas",
    );
  });

  it("round-trips the source cookie and rejects tampered values", () => {
    expect(parseSourceCookie(sourceCookieValue("asu", "canvas", SIG))).toEqual({
      school: "asu",
      source: "canvas",
      signature: SIG,
    });
    expect(parseSourceCookie("asu.evil.".concat(SIG))).toBeNull();
    expect(parseSourceCookie("asu.canvas.short")).toBeNull();
    expect(parseSourceCookie("../x.canvas.".concat(SIG))).toBeNull();
    expect(parseSourceCookie(undefined)).toBeNull();
  });

  it("makes a portal button with no affiliation claim and escaped text", () => {
    const html = portalEmbedSnippet("https://rumimatch.app", "asu", 'A"SU');
    expect(html).toContain('href="https://rumimatch.app/s/asu?src=starrez"');
    expect(html).toContain("Find your roommate on Rumi");
    expect(html).toContain("independent service");
    expect(html).toContain("A&quot;SU");
    expect(html).not.toMatch(/official|partner|login/i);
  });
});
