import { describe, expect, it } from "vitest";
import { FACTORS } from "@/lib/options";
import { conversationStarters, startersFor, type StarterPrefs } from "./starters";

const low: StarterPrefs = {
  sleepSchedule: 1,
  cleanliness: 1,
  noise: 1,
  guests: 1,
  smoking: "never",
  drinking: "never",
  pets: "none",
  housingType: "on_campus",
};
const high: StarterPrefs = {
  sleepSchedule: 5,
  cleanliness: 5,
  noise: 5,
  guests: 5,
  smoking: "regularly",
  drinking: "often",
  pets: "have",
  housingType: "off_campus",
};

describe("conversation starters", () => {
  it("has at least two openers for every factor, in both directions", () => {
    for (const key of FACTORS) {
      for (const [me, them] of [
        [low, high],
        [high, low],
      ]) {
        const lines = startersFor(key, me, them);
        expect(lines.length, key).toBeGreaterThanOrEqual(2);
        for (const line of lines) expect(line.length).toBeGreaterThan(10);
      }
    }
  });

  it("speaks from the right side of a difference", () => {
    expect(startersFor("sleep", low, high)[0]).toMatch(/You're up later than me/);
    expect(startersFor("sleep", high, low)[0]).toMatch(/I tend to stay up later/);
  });

  it("caps a chat at three watch-outs with two openers each, without repeats", () => {
    const groups = conversationStarters(["sleep", "noise", "sleep", "guests", "pets"], low, high);
    expect(groups.map((g) => g.key)).toEqual(["sleep", "noise", "guests"]);
    expect(groups.every((g) => g.lines.length === 2)).toBe(true);
  });
});
