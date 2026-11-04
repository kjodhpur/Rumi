import { describe, expect, it } from "vitest";
import { buildDraft, type MemberPrefs } from "./template";
import { afterAccept, afterEdit, membersMatch, readyToSign, signatureMatches } from "./rules";

const member = (overrides: Partial<MemberPrefs>): MemberPrefs => ({
  id: "a",
  firstName: "Ana",
  sleepSchedule: 3,
  cleanliness: 3,
  noise: 3,
  guests: 3,
  smoking: "never",
  drinking: "socially",
  pets: "none",
  ...overrides,
});

describe("buildDraft", () => {
  it("sets quiet hours by the earliest sleeper and guests by the strictest member", () => {
    const draft = buildDraft(
      [
        member({ sleepSchedule: 1, guests: 5 }),
        member({ id: "b", firstName: "Ben", sleepSchedule: 5, guests: 2 }),
      ],
      [],
    );
    expect(draft.find((s) => s.key === "sleep")!.content).toMatch(/10pm on weeknights/);
    expect(draft.find((s) => s.key === "guests")!.content).toMatch(/at most 1 night a week/);
  });

  it("uses the stricter rules for smoking and pets, and names pet owners", () => {
    const draft = buildDraft(
      [
        member({ smoking: "regularly", pets: "have" }),
        member({ id: "b", firstName: "Ben", smoking: "never", pets: "none" }),
      ],
      [],
    );
    const content = draft.find((s) => s.key === "substances")!.content;
    expect(content).toMatch(/No smoking or vaping inside/);
    expect(content).toMatch(/Ana's pet stays out of others' rooms/);
  });

  it("adds a talk-about-this section only when there are watch-outs", () => {
    expect(buildDraft([member({}), member({ id: "b" })], []).some((s) => s.key === "talk")).toBe(
      false,
    );
    const talk = buildDraft(
      [member({}), member({ id: "b" })],
      ["Ben stays up later", "Ben stays up later"],
    ).find((s) => s.key === "talk");
    expect(talk!.content.match(/•/g)).toHaveLength(1);
  });
});

describe("agreement rules", () => {
  const members = ["a", "b"];

  it("needs every member's acceptance on every section to sign", () => {
    expect(
      readyToSign(
        [
          { key: "x", acceptedBy: ["a", "b"] },
          { key: "y", acceptedBy: ["a"] },
        ],
        members,
      ),
    ).toBe(false);
    expect(readyToSign([{ key: "x", acceptedBy: ["b", "a"] }], members)).toBe(true);
    expect(readyToSign([], members)).toBe(false);
  });

  it("an edit resets acceptance to the editor; accepting is idempotent", () => {
    expect(afterEdit("b")).toEqual(["b"]);
    expect(afterAccept(["b"], "a")).toEqual(["b", "a"]);
    expect(afterAccept(["b", "a"], "a")).toEqual(["b", "a"]);
  });

  it("voids when the group's members change", () => {
    expect(membersMatch(["a", "b"], ["b", "a"])).toBe(true);
    expect(membersMatch(["a", "b"], ["a", "b", "c"])).toBe(false);
  });

  it("checks a typed signature against the signer's first name", () => {
    expect(signatureMatches("ana torres", "Ana")).toBe(true);
    expect(signatureMatches("Ben", "Ana")).toBe(false);
    expect(signatureMatches(" ", "Ana")).toBe(false);
  });
});

import { applyTemplate, defaultTemplate, parseTemplate, type DraftSection } from "./template";

describe("school agreement templates", () => {
  const draft: DraftSection[] = [
    { key: "sleep", title: "Sleep and quiet hours", content: "Quiet from 11pm." },
    { key: "guests", title: "Guests and overnights", content: "Up to 2 overnights a week." },
    { key: "talk", title: "Talk about this", content: "• Sleep schedules" },
  ];

  it("keeps the prefilled text, adds the school's note, renames, hides and adds sections", () => {
    const template = parseTemplate([
      {
        key: "guests",
        title: "Visitors",
        enabled: true,
        text: "Hall policy: guests sign in at the front desk.",
        custom: false,
      },
      { key: "sleep", title: "Sleep", enabled: true, text: "", custom: false },
      { key: "talk", enabled: false, custom: false },
      {
        key: "hall_rules",
        title: "Hall rules",
        enabled: true,
        text: "No candles or space heaters.",
        custom: true,
      },
    ]);
    expect(applyTemplate(draft, template)).toEqual([
      {
        key: "guests",
        title: "Visitors",
        content: "Up to 2 overnights a week.\n\nHall policy: guests sign in at the front desk.",
      },
      { key: "sleep", title: "Sleep", content: "Quiet from 11pm." },
      { key: "hall_rules", title: "Hall rules", content: "No candles or space heaters." },
    ]);
  });

  it("never drops a built-in section the template doesn't mention", () => {
    expect(
      applyTemplate(draft, parseTemplate([{ key: "sleep", custom: false }])).map((s) => s.key),
    ).toEqual(["sleep", "guests", "talk"]);
    expect(applyTemplate(draft, null)).toBe(draft);
  });

  it("rejects malformed templates and unknown built-ins", () => {
    expect(parseTemplate("nope")).toBeNull();
    expect(parseTemplate([{ key: "made_up", custom: false }])).toBeNull();
    expect(parseTemplate([{ key: "sleep" }, { key: "sleep" }])).toHaveLength(1);
    expect(defaultTemplate().every((t) => t.enabled && !t.custom)).toBe(true);
  });
});
