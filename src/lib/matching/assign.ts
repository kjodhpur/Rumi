import { maxWeightMatching, type Edge } from "./blossom";

/**
 * Housing auto-pair: proposes roommate pairs for students who haven't found one.
 * Pairs as many students as possible, then maximizes the total mutual score.
 * Only pairs that already pass every hard filter are candidates (the caller passes
 * existing mutual scores). Pure and deterministic; ties go to earlier sign-ups.
 */

export interface AssignCandidate {
  id: string;
  signedUpAt: string;
}

export interface AssignEdge {
  a: string;
  b: string;
  /** Mutual 0–100 score between the two (symmetric). */
  score: number;
}

export interface AssignOptions {
  /** Pairs below this score are never proposed. */
  minScore: number;
  /** Keep each student's best N options; keeps 2,000-student runs to seconds. */
  maxOptions?: number;
}

export type UnpairedReason = "no_partner" | "below_min" | "odd_one_out";

export interface AssignResult {
  pairs: { a: string; b: string; score: number }[];
  unpaired: { id: string; reason: UnpairedReason }[];
  stats: { candidates: number; feasible: number; paired: number; averageScore: number | null };
}

export function assignPairs(
  candidates: AssignCandidate[],
  edges: AssignEdge[],
  options: AssignOptions,
): AssignResult {
  const maxOptions = options.maxOptions ?? 40;
  const ordered = [...candidates].sort(
    (x, y) => x.signedUpAt.localeCompare(y.signedUpAt) || x.id.localeCompare(y.id),
  );
  const index = new Map(ordered.map((c, i) => [c.id, i]));
  const n = ordered.length;

  // One undirected edge per pair; drop anything outside the pool or self-loops.
  const unique = new Map<string, AssignEdge>();
  const hasAnyEdge = new Set<string>();
  for (const e of edges) {
    if (e.a === e.b || !index.has(e.a) || !index.has(e.b)) continue;
    hasAnyEdge.add(e.a);
    hasAnyEdge.add(e.b);
    if (e.score < options.minScore) continue;
    const [a, b] = index.get(e.a)! < index.get(e.b)! ? [e.a, e.b] : [e.b, e.a];
    const key = `${a}|${b}`;
    const existing = unique.get(key);
    if (!existing || e.score > existing.score) unique.set(key, { a, b, score: e.score });
  }

  // Each student's top options; an edge survives if it's in either endpoint's list.
  const byVertex = new Map<string, AssignEdge[]>();
  for (const e of unique.values()) {
    for (const v of [e.a, e.b]) {
      const list = byVertex.get(v) ?? [];
      list.push(e);
      byVertex.set(v, list);
    }
  }
  const kept = new Set<AssignEdge>();
  for (const [v, list] of byVertex) {
    list
      .sort((x, y) => y.score - x.score || partnerRank(x, v) - partnerRank(y, v))
      .slice(0, maxOptions)
      .forEach((e) => kept.add(e));
  }
  function partnerRank(e: AssignEdge, v: string) {
    return index.get(e.a === v ? e.b : e.a)!;
  }

  // Score dominates; the tie-break bonus can never add up to a single score point.
  const M = n * n + 1;
  const keptEdges = [...kept].sort(
    (x, y) => index.get(x.a)! - index.get(y.a)! || index.get(x.b)! - index.get(y.b)!,
  );
  const weighted: Edge[] = keptEdges.map((e) => {
    const bonus = n - index.get(e.a)! + (n - index.get(e.b)!);
    return [index.get(e.a)!, index.get(e.b)!, e.score * M + bonus];
  });
  const mate = weighted.length > 0 ? maxWeightMatching(weighted, true) : [];

  const scoreOf = new Map(keptEdges.map((e) => [`${e.a}|${e.b}`, e.score]));
  const pairs: AssignResult["pairs"] = [];
  const paired = new Set<string>();
  mate.forEach((m, v) => {
    if (m > v) {
      const a = ordered[v].id;
      const b = ordered[m].id;
      pairs.push({ a, b, score: scoreOf.get(`${a}|${b}`)! });
      paired.add(a);
      paired.add(b);
    }
  });

  const unpaired = ordered
    .filter((c) => !paired.has(c.id))
    .map((c) => ({
      id: c.id,
      reason: (!hasAnyEdge.has(c.id)
        ? "no_partner"
        : byVertex.has(c.id)
          ? "odd_one_out"
          : "below_min") as UnpairedReason,
    }));

  return {
    pairs,
    unpaired,
    stats: {
      candidates: n,
      feasible: byVertex.size,
      paired: paired.size,
      averageScore: pairs.length
        ? Math.round(pairs.reduce((s, p) => s + p.score, 0) / pairs.length)
        : null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Groups of 3–4 (1.C): greedy seeding, then pairwise swaps that raise the total.
// ─────────────────────────────────────────────────────────────────────────────

export interface GroupOptions {
  size: 3 | 4;
  /** Every pair inside a group must reach this mutual score. */
  minScore: number;
  /** Swap passes for larger pools; each tries every member swap between every two groups. */
  maxPasses?: number;
}

export interface GroupResult {
  groups: { members: string[]; score: number; minScore: number }[];
  unpaired: { id: string; reason: UnpairedReason }[];
  stats: { candidates: number; feasible: number; paired: number; averageScore: number | null };
}

/**
 * Proposes groups where every pair is compatible (≥ minScore), maximising the number of
 * students placed and then the sum of pairwise scores. Up to 12 students the search is exact;
 * beyond that, greedy passes (hardest-first and sign-up order) improved by member swaps, keeping
 * the best. Deterministic, ties broken by earlier sign-up.
 */
export function assignGroups(
  candidates: AssignCandidate[],
  edges: AssignEdge[],
  options: GroupOptions,
): GroupResult {
  const ordered = [...candidates].sort(
    (x, y) => x.signedUpAt.localeCompare(y.signedUpAt) || x.id.localeCompare(y.id),
  );
  const rank = new Map(ordered.map((c, i) => [c.id, i]));
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const score = new Map<string, number>();
  const anyEdge = new Set<string>();
  const neighbours = new Map<string, Set<string>>(ordered.map((c) => [c.id, new Set<string>()]));
  for (const e of edges) {
    if (e.a === e.b || !rank.has(e.a) || !rank.has(e.b)) continue;
    anyEdge.add(e.a);
    anyEdge.add(e.b);
    if (e.score < options.minScore) continue;
    const k = key(e.a, e.b);
    if ((score.get(k) ?? -1) < e.score) score.set(k, e.score);
    neighbours.get(e.a)!.add(e.b);
    neighbours.get(e.b)!.add(e.a);
  }
  const fit = (a: string, b: string) => score.get(key(a, b));
  const compatible = (member: string, group: string[]) =>
    group.every((g) => fit(member, g) !== undefined);
  const total = (group: string[]) =>
    group.reduce((s, a, i) => s + group.slice(i + 1).reduce((t, b) => t + (fit(a, b) ?? 0), 0), 0);

  const totalOf = (gs: string[][]) => gs.reduce((s, g) => s + total(g), 0);
  const better = (a: string[][], b: string[][] | null) =>
    !b || a.length > b.length || (a.length === b.length && totalOf(a) > totalOf(b));

  /** Exact search for small pools: the best partition by students placed, then total score. */
  function exact(): string[][] {
    const ids = ordered.map((c) => c.id);
    let best: string[][] = [];
    const used = new Set<string>();
    const current: string[][] = [];
    const combos = (pool: string[], k: number, from = 0, acc: string[] = []): string[][] =>
      acc.length === k
        ? [acc]
        : pool.slice(from).flatMap((x, i) => combos(pool, k, from + i + 1, [...acc, x]));
    const go = () => {
      if (better(current, best)) best = current.map((g) => [...g]);
      const free = ids.filter((id) => !used.has(id));
      if (free.length < options.size) return;
      const first = free[0];
      used.add(first);
      go();
      for (const rest of combos(
        free.slice(1).filter((x) => neighbours.get(first)!.has(x)),
        options.size - 1,
      )) {
        const group = [first, ...rest];
        if (!group.every((a, i) => group.slice(i + 1).every((b) => fit(a, b) !== undefined)))
          continue;
        rest.forEach((r) => used.add(r));
        current.push(group);
        go();
        current.pop();
        rest.forEach((r) => used.delete(r));
      }
      used.delete(first);
    };
    go();
    return best;
  }

  /** One greedy pass: seeds in the given order, each grown by the given preference. */
  function greedy(seedOrder: string[], prefer: "score" | "scarce"): string[][] {
    const used = new Set<string>();
    const out: string[][] = [];
    const remaining = (id: string) => [...neighbours.get(id)!].filter((n) => !used.has(n)).length;
    for (const seed of seedOrder) {
      if (used.has(seed) || neighbours.get(seed)!.size < options.size - 1) continue;
      const group = [seed];
      while (group.length < options.size) {
        let best: string | null = null;
        let bestKey: [number, number, number] = [-Infinity, -Infinity, -Infinity];
        for (const cand of neighbours.get(seed)!) {
          if (used.has(cand) || group.includes(cand) || !compatible(cand, group)) continue;
          const gain = group.reduce((s, g) => s + fit(cand, g)!, 0);
          const k: [number, number, number] =
            prefer === "score"
              ? [gain, -remaining(cand), -rank.get(cand)!]
              : [-remaining(cand), gain, -rank.get(cand)!];
          if (
            k[0] > bestKey[0] ||
            (k[0] === bestKey[0] &&
              (k[1] > bestKey[1] || (k[1] === bestKey[1] && k[2] > bestKey[2])))
          ) {
            best = cand;
            bestKey = k;
          }
        }
        if (!best) break;
        group.push(best);
      }
      if (group.length === options.size) {
        group.forEach((m) => used.add(m));
        out.push(group);
      }
    }
    return out;
  }

  /** Swap one member between two groups, or bring in an unplaced student, while the total rises. */
  function improve(start: string[][], passes: number): string[][] {
    const groups = start.map((g) => [...g]);
    const used = new Set(groups.flat());
    for (let pass = 0; pass < passes; pass++) {
      let improved = false;
      for (let gi = 0; gi < groups.length; gi++) {
        for (let gj = gi + 1; gj < groups.length; gj++) {
          for (let i = 0; i < groups[gi].length; i++) {
            for (let j = 0; j < groups[gj].length; j++) {
              const a = groups[gi][i];
              const b = groups[gj][j];
              const restA = groups[gi].filter((_, k) => k !== i);
              const restB = groups[gj].filter((_, k) => k !== j);
              if (!compatible(b, restA) || !compatible(a, restB)) continue;
              if (
                total([...restA, b]) + total([...restB, a]) >
                total(groups[gi]) + total(groups[gj])
              ) {
                groups[gi] = [...restA, b];
                groups[gj] = [...restB, a];
                improved = true;
              }
            }
          }
        }
        for (let i = 0; i < groups[gi].length; i++) {
          for (const c of ordered) {
            if (used.has(c.id)) continue;
            const rest = groups[gi].filter((_, k) => k !== i);
            if (!compatible(c.id, rest) || total([...rest, c.id]) <= total(groups[gi])) continue;
            used.delete(groups[gi][i]);
            used.add(c.id);
            groups[gi] = [...rest, c.id];
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
    return groups;
  }

  let groups: string[][];
  if (ordered.length <= 12) {
    groups = exact();
  } else {
    const byRank = ordered.map((c) => c.id);
    const hardest = [...byRank].sort(
      (x, y) => neighbours.get(x)!.size - neighbours.get(y)!.size || rank.get(x)! - rank.get(y)!,
    );
    const passes = options.maxPasses ?? (ordered.length > 500 ? 4 : 25);
    let best: string[][] | null = null;
    for (const order of [hardest, byRank]) {
      for (const prefer of ["scarce", "score"] as const) {
        const candidate = improve(greedy(order, prefer), passes);
        if (better(candidate, best)) best = candidate;
      }
    }
    groups = best ?? [];
  }

  const result = groups
    .map((g) => {
      const members = [...g].sort((x, y) => rank.get(x)! - rank.get(y)!);
      const pairs = members.flatMap((a, i) => members.slice(i + 1).map((b) => fit(a, b)!));
      return {
        members,
        score: Math.round(pairs.reduce((s, v) => s + v, 0) / pairs.length),
        minScore: Math.min(...pairs),
      };
    })
    .sort((x, y) => rank.get(x.members[0])! - rank.get(y.members[0])!);
  const placed = new Set(result.flatMap((g) => g.members));
  const unpaired = ordered
    .filter((c) => !placed.has(c.id))
    .map((c) => ({
      id: c.id,
      reason: (!anyEdge.has(c.id)
        ? "no_partner"
        : neighbours.get(c.id)!.size >= options.size - 1
          ? "odd_one_out"
          : "below_min") as UnpairedReason,
    }));
  return {
    groups: result,
    unpaired,
    stats: {
      candidates: ordered.length,
      feasible: [...neighbours.values()].filter((s) => s.size >= options.size - 1).length,
      paired: placed.size,
      averageScore: result.length
        ? Math.round(result.reduce((s, g) => s + g.score, 0) / result.length)
        : null,
    },
  };
}
