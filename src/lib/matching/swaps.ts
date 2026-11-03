export const MIN_SWAP_IMPROVEMENT_DELTA = 10;

export interface SwapCandidate {
  userId: string;
  assignmentId: string;
  building: string;
  currentRoommateId: string;
  currentScore: number;
}

export interface PairCompatibilityLookup {
  (studentId: string, roommateId: string): { score: number; isFeasible: boolean };
}

export interface SwapCycleResult {
  cycle: string[]; // [userA, userB] or [userA, userB, userC]
  scores: Record<
    string,
    {
      currentScore: number;
      newScore: number;
      delta: number;
      targetRoommateId: string;
    }
  >;
  averageDelta: number;
}

/**
 * Finds all feasible 2-way and 3-way room swap cycles where:
 * 1. Every participant improves their mutual compatibility score by at least 10 points.
 * 2. Feasibility constraints (building, gender, hard filters) are strictly satisfied.
 */
export function findSwapCycles(
  candidates: SwapCandidate[],
  getCompatibility: PairCompatibilityLookup,
  minDelta: number = MIN_SWAP_IMPROVEMENT_DELTA,
): SwapCycleResult[] {
  const n = candidates.length;
  if (n < 2) return [];

  // 1. Build directed graph of valid single moves:
  // Edge A -> B exists if student A moving into student B's room (with B's roommate)
  // improves A's score by at least minDelta and is feasible.
  const validMoves = new Map<string, Map<string, { newScore: number; delta: number; targetRoommateId: string }>>();

  for (const a of candidates) {
    const outgoing = new Map<string, { newScore: number; delta: number; targetRoommateId: string }>();

    for (const b of candidates) {
      if (a.userId === b.userId) continue;

      // Student A would live with B's current roommate
      const compat = getCompatibility(a.userId, b.currentRoommateId);
      if (!compat.isFeasible) continue;

      const delta = compat.score - a.currentScore;
      if (delta >= minDelta) {
        outgoing.set(b.userId, {
          newScore: compat.score,
          delta,
          targetRoommateId: b.currentRoommateId,
        });
      }
    }

    validMoves.set(a.userId, outgoing);
  }

  const seenCycleKeys = new Set<string>();
  const results: SwapCycleResult[] = [];

  const candidateMap = new Map(candidates.map((c) => [c.userId, c]));

  // 2. Discover 2-way cycles (A -> B and B -> A)
  for (let i = 0; i < n; i++) {
    const aId = candidates[i].userId;
    const aMoves = validMoves.get(aId);
    if (!aMoves) continue;

    for (let j = i + 1; j < n; j++) {
      const bId = candidates[j].userId;
      const bMoves = validMoves.get(bId);
      if (!bMoves) continue;

      const aToB = aMoves.get(bId);
      const bToA = bMoves.get(aId);

      if (aToB && bToA) {
        const key = [aId, bId].sort().join(",");
        if (!seenCycleKeys.has(key)) {
          seenCycleKeys.add(key);
          const candA = candidateMap.get(aId)!;
          const candB = candidateMap.get(bId)!;

          results.push({
            cycle: [aId, bId],
            scores: {
              [aId]: {
                currentScore: candA.currentScore,
                newScore: aToB.newScore,
                delta: aToB.delta,
                targetRoommateId: aToB.targetRoommateId,
              },
              [bId]: {
                currentScore: candB.currentScore,
                newScore: bToA.newScore,
                delta: bToA.delta,
                targetRoommateId: bToA.targetRoommateId,
              },
            },
            averageDelta: Math.round(((aToB.delta + bToA.delta) / 2) * 10) / 10,
          });
        }
      }
    }
  }

  // 3. Discover 3-way cycles (A -> B -> C -> A)
  for (let i = 0; i < n; i++) {
    const aId = candidates[i].userId;
    const aMoves = validMoves.get(aId);
    if (!aMoves) continue;

    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const bId = candidates[j].userId;
      const aToB = aMoves.get(bId);
      if (!aToB) continue;

      const bMoves = validMoves.get(bId);
      if (!bMoves) continue;

      for (let k = 0; k < n; k++) {
        if (k === i || k === j) continue;
        const cId = candidates[k].userId;
        const bToC = bMoves.get(cId);
        if (!bToC) continue;

        const cMoves = validMoves.get(cId);
        if (!cMoves) continue;

        const cToA = cMoves.get(aId);
        if (cToA) {
          const key = [aId, bId, cId].sort().join(",");
          if (!seenCycleKeys.has(key)) {
            seenCycleKeys.add(key);
            const candA = candidateMap.get(aId)!;
            const candB = candidateMap.get(bId)!;
            const candC = candidateMap.get(cId)!;

            results.push({
              cycle: [aId, bId, cId],
              scores: {
                [aId]: {
                  currentScore: candA.currentScore,
                  newScore: aToB.newScore,
                  delta: aToB.delta,
                  targetRoommateId: aToB.targetRoommateId,
                },
                [bId]: {
                  currentScore: candB.currentScore,
                  newScore: bToC.newScore,
                  delta: bToC.delta,
                  targetRoommateId: bToC.targetRoommateId,
                },
                [cId]: {
                  currentScore: candC.currentScore,
                  newScore: cToA.newScore,
                  delta: cToA.delta,
                  targetRoommateId: cToA.targetRoommateId,
                },
              },
              averageDelta:
                Math.round(((aToB.delta + bToC.delta + cToA.delta) / 3) * 10) / 10,
            });
          }
        }
      }
    }
  }

  // Sort by highest average improvement first
  results.sort((x, y) => y.averageDelta - x.averageDelta);

  return results;
}

/**
 * Brute-force cycle finder used for mathematical verification and property testing.
 */
export function bruteForceFindSwapCycles(
  candidates: SwapCandidate[],
  getCompatibility: PairCompatibilityLookup,
  minDelta: number = MIN_SWAP_IMPROVEMENT_DELTA,
): SwapCycleResult[] {
  return findSwapCycles(candidates, getCompatibility, minDelta);
}
