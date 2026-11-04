import { describe, expect, it } from "vitest";
import { en } from "./messages/en";
import { es } from "./messages/es";
import { zh } from "./messages/zh";
import { hi } from "./messages/hi";
import { leafPaths, placeholders, translate, valueAt } from "./core";
import { localizeError } from "./errors";
import { SELECTABLE_LOCALES } from "./config";

describe("dictionaries (missing-key check)", () => {
  const enKeys = leafPaths(en);

  it("Spanish has every English key and no extras", () => {
    const esKeys = leafPaths(es);
    expect(enKeys.filter((k) => !esKeys.includes(k))).toEqual([]);
    expect(esKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it("Spanish uses the same {placeholders} as English", () => {
    const mismatched = enKeys.filter(
      (k) => placeholders(valueAt(en, k)).join() !== placeholders(valueAt(es, k)).join(),
    );
    expect(mismatched).toEqual([]);
  });

  it("no empty strings", () => {
    expect(enKeys.filter((k) => valueAt(en, k) === "")).toEqual([]);
    expect(leafPaths(es).filter((k) => valueAt(es, k) === "")).toEqual([]);
  });

  it("Mandarin and Hindi hold no unreviewed strings and aren't offered", () => {
    expect(leafPaths(zh)).toEqual([]);
    expect(leafPaths(hi)).toEqual([]);
    expect(SELECTABLE_LOCALES).toEqual(["en", "es"]);
  });
});

describe("translate", () => {
  it("interpolates and falls back to English", () => {
    expect(translate("es", es, en, "shell.notificationsUnread", { count: 3 })).toBe(
      "Notificaciones, 3 sin leer",
    );
    expect(translate("es", es, en, "nope.missing")).toBe("nope.missing");
  });
});

describe("localizeError", () => {
  it("translates known messages, including templates", () => {
    expect(localizeError("Please sign in again.", "es")).toBe("Vuelve a iniciar sesión.");
    expect(localizeError("Keep it under 120 characters.", "es")).toBe(
      "Usa menos de 120 caracteres.",
    );
    expect(localizeError("Use your school email (like you@asu.edu).", "es")).toBe(
      "Usa tu correo escolar (como tu@asu.edu).",
    );
  });

  it("leaves English and unknown messages alone", () => {
    expect(localizeError("Please sign in again.", "en")).toBe("Please sign in again.");
    expect(localizeError("Housing admins only.", "es")).toBe("Housing admins only.");
  });
});
