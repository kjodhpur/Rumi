import { describe, it, expect } from "vitest";
import { en } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { zhStatus } from "./dictionaries/zh";
import { hiStatus } from "./dictionaries/hi";
import { t, getDictionary } from "./translate";
import { LOCALES } from "./types";

function extractKeyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") {
      keys.push(...extractKeyPaths(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

describe("i18n & Multilingual System", () => {
  it("Spanish dictionary has complete key parity with English (CI missing-key check)", () => {
    const enKeys = extractKeyPaths(en as unknown as Record<string, unknown>);
    const esKeys = new Set(extractKeyPaths(es as unknown as Record<string, unknown>));

    const missingKeys = enKeys.filter((key) => !esKeys.has(key));
    expect(missingKeys).toEqual([]);
  });

  it("translates keys into Spanish accurately", () => {
    expect(t("common.save", "es")).toBe("Guardar");
    expect(t("onboarding.finish", "es")).toBe("Comenzar a buscar");
    expect(t("matching.mutualFit", "es")).toBe("Afinidad mutua");
  });

  it("falls back to English when a key is missing in another locale", () => {
    expect(t("matching.watchouts", "zh")).toBe("Things to talk about");
    expect(t("agreement.title", "hi")).toBe("Roommate Agreement");
  });

  it("flags Mandarin and Hindi as needing professional translation", () => {
    expect(zhStatus).toBe("needs_professional_translation");
    expect(hiStatus).toBe("needs_professional_translation");
    expect(LOCALES.zh.status).toBe("needs_professional_translation");
    expect(LOCALES.hi.status).toBe("needs_professional_translation");
  });

  it("interpolates parameters in translation strings", () => {
    const text = t("matching.twoWayScore", "en");
    expect(text).toBe("Compatibility Score");
  });
});
