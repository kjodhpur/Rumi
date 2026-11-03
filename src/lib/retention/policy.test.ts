import { describe, expect, it } from "vitest";
import { cutoff, effectivePolicy, planInactive, RETENTION_DEFAULTS } from "./policy";

const NOW = new Date("2026-11-03T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe("effectivePolicy", () => {
  it("uses the defaults when a school hasn't customized anything", () => {
    expect(effectivePolicy([])).toEqual(RETENTION_DEFAULTS);
  });

  it("applies in-range overrides and ignores out-of-range or unknown ones", () => {
    const policy = effectivePolicy([
      { entity: "orphaned_messages", days: 30 },
      { entity: "audit_log", days: 10 }, // below the 365-day floor
      { entity: "nonsense", days: 5 },
    ]);
    expect(policy.orphaned_messages).toBe(30);
    expect(policy.audit_log).toBe(RETENTION_DEFAULTS.audit_log);
  });

  it("never lets the warning swallow the whole inactivity window", () => {
    const policy = effectivePolicy([
      { entity: "inactive_accounts", days: 180 },
      { entity: "inactive_warning", days: 90 },
    ]);
    expect(policy.inactive_warning).toBeLessThan(policy.inactive_accounts);
  });
});

describe("cutoff", () => {
  it("counts whole days back from the clock", () => {
    expect(cutoff(NOW, 1).toISOString()).toBe("2026-11-02T12:00:00.000Z");
  });
});

describe("planInactive", () => {
  const policy = effectivePolicy([]); // 730-day window, 30-day warning

  it("warns at window minus warning, and not before", () => {
    const plan = planInactive(
      [
        { id: "due", lastActiveAt: daysAgo(700), warnedAt: null },
        { id: "early", lastActiveAt: daysAgo(699), warnedAt: null },
      ],
      policy,
      NOW,
    );
    expect(plan.warn).toEqual(["due"]);
    expect(plan.remove).toEqual([]);
  });

  it("never deletes someone who was never warned, however long they've been gone", () => {
    const plan = planInactive([{ id: "ghost", lastActiveAt: daysAgo(2000), warnedAt: null }], policy, NOW);
    expect(plan.remove).toEqual([]);
    expect(plan.warn).toEqual(["ghost"]);
  });

  it("deletes only after the full window and a full warning period", () => {
    const plan = planInactive(
      [
        { id: "ready", lastActiveAt: daysAgo(731), warnedAt: daysAgo(31) },
        { id: "warned-recently", lastActiveAt: daysAgo(731), warnedAt: daysAgo(5) },
      ],
      policy,
      NOW,
    );
    expect(plan.remove).toEqual(["ready"]);
  });

  it("clears the warning when someone comes back", () => {
    const plan = planInactive([{ id: "back", lastActiveAt: daysAgo(1), warnedAt: daysAgo(10) }], policy, NOW);
    expect(plan.clear).toEqual(["back"]);
    expect(plan.remove).toEqual([]);
  });

  it("is idempotent: the people it just warned aren't warned again the same day", () => {
    const first = planInactive([{ id: "a", lastActiveAt: daysAgo(705), warnedAt: null }], policy, NOW);
    const second = planInactive([{ id: "a", lastActiveAt: daysAgo(705), warnedAt: NOW.toISOString() }], policy, NOW);
    expect(first.warn).toEqual(["a"]);
    expect(second).toEqual({ warn: [], remove: [], clear: [] });
  });
});
