import { describe, expect, it } from "vitest";
import {
  accentIssue,
  brandName,
  contrastRatio,
  parseBranding,
  sniffLogo,
  toBrandingJson,
} from "./branding";

describe("school branding", () => {
  it("reads only well-formed values", () => {
    expect(
      parseBranding({
        logo_path: "asu/logo-abc123.png",
        display_name: "  ASU  ",
        secondary_accent: "#8C1D40",
      }),
    ).toEqual({ logoPath: "asu/logo-abc123.png", displayName: "ASU", secondaryAccent: "#8c1d40" });
    expect(
      parseBranding({
        logo_path: "../../etc/passwd",
        display_name: 42,
        secondary_accent: "red",
      }),
    ).toEqual({ logoPath: null, displayName: null, secondaryAccent: null });
    expect(parseBranding(null)).toEqual({
      logoPath: null,
      displayName: null,
      secondaryAccent: null,
    });
  });

  it("round-trips through the stored shape", () => {
    const b = { logoPath: "demo/logo-1.webp", displayName: "Demo U", secondaryAccent: "#1f6feb" };
    expect(parseBranding(toBrandingJson(b))).toEqual(b);
    expect(toBrandingJson({ logoPath: null, displayName: null, secondaryAccent: null })).toEqual(
      {},
    );
  });

  it("accepts accents visible in both themes and refuses near-white or near-black", () => {
    expect(accentIssue("#8c1d40")).toBeNull(); // ASU maroon
    expect(accentIssue("#ffc627")).toBeNull(); // ASU gold
    expect(accentIssue("#fafafa")).toMatch(/too light/);
    expect(accentIssue("#0b0b0b")).toMatch(/too dark/);
    expect(accentIssue("maroon")).toMatch(/hex color/);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("names the school by its display name, else its short name", () => {
    expect(brandName(parseBranding({ display_name: "Sun Devils" }), "ASU")).toBe("Sun Devils");
    expect(brandName(parseBranding({}), "ASU")).toBe("ASU");
  });

  it("sniffs logo types from the bytes, not the file name", () => {
    expect(sniffLogo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("image/png");
    expect(sniffLogo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    const webp = new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
    expect(sniffLogo(webp)).toBe("image/webp");
    expect(sniffLogo(new TextEncoder().encode("<svg xmlns="))).toBeNull();
  });
});
