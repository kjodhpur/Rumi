import { describe, expect, it } from "vitest";
import { assignPairs, type AssignCandidate, type AssignEdge } from "./assign";

const people = (n: number): AssignCandidate[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    signedUpAt: `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00Z`,
  }));

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
          if (random() < 0.6)
            edges.push({ a: pool[i].id, b: pool[j].id, score: 40 + Math.floor(random() * 61) });
        }
      }
      const result = assignPairs(pool, edges, { minScore: 0 });
      const truth = bruteForce(
        pool.map((p) => p.id),
        edges,
      );
      expect(result.pairs.length, `trial ${trial}`).toBe(truth.pairs);
      expect(
        result.pairs.reduce((s, p) => s + p.score, 0),
        `trial ${trial}`,
      ).toBe(truth.total);
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
        if (j !== i)
          edges.push({ a: pool[i].id, b: pool[j].id, score: 50 + Math.floor(random() * 50) });
      }
    }
    const started = performance.now();
    const result = assignPairs(pool, edges, { minScore: 60 });
    expect(performance.now() - started).toBeLessThan(30_000);
    expect(result.stats.paired / result.stats.feasible).toBeGreaterThanOrEqual(0.95);
  }, 60_000);
});

import { assignGroups } from "./assign";

/** Best (placed, total) over every partition into groups of `size` — ground truth for small pools. */
function bruteForceGroups(ids: string[], edges: AssignEdge[], size: number, min: number) {
  const s = new Map<string, number>();
  for (const e of edges) if (e.score >= min) s.set([e.a, e.b].sort().join("|"), e.score);
  const fit = (a: string, b: string) => s.get([a, b].sort().join("|"));
  let best = { placed: 0, total: 0 };
  const used = new Set<string>();
  function combos(pool: string[], k: number, start = 0, acc: string[] = []): string[][] {
    if (acc.length === k) return [acc];
    const out: string[][] = [];
    for (let i = start; i < pool.length; i++)
      out.push(...combos(pool, k, i + 1, [...acc, pool[i]]));
    return out;
  }
  function go(placed: number, total: number) {
    if (placed > best.placed || (placed === best.placed && total > best.total))
      best = { placed, total };
    const free = ids.filter((id) => !used.has(id));
    if (free.length < size) return;
    const first = free[0];
    used.add(first);
    go(placed, total);
    for (const rest of combos(free.slice(1), size - 1)) {
      const g = [first, ...rest];
      if (!g.every((a, i) => g.slice(i + 1).every((b) => fit(a, b) !== undefined))) continue;
      rest.forEach((r) => used.add(r));
      go(
        placed + size,
        total + g.reduce((t, a, i) => t + g.slice(i + 1).reduce((u, b) => u + fit(a, b)!, 0), 0),
      );
      rest.forEach((r) => used.delete(r));
    }
    used.delete(first);
  }
  go(0, 0);
  return best;
}

describe("auto-pair groups of 3–4", () => {
  const randomEdges = (n: number, seed: number, density = 0.75) => {
    const r = rng(seed);
    const edges: AssignEdge[] = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (r() < density) edges.push({ a: `s${i}`, b: `s${j}`, score: 40 + Math.floor(r() * 60) });
    return edges;
  };

  it("only proposes groups where every pair is compatible, each student at most once", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const pool = people(14);
      const edges = randomEdges(14, seed);
      const result = assignGroups(pool, edges, { size: 3, minScore: 55 });
      const ok = new Set(
        edges.filter((e) => e.score >= 55).map((e) => [e.a, e.b].sort().join("|")),
      );
      const seen = new Set<string>();
      for (const g of result.groups) {
        expect(g.members).toHaveLength(3);
        for (const m of g.members) {
          expect(seen.has(m)).toBe(false);
          seen.add(m);
        }
        for (let i = 0; i < 3; i++)
          for (let j = i + 1; j < 3; j++)
            expect(ok.has([g.members[i], g.members[j]].sort().join("|"))).toBe(true);
        expect(g.minScore).toBeGreaterThanOrEqual(55);
      }
      expect(result.groups.length * 3 + result.unpaired.length).toBe(14);
    }
  });

  it("places as many students as the best partition on small pools, with a close total", () => {
    for (const seed of [11, 12, 13, 14, 15, 16]) {
      const pool = people(9);
      const edges = randomEdges(9, seed, 0.7);
      const got = assignGroups(pool, edges, { size: 3, minScore: 50 });
      const best = bruteForceGroups(
        pool.map((p) => p.id),
        edges,
        3,
        50,
      );
      const total = got.groups.reduce(
        (s, g) =>
          s +
          g.members.reduce(
            (t, a, i) =>
              t +
              g.members
                .slice(i + 1)
                .reduce(
                  (u, b) =>
                    u +
                    edges.find((e) => [e.a, e.b].sort().join("|") === [a, b].sort().join("|"))!
                      .score,
                  0,
                ),
            0,
          ),
        0,
      );
      expect(got.stats.paired).toBe(best.placed);
      expect(total).toBeGreaterThanOrEqual(Math.floor(best.total * 0.9));
    }
  });

  it("stays close to the best partition on pools too big for the exact search", () => {
    for (const seed of [31, 32, 33]) {
      const pool = people(15);
      const edges = randomEdges(15, seed, 0.6);
      const got = assignGroups(pool, edges, { size: 3, minScore: 50 });
      const best = bruteForceGroups(
        pool.map((p) => p.id),
        edges,
        3,
        50,
      );
      expect(got.stats.paired).toBeGreaterThanOrEqual(best.placed - 3);
    }
  });

  it("handles a large pool quickly", () => {
    const pool = people(600);
    const r = rng(7);
    const edges: AssignEdge[] = [];
    for (let i = 0; i < 600; i++)
      for (let k = 0; k < 40; k++) {
        const j = Math.floor(r() * 600);
        if (j !== i) edges.push({ a: `s${i}`, b: `s${j}`, score: 50 + Math.floor(r() * 50) });
      }
    const t = Date.now();
    const result = assignGroups(pool, edges, { size: 3, minScore: 60 });
    expect(Date.now() - t).toBeLessThan(20_000);
    expect(result.groups.length).toBeGreaterThan(0);
  });

  it("is deterministic and explains who was left out", () => {
    const pool = people(8);
    const edges = randomEdges(8, 21);
    expect(assignGroups(pool, edges, { size: 4, minScore: 50 })).toEqual(
      assignGroups([...pool].reverse(), [...edges].reverse(), { size: 4, minScore: 50 }),
    );
    const lonely = assignGroups(
      [...people(4), { id: "x", signedUpAt: "2026-09-30T00:00:00Z" }],
      [
        { a: "s0", b: "s1", score: 80 },
        { a: "s0", b: "s2", score: 80 },
        { a: "s1", b: "s2", score: 80 },
        { a: "s3", b: "s0", score: 30 },
      ],
      { size: 3, minScore: 50 },
    );
    expect(lonely.groups.map((g) => g.members)).toEqual([["s0", "s1", "s2"]]);
    expect(lonely.unpaired).toEqual([
      { id: "s3", reason: "below_min" },
      { id: "x", reason: "no_partner" },
    ]);
  });
});
