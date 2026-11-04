/**
 * Smart room swaps (Phase 5.1). Pure.
 *
 * Each candidate has asked for a room change, opted into the pool, and lives in a room with
 * one roommate who stays put. A 2-way swap moves A into B's room and B into A's; a 3-way
 * cycle moves A→B's room, B→C's, C→A's. A cycle is proposed only when:
 *  - every mover's score with their new roommate beats their current score by `minDelta`;
 *  - every pair is feasible (both directions pass hard filters, i.e. a mutual score exists);
 *  - no staying roommate ends up with a lower score than they have now.
 * So no proposal ever lowers anyone's score.
 */

export const MIN_SWAP_IMPROVEMENT_DELTA = 10;

export interface SwapCandidate {
  userId: string;
  assignmentId: string;
  /** The person who stays in this candidate's room. */
  roommateId: string;
  /** Candidate ↔ current roommate. */
  currentScore: number;
}

/** Mutual score for a pair, or null when a hard filter rules them out. */
export type Compatibility = (a: string, b: string) => number | null;

export interface SwapMove {
  /** The candidate whose room this mover moves into. */
  toRoomOf: string;
  newRoommateId: string;
  currentScore: number;
  newScore: number;
}

export interface SwapCycle {
  /** cycle[i] moves into the room of cycle[(i + 1) % n]. */
  cycle: string[];
  moves: Record<string, SwapMove>;
  /** Staying roommate → their score with the person moving in. */
  stayers: Record<string, { currentScore: number; newScore: number }>;
  averageDelta: number;
}

function evaluate(
  order: SwapCandidate[],
  compat: Compatibility,
  minDelta: number,
): SwapCycle | null {
  const moves: Record<string, SwapMove> = {};
  const stayers: Record<string, { currentScore: number; newScore: number }> = {};
  let total = 0;
  for (let i = 0; i < order.length; i++) {
    const mover = order[i]!;
    const target = order[(i + 1) % order.length]!;
    const score = compat(mover.userId, target.roommateId);
    if (score === null || score - mover.currentScore < minDelta) return null;
    // The staying roommate in the target room swaps target for mover.
    if (score < target.currentScore) return null;
    moves[mover.userId] = {
      toRoomOf: target.userId,
      newRoommateId: target.roommateId,
      currentScore: mover.currentScore,
      newScore: score,
    };
    stayers[target.roommateId] = { currentScore: target.currentScore, newScore: score };
    total += score - mover.currentScore;
  }
  return {
    cycle: order.map((c) => c.userId),
    moves,
    stayers,
    averageDelta: Math.round((total / order.length) * 10) / 10,
  };
}

/** Distinct rooms only: two candidates who share a room can't swap with each other. */
function distinctRooms(list: SwapCandidate[]) {
  const people = new Set<string>();
  for (const c of list) {
    if (people.has(c.userId) || people.has(c.roommateId)) return false;
    people.add(c.userId);
    people.add(c.roommateId);
  }
  return true;
}

export function findSwapCycles(
  candidates: SwapCandidate[],
  compat: Compatibility,
  minDelta = MIN_SWAP_IMPROVEMENT_DELTA,
): SwapCycle[] {
  const n = candidates.length;
  // Valid single moves first, so the 3-way search only follows real edges.
  const edge = (a: number, b: number) => {
    const score = compat(candidates[a]!.userId, candidates[b]!.roommateId);
    return (
      score !== null &&
      score - candidates[a]!.currentScore >= minDelta &&
      score >= candidates[b]!.currentScore
    );
  };
  const out = new Map<number, number[]>();
  for (let a = 0; a < n; a++)
    out.set(
      a,
      [...Array(n).keys()].filter((b) => b !== a && edge(a, b)),
    );

  const results: SwapCycle[] = [];
  const seen = new Set<string>();
  const add = (idx: number[]) => {
    const list = idx.map((i) => candidates[i]!);
    if (!distinctRooms(list)) return;
    // Rotations of a cycle are the same cycle; the reverse direction is a different one.
    const rotationKey = (() => {
      const ids = list.map((c) => c.userId);
      const start = ids.indexOf([...ids].sort()[0]!);
      return [...ids.slice(start), ...ids.slice(0, start)].join(">");
    })();
    if (seen.has(rotationKey)) return;
    const cycle = evaluate(list, compat, minDelta);
    if (cycle) {
      seen.add(rotationKey);
      results.push(cycle);
    }
  };
  for (let a = 0; a < n; a++) {
    for (const b of out.get(a)!) {
      if (b > a && out.get(b)!.includes(a)) add([a, b]);
      for (const c of out.get(b)!) {
        if (c !== a && out.get(c)!.includes(a)) add([a, b, c]);
      }
    }
  }
  return results.sort(
    (x, y) => y.averageDelta - x.averageDelta || x.cycle.join().localeCompare(y.cycle.join()),
  );
}

/**
 * Picks non-overlapping cycles, best average improvement first, so nobody appears in two
 * live proposals.
 */
export function pickDisjoint(cycles: SwapCycle[]): SwapCycle[] {
  const used = new Set<string>();
  const chosen: SwapCycle[] = [];
  for (const c of cycles) {
    const people = [...c.cycle, ...Object.keys(c.stayers)];
    if (people.some((p) => used.has(p))) continue;
    people.forEach((p) => used.add(p));
    chosen.push(c);
  }
  return chosen;
}

/** Brute force over every ordered 2- and 3-tuple, for tests. */
export function bruteForceSwapCycles(
  candidates: SwapCandidate[],
  compat: Compatibility,
  minDelta = MIN_SWAP_IMPROVEMENT_DELTA,
): string[] {
  const found = new Set<string>();
  const n = candidates.length;
  const canon = (ids: string[]) => {
    const start = ids.indexOf([...ids].sort()[0]!);
    return [...ids.slice(start), ...ids.slice(0, start)].join(">");
  };
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++) {
      if (b === a) continue;
      const pair = [candidates[a]!, candidates[b]!];
      if (distinctRooms(pair) && evaluate(pair, compat, minDelta))
        found.add(canon(pair.map((c) => c.userId)));
      for (let c = 0; c < n; c++) {
        if (c === a || c === b) continue;
        const triple = [candidates[a]!, candidates[b]!, candidates[c]!];
        if (distinctRooms(triple) && evaluate(triple, compat, minDelta))
          found.add(canon(triple.map((x) => x.userId)));
      }
    }
  return [...found].sort();
}
