import { describe, expect, it } from "vitest";
import { bruteForceSwapCycles, findSwapCycles, pickDisjoint, type SwapCandidate } from "./swaps";

const cand = (userId: string, roommateId: string, currentScore: number): SwapCandidate => ({ userId, assignmentId: `as-${userId}`, roommateId, currentScore });
const table = (pairs: Record<string, number>) => (a: string, b: string) => pairs[`${a}|${b}`] ?? pairs[`${b}|${a}`] ?? null;
const canon = (ids: string[]) => {
  const start = ids.indexOf([...ids].sort()[0]!);
  return [...ids.slice(start), ...ids.slice(0, start)].join(">");
};

describe("swap cycles", () => {
  it("finds a 2-way swap that helps both movers and doesn't hurt either stayer", () => {
    const pool = [cand("a", "ra", 50), cand("b", "rb", 55)];
    const compat = table({ "a|rb": 80, "b|ra": 75, "ra|a": 50, "rb|b": 55 });
    const [cycle] = findSwapCycles(pool, compat);
    expect(cycle?.cycle).toEqual(["a", "b"]);
    expect(cycle?.moves.a).toMatchObject({ newRoommateId: "rb", currentScore: 50, newScore: 80 });
    expect(cycle?.stayers.rb).toEqual({ currentScore: 55, newScore: 80 });
  });

  it("finds 3-way cycles", () => {
    const pool = [cand("a", "ra", 40), cand("b", "rb", 40), cand("c", "rc", 40)];
    const compat = table({ "a|rb": 70, "b|rc": 70, "c|ra": 70 });
    expect(findSwapCycles(pool, compat).map((c) => canon(c.cycle))).toEqual(["a>b>c"]);
  });

  it("never lowers anyone's score: a stayer who'd lose blocks the swap", () => {
    const pool = [cand("a", "ra", 50), cand("b", "rb", 90)];
    // a would gain with rb, but rb would drop from 90 (with b) to 80 (with a).
    const compat = table({ "a|rb": 80, "b|ra": 95 });
    expect(findSwapCycles(pool, compat)).toEqual([]);
  });

  it("respects the minimum improvement and hard filters", () => {
    const pool = [cand("a", "ra", 70), cand("b", "rb", 70)];
    expect(findSwapCycles(pool, table({ "a|rb": 79, "b|ra": 90 }))).toEqual([]);
    expect(findSwapCycles(pool, table({ "b|ra": 90 }))).toEqual([]); // a + rb fail a hard filter
  });

  it("matches brute force on random pools", () => {
    let seed = 42;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let run = 0; run < 60; run++) {
      const n = 3 + Math.floor(rand() * 4);
      const pool = Array.from({ length: n }, (_, i) => cand(`u${i}`, `r${i}`, 30 + Math.floor(rand() * 50)));
      const pairs: Record<string, number> = {};
      for (const p of pool) for (const q of pool) if (rand() < 0.75) pairs[`${p.userId}|${q.roommateId}`] = Math.floor(rand() * 100);
      const compat = (a: string, b: string) => pairs[`${a}|${b}`] ?? null;
      const fast = findSwapCycles(pool, compat).map((c) => canon(c.cycle)).sort();
      expect(fast).toEqual(bruteForceSwapCycles(pool, compat));
      for (const c of findSwapCycles(pool, compat)) {
        for (const m of Object.values(c.moves)) expect(m.newScore).toBeGreaterThan(m.currentScore);
        for (const s of Object.values(c.stayers)) expect(s.newScore).toBeGreaterThanOrEqual(s.currentScore);
      }
    }
  });

  it("picks non-overlapping cycles, best first", () => {
    const pool = [cand("a", "ra", 40), cand("b", "rb", 40), cand("c", "rc", 40)];
    const compat = table({ "a|rb": 90, "b|ra": 90, "b|rc": 60, "c|ra": 60, "a|rc": 60, "c|rb": 60 });
    const chosen = pickDisjoint(findSwapCycles(pool, compat));
    expect(chosen).toHaveLength(1);
    expect(chosen[0]?.cycle).toEqual(["a", "b"]);
  });
});
