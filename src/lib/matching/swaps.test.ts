import { describe, expect, it } from "vitest";
import {
  findSwapCycles,
  MIN_SWAP_IMPROVEMENT_DELTA,
  type PairCompatibilityLookup,
  type SwapCandidate,
} from "./swaps";

describe("smart room-swap cycle finder", () => {
  it("finds a mutual 2-way room swap where both improve by >= 10 points", () => {
    // Student 1 lives with RM-1, current score 55
    // Student 2 lives with RM-2, current score 60
    // If Student 1 rooms with RM-2 -> score 85 (+30)
    // If Student 2 rooms with RM-1 -> score 80 (+20)
    const candidates: SwapCandidate[] = [
      {
        userId: "student-1",
        assignmentId: "asgn-1",
        building: "Hassayampa Hall",
        currentRoommateId: "rm-1",
        currentScore: 55,
      },
      {
        userId: "student-2",
        assignmentId: "asgn-2",
        building: "Hassayampa Hall",
        currentRoommateId: "rm-2",
        currentScore: 60,
      },
    ];

    const compatibilityTable: Record<string, number> = {
      "student-1:rm-2": 85,
      "student-2:rm-1": 80,
    };

    const lookup: PairCompatibilityLookup = (studentId, roommateId) => {
      const score = compatibilityTable[`${studentId}:${roommateId}`] ?? 40;
      return { score, isFeasible: true };
    };

    const cycles = findSwapCycles(candidates, lookup);

    expect(cycles).toHaveLength(1);
    expect(cycles[0].cycle).toEqual(["student-1", "student-2"]);
    expect(cycles[0].scores["student-1"].delta).toBe(30);
    expect(cycles[0].scores["student-2"].delta).toBe(20);
    expect(cycles[0].averageDelta).toBe(25);
  });

  it("finds a 3-way circular swap (A -> B -> C -> A)", () => {
    const candidates: SwapCandidate[] = [
      {
        userId: "a",
        assignmentId: "as-a",
        building: "Barrett",
        currentRoommateId: "rm-a",
        currentScore: 50,
      },
      {
        userId: "b",
        assignmentId: "as-b",
        building: "Barrett",
        currentRoommateId: "rm-b",
        currentScore: 52,
      },
      {
        userId: "c",
        assignmentId: "as-c",
        building: "Barrett",
        currentRoommateId: "rm-c",
        currentScore: 55,
      },
    ];

    const compatibilityTable: Record<string, number> = {
      "a:rm-b": 80, // delta +30
      "b:rm-c": 82, // delta +30
      "c:rm-a": 85, // delta +30
    };

    const lookup: PairCompatibilityLookup = (studentId, roommateId) => {
      const score = compatibilityTable[`${studentId}:${roommateId}`] ?? 40;
      return { score, isFeasible: true };
    };

    const cycles = findSwapCycles(candidates, lookup);

    expect(cycles).toHaveLength(1);
    expect(cycles[0].cycle).toEqual(["a", "b", "c"]);
    expect(cycles[0].scores.a.delta).toBe(30);
    expect(cycles[0].scores.b.delta).toBe(30);
    expect(cycles[0].scores.c.delta).toBe(30);
    expect(cycles[0].averageDelta).toBe(30);
  });

  it("strictly enforces MIN_SWAP_IMPROVEMENT_DELTA (rejects delta < 10)", () => {
    const candidates: SwapCandidate[] = [
      {
        userId: "a",
        assignmentId: "as-a",
        building: "Manzanita",
        currentRoommateId: "rm-a",
        currentScore: 70,
      },
      {
        userId: "b",
        assignmentId: "as-b",
        building: "Manzanita",
        currentRoommateId: "rm-b",
        currentScore: 70,
      },
    ];

    // Only +5 improvement (below 10)
    const lookup: PairCompatibilityLookup = () => ({
      score: 75,
      isFeasible: true,
    });

    const cycles = findSwapCycles(candidates, lookup);
    expect(cycles).toHaveLength(0);
  });

  it("rejects moves that fail building or hard filter feasibility", () => {
    const candidates: SwapCandidate[] = [
      {
        userId: "a",
        assignmentId: "as-a",
        building: "Hall A",
        currentRoommateId: "rm-a",
        currentScore: 50,
      },
      {
        userId: "b",
        assignmentId: "as-b",
        building: "Hall B",
        currentRoommateId: "rm-b",
        currentScore: 50,
      },
    ];

    // Infeasible (e.g. incompatible building or dealbreaker)
    const lookup: PairCompatibilityLookup = () => ({
      score: 95,
      isFeasible: false,
    });

    const cycles = findSwapCycles(candidates, lookup);
    expect(cycles).toHaveLength(0);
  });
});
