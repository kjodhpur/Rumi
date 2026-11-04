import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHORE_TEMPLATES,
  choresFromAgreement,
  firstDueDate,
  nextInRotation,
} from "./rotation";

describe("chore rotation", () => {
  it("cycles through the rotation and wraps around", () => {
    const rotation = ["u1", "u2", "u3"];
    expect(nextInRotation(rotation, null)).toBe("u1");
    expect(nextInRotation(rotation, "u1")).toBe("u2");
    expect(nextInRotation(rotation, "u3")).toBe("u1");
    expect(nextInRotation(rotation, "someone-who-left")).toBe("u1");
    expect(nextInRotation([], "u1")).toBeNull();
  });

  it("starts daily chores today and the rest on the coming Sunday", () => {
    expect(firstDueDate("2026-11-03", "daily")).toBe("2026-11-03"); // Tuesday
    expect(firstDueDate("2026-11-03", "weekly")).toBe("2026-11-08");
    expect(firstDueDate("2026-11-08", "weekly")).toBe("2026-11-08");
  });
});

describe("chores from the agreement", () => {
  it("reads the agreement's cleaning section", () => {
    expect(
      choresFromAgreement(
        "Dishes are washed within a day. We rotate bathroom, kitchen and trash weekly.",
      ).map((c) => c.key),
    ).toEqual(["bathroom", "kitchen", "trash"]);
    const tidy = choresFromAgreement(
      "Shared spaces get a quick tidy every day and dishes are washed the same day. We rotate bathroom, kitchen and trash weekly.",
    );
    expect(tidy.find((c) => c.cadence === "daily")?.key).toBe("tidy");
  });

  it("reads a Spanish agreement too", () => {
    const tidy = choresFromAgreement(
      "Los espacios compartidos se ordenan un poco todos los días y los platos se lavan el mismo día. Rotamos baño, cocina y basura cada semana.",
    );
    expect(tidy.map((c) => c.key)).toEqual(["bathroom", "kitchen", "trash", "tidy"]);
  });

  it("falls back to sensible defaults", () => {
    expect(choresFromAgreement(null)).toEqual(DEFAULT_CHORE_TEMPLATES);
    expect(choresFromAgreement("We keep it clean.")).toEqual(DEFAULT_CHORE_TEMPLATES);
  });
});
