import { describe, expect, it } from "vitest";
import {
  calculateEqualSplits,
  computeGroupBalances,
  type ExpenseItem,
  type SettlementItem,
} from "./balances";

describe("expenses and balance math", () => {
  it("property test: calculateEqualSplits sum always strictly equals amountCents", () => {
    // Test across hundreds of random dollar amounts and group sizes
    const testAmounts = [1, 2, 3, 5, 10, 33, 99, 100, 1001, 2345, 9999, 123456];
    const groupSizes = [1, 2, 3, 4, 5, 6, 8];

    for (const amt of testAmounts) {
      for (const size of groupSizes) {
        const userIds = Array.from({ length: size }, (_, i) => `user-${i + 1}`);
        const payerId = userIds[0];
        const splits = calculateEqualSplits(amt, userIds, payerId);

        const sum = splits.reduce((acc, s) => acc + s.shareCents, 0);
        expect(sum).toBe(amt);
      }
    }
  });

  it("property test: net balances across all group members always sum to zero", () => {
    const memberIds = ["alice", "bob", "carol", "dave"];

    const expenses: ExpenseItem[] = [
      {
        id: "exp-1",
        payerId: "alice",
        amountCents: 6000, // $60.00
        description: "Groceries and spices",
        splits: [
          { userId: "alice", shareCents: 1500 },
          { userId: "bob", shareCents: 1500 },
          { userId: "carol", shareCents: 1500 },
          { userId: "dave", shareCents: 1500 },
        ],
      },
      {
        id: "exp-2",
        payerId: "bob",
        amountCents: 3001, // $30.01 (odd cents remainder handled)
        description: "Dish soap & paper towels",
        splits: calculateEqualSplits(3001, memberIds, "bob"),
      },
    ];

    const settlements: SettlementItem[] = [
      {
        id: "set-1",
        payerId: "dave",
        receiverId: "alice",
        amountCents: 1500,
      },
    ];

    const { balances, netSum, suggestedSettlements } = computeGroupBalances(
      memberIds,
      expenses,
      settlements,
    );

    // INVARIANT: sum must strictly equal 0
    expect(netSum).toBe(0);

    // Verify individual calculations:
    // Alice paid 6000, share was 1500 + 750 = 2250, received settlement 1500
    // Net = (6000 - 2250) + (0 - 1500) = 2250
    expect(balances.alice.paidCents).toBe(6000);
    expect(balances.alice.settledReceivedCents).toBe(1500);

    // Check that suggested settlements exist and are non-empty
    expect(suggestedSettlements.length).toBeGreaterThan(0);
  });

  it("ignores soft-deleted expenses when calculating balances", () => {
    const memberIds = ["u1", "u2"];
    const expenses: ExpenseItem[] = [
      {
        id: "exp-del",
        payerId: "u1",
        amountCents: 5000,
        description: "Mistake entry",
        deletedAt: "2026-11-03T10:00:00Z",
        splits: [
          { userId: "u1", shareCents: 2500 },
          { userId: "u2", shareCents: 2500 },
        ],
      },
    ];

    const { balances, netSum } = computeGroupBalances(memberIds, expenses, []);
    expect(netSum).toBe(0);
    expect(balances.u1.netCents).toBe(0);
    expect(balances.u2.netCents).toBe(0);
  });

  it("property: for 500 random rooms, balances sum to zero and the suggested settle-ups clear them", () => {
    // Deterministic PRNG (mulberry32) so a failure is reproducible.
    let seed = 0x5eed;
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]!;
    for (let run = 0; run < 500; run++) {
      const members = ["a", "b", "c", "d"].slice(0, 2 + Math.floor(rand() * 3));
      const everyone = [...members, "left"]; // someone who has since left the room
      const expenses: ExpenseItem[] = Array.from({ length: Math.floor(rand() * 8) }, (_, i) => {
        const amount = 1 + Math.floor(rand() * 50_000);
        const payer = pick(everyone);
        return { id: `e${i}`, payerId: payer, amountCents: amount, description: "x", deletedAt: rand() < 0.1 ? "2026-11-01T00:00:00Z" : null, splits: calculateEqualSplits(amount, everyone, payer) };
      });
      const settlements: SettlementItem[] = Array.from({ length: Math.floor(rand() * 4) }, (_, i) => {
        const payer = pick(everyone);
        const receiver = pick(everyone.filter((m) => m !== payer));
        return { id: `s${i}`, payerId: payer, receiverId: receiver, amountCents: 1 + Math.floor(rand() * 10_000) };
      });
      const { balances, netSum, suggestedSettlements } = computeGroupBalances(members, expenses, settlements);
      expect(netSum).toBe(0);
      const after = Object.fromEntries(Object.values(balances).map((b) => [b.userId, b.netCents]));
      for (const s of suggestedSettlements) {
        after[s.fromUserId]! += s.amountCents;
        after[s.toUserId]! -= s.amountCents;
      }
      expect(Object.values(after).every((v) => v === 0)).toBe(true);
    }
  });
});
