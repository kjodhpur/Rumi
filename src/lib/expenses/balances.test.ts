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
});
