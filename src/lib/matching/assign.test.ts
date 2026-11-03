import { describe, expect, it } from "vitest";
import { assignPairs, type AssignCandidate, type AssignEdge } from "./assign";

const people = (n: number): AssignCandidate[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, signedUpAt: `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00Z` }));

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Best (pairs, total score) over every matching — the ground truth for small pools. */
function bruteForce(ids: string[], edges: AssignEdge[]) {
  const score = new Map<string, number>();
  for (const e of edges) score.set([e.a, e.b].sort().join("|"), e.score);
  let best = { pairs: 0, total: 0 };
  const used = new Set<string>();
  function go(i: number, pairs: number, total: number) {
    if (pairs > best.pairs || (pairs === best.pairs && total > best.total)) best = { pairs, total };
    while (i < ids.length && used.has(ids[i])) i++;
    if (i >= ids.length) return;
    used.add(ids[i]);
    go(i + 1, pairs, total);
    for (let j = i + 1; j < ids.length; j++) {
      const s = score.get([ids[i], ids[j]].sort().join("|"));
      if (s === undefined || used.has(ids[j])) continue;
      used.add(ids[j]);
      go(i + 1, pairs + 1, total + s);
      used.delete(ids[j]);
    }
    used.delete(ids[i]);
  }
  go(0, 0, 0);
  return best;
}

describe("assignPairs", () => {
  it("is optimal against brute force on small pools", () => {
    const random = rng(11);
    for (let trial = 0; trial < 200; trial++) {
      const pool = people(2 + Math.floor(random() * 9));
      const edges: AssignEdge[] = [];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          if (random() < 0.6) edges.push({ a: pool[i].id, b: pool[j].id, score: 40 + Math.floor(random() * 61) });
        }
      }
      const result = assignPairs(pool, edges, { minScore: 0 });
      const truth = bruteForce(pool.map((p) => p.id), edges);
      expect(result.pairs.length, `trial ${trial}`).toBe(truth.pairs);
      expect(result.pairs.reduce((s, p) => s + p.score, 0), `trial ${trial}`).toBe(truth.total);
    }
  });

  it("never proposes a pair that isn't an allowed edge (hard filters live in the edges)", () => {
    const pool = people(4);
    // s0–s1 and s2–s3 fail a dealbreaker, so they have no edge.
    const edges = [
      { a: "s0", b: "s2", score: 60 },
      { a: "s1", b: "s3", score: 55 },
    ];
    const result = assignPairs(pool, edges, { minScore: 0 });
    const allowed = new Set(edges.map((e) => [e.a, e.b].sort().join("|")));
    for (const p of result.pairs) expect(allowed.has([p.a, p.b].sort().join("|"))).toBe(true);
    expect(result.pairs).toHaveLength(2);
  });

  it("honors the minimum score and explains who is left over", () => {
    const pool = people(5);
    const edges = [
      { a: "s0", b: "s1", score: 90 },
      { a: "s1", b: "s2", score: 85 },
      { a: "s3", b: "s0", score: 40 },
    ];
    const result = assignPairs(pool, edges, { minScore: 60 });
    expect(result.pairs).toEqual([{ a: "s0", b: "s1", score: 90 }]);
    expect(Object.fromEntries(result.unpaired.map((u) => [u.id, u.reason]))).toEqual({
      s2: "odd_one_out",
      s3: "below_min",
      s4: "no_partner",
    });
  });

  it("is deterministic and breaks ties toward earlier sign-ups", () => {
    const pool = people(3);
    const edges = [
      { a: "s0", b: "s2", score: 80 },
      { a: "s1", b: "s2", score: 80 },
    ];
    const first = assignPairs(pool, edges, { minScore: 0 });
    const reversed = assignPairs([...pool].reverse(), [...edges].reverse(), { minScore: 0 });
    expect(first.pairs).toEqual([{ a: "s0", b: "s2", score: 80 }]);
    expect(reversed.pairs).toEqual(first.pairs);
  });

  it("pairs 2,000 students in well under 30 seconds and pairs nearly everyone feasible", () => {
    const random = rng(3);
    const pool = people(2000).map((p, i) => ({ ...p, id: `u${i}` }));
    const edges: AssignEdge[] = [];
    for (let i = 0; i < pool.length; i++) {
      for (let k = 0; k < 25; k++) {
        const j = Math.floor(random() * pool.length);
        if (j !== i) edges.push({ a: pool[i].id, b: pool[j].id, score: 50 + Math.floor(random() * 50) });
      }
    }
    const started = performance.now();
    const result = assignPairs(pool, edges, { minScore: 60 });
    expect(performance.now() - started).toBeLessThan(30_000);
    expect(result.stats.paired / result.stats.feasible).toBeGreaterThanOrEqual(0.95);
  }, 60_000);
});
