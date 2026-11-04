import { describe, expect, it } from "vitest";
import { maxWeightMatching, type Edge } from "./blossom";

/** Exhaustive search: best (cardinality, weight) or best weight, over all matchings. */
function bruteForce(n: number, edges: Edge[], maxCardinality: boolean) {
  const weight = new Map<string, number>();
  for (const [u, v, w] of edges) weight.set(`${Math.min(u, v)}-${Math.max(u, v)}`, w);
  let best = { pairs: 0, total: 0 };
  const used = new Array(n).fill(false);
  function better(a: { pairs: number; total: number }, b: { pairs: number; total: number }) {
    if (maxCardinality && a.pairs !== b.pairs) return a.pairs > b.pairs;
    return a.total > b.total + 1e-9;
  }
  function go(i: number, pairs: number, total: number) {
    if (better({ pairs, total }, best)) best = { pairs, total };
    while (i < n && used[i]) i++;
    if (i >= n) return;
    used[i] = true;
    go(i + 1, pairs, total); // leave i unmatched
    for (let j = i + 1; j < n; j++) {
      const w = weight.get(`${i}-${j}`);
      if (w === undefined || used[j]) continue;
      used[j] = true;
      go(i + 1, pairs + 1, total + w);
      used[j] = false;
    }
    used[i] = false;
  }
  go(0, 0, 0);
  return best;
}

function score(mate: number[], edges: Edge[]) {
  const weight = new Map<string, number>();
  for (const [u, v, w] of edges) weight.set(`${Math.min(u, v)}-${Math.max(u, v)}`, w);
  let pairs = 0;
  let total = 0;
  mate.forEach((m, v) => {
    if (m > v) {
      const w = weight.get(`${v}-${m}`);
      expect(w, `matched pair ${v}-${m} must be an edge`).toBeDefined();
      expect(mate[m]).toBe(v);
      pairs += 1;
      total += w!;
    }
  });
  return { pairs, total };
}

/** Small deterministic PRNG so failures are reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("maxWeightMatching", () => {
  it("handles the empty graph and a single edge", () => {
    expect(maxWeightMatching([])).toEqual([]);
    expect(maxWeightMatching([[0, 1, 1]])).toEqual([1, 0]);
  });

  it("prefers weight over cardinality by default, and cardinality when asked", () => {
    const path: Edge[] = [
      [0, 1, 1],
      [1, 2, 10],
      [2, 3, 1],
    ];
    expect(maxWeightMatching(path)).toEqual([-1, 2, 1, -1]);
    expect(maxWeightMatching(path, true)).toEqual([1, 0, 3, 2]);
  });

  it("solves classic blossom cases", () => {
    // Odd cycle with a pendant: needs a blossom to find the optimum.
    expect(
      maxWeightMatching([
        [0, 1, 8],
        [0, 2, 9],
        [1, 2, 10],
        [2, 3, 7],
      ]),
    ).toEqual([1, 0, 3, 2]);
    // From the reference test suite: nested S-blossom, relabeled as T.
    const mate = maxWeightMatching([
      [0, 1, 9],
      [0, 2, 9],
      [1, 2, 10],
      [1, 3, 8],
      [2, 4, 8],
      [3, 4, 10],
      [4, 5, 6],
    ]);
    expect(
      score(mate, [
        [0, 1, 9],
        [0, 2, 9],
        [1, 2, 10],
        [1, 3, 8],
        [2, 4, 8],
        [3, 4, 10],
        [4, 5, 6],
      ]).total,
    ).toBe(23);
  });

  it("matches brute force on 600 random graphs of up to 10 vertices", () => {
    const random = rng(42);
    for (let trial = 0; trial < 600; trial++) {
      const n = 2 + Math.floor(random() * 9);
      const density = 0.3 + random() * 0.7;
      const edges: Edge[] = [];
      for (let u = 0; u < n; u++) {
        for (let v = u + 1; v < n; v++) {
          if (random() < density) edges.push([u, v, 1 + Math.floor(random() * 100)]);
        }
      }
      if (edges.length === 0) continue;
      for (const maxCardinality of [false, true]) {
        const mate = maxWeightMatching(edges, maxCardinality);
        const got = score(mate, edges);
        const want = bruteForce(n, edges, maxCardinality);
        if (maxCardinality) expect(got.pairs, `trial ${trial} pairs`).toBe(want.pairs);
        expect(got.total, `trial ${trial} (maxCardinality=${maxCardinality})`).toBe(want.total);
      }
    }
  });

  it("is fast on a sparse graph of 2,000 vertices", () => {
    const random = rng(7);
    const edges: Edge[] = [];
    for (let u = 0; u < 2000; u++) {
      for (let k = 0; k < 30; k++) {
        const v = Math.floor(random() * 2000);
        if (v !== u) edges.push([u, v, 50 + Math.floor(random() * 50)]);
      }
    }
    const started = performance.now();
    const mate = maxWeightMatching(edges, true);
    expect(performance.now() - started).toBeLessThan(30_000);
    expect(mate.filter((m) => m >= 0).length).toBeGreaterThan(1900);
  }, 60_000);
});
