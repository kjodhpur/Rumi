import { describe, expect, it } from "vitest";
import { wordDiff } from "./diff";

describe("agreement change highlighting", () => {
  it("marks only the words that changed", () => {
    expect(
      wordDiff(
        "Quiet hours start at 11pm on weeknights.",
        "Quiet hours start at midnight on weeknights.",
      ),
    ).toEqual([
      { kind: "same", text: "Quiet hours start at " },
      { kind: "removed", text: "11pm" },
      { kind: "added", text: "midnight" },
      { kind: "same", text: " on weeknights." },
    ]);
  });

  it("handles additions, removals and identical text", () => {
    expect(wordDiff("Dishes daily.", "Dishes daily. Trash on Sundays.")).toEqual([
      { kind: "same", text: "Dishes daily." },
      { kind: "added", text: " Trash on Sundays." },
    ]);
    expect(wordDiff("No guests overnight.", "")).toEqual([
      { kind: "removed", text: "No guests overnight." },
    ]);
    expect(wordDiff("Same.", "Same.")).toEqual([{ kind: "same", text: "Same." }]);
  });

  it("rebuilds both versions exactly", () => {
    const before = "Guests: up to 2 overnights a week,\nwith a day's notice.";
    const after = "Guests: up to 1 overnight a week,\nwith two days' notice. Ask first.";
    const parts = wordDiff(before, after);
    expect(
      parts
        .filter((p) => p.kind !== "added")
        .map((p) => p.text)
        .join(""),
    ).toBe(before);
    expect(
      parts
        .filter((p) => p.kind !== "removed")
        .map((p) => p.text)
        .join(""),
    ).toBe(after);
  });
});
