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
