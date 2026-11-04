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
