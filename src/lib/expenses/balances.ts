export interface ExpenseSplitItem {
  userId: string;
  shareCents: number;
  settledAt?: string | null;
}

export interface ExpenseItem {
  id: string;
  payerId: string;
  amountCents: number;
  description: string;
  deletedAt?: string | null;
  splits: ExpenseSplitItem[];
}

export interface SettlementItem {
  id: string;
  payerId: string;
  receiverId: string;
  amountCents: number;
}

export interface MemberBalance {
  userId: string;
  paidCents: number;
  shareCents: number;
  settledPaidCents: number;
  settledReceivedCents: number;
  netCents: number; // positive = owed money; negative = owes money
}

export interface SuggestedSettlement {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

/**
 * Calculates equal splits of amountCents across userIds.
 * Guaranteed invariant: the sum of all shareCents exactly equals amountCents.
 * Any non-zero remainder cents are attributed to the payerId.
 */
export function calculateEqualSplits(
  amountCents: number,
  userIds: string[],
  payerId: string,
): ExpenseSplitItem[] {
  if (userIds.length === 0) return [];
  if (amountCents <= 0) {
    return userIds.map((userId) => ({ userId, shareCents: 0 }));
  }

  const n = userIds.length;
  const baseShare = Math.floor(amountCents / n);
  const remainder = amountCents % n;

  return userIds.map((userId) => {
    // If there is remainder, give extra cent to the payer (or first participant)
    const isRemainderRecipient =
      userId === payerId || (!userIds.includes(payerId) && userId === userIds[0]);
    const extra = isRemainderRecipient ? remainder : 0;
    return {
      userId,
      shareCents: baseShare + extra,
    };
  });
}

/**
 * Computes net balances for all group members across active expenses and settlements.
 *
 * Invariant:
 * The sum of all member netCents is guaranteed to be 0 at all times.
 */
export function computeGroupBalances(
  memberIds: string[],
  expenses: ExpenseItem[],
  settlements: SettlementItem[],
): {
  balances: Record<string, MemberBalance>;
  netSum: number;
  suggestedSettlements: SuggestedSettlement[];
} {
  const balances: Record<string, MemberBalance> = {};

  for (const mid of memberIds) {
    balances[mid] = {
      userId: mid,
      paidCents: 0,
      shareCents: 0,
      settledPaidCents: 0,
      settledReceivedCents: 0,
      netCents: 0,
    };
  }

  // 1. Process active expenses
  for (const exp of expenses) {
    if (exp.deletedAt) continue;

    if (!balances[exp.payerId]) {
      balances[exp.payerId] = {
        userId: exp.payerId,
        paidCents: 0,
        shareCents: 0,
        settledPaidCents: 0,
        settledReceivedCents: 0,
        netCents: 0,
      };
    }
    balances[exp.payerId].paidCents += exp.amountCents;

    for (const split of exp.splits) {
      if (!balances[split.userId]) {
        balances[split.userId] = {
          userId: split.userId,
          paidCents: 0,
          shareCents: 0,
          settledPaidCents: 0,
          settledReceivedCents: 0,
          netCents: 0,
        };
      }
      balances[split.userId].shareCents += split.shareCents;
    }
  }

  // 2. Process settlements (including people who have since left, so the sum stays zero)
  const ensure = (userId: string) =>
    (balances[userId] ??= { userId, paidCents: 0, shareCents: 0, settledPaidCents: 0, settledReceivedCents: 0, netCents: 0 });
  for (const s of settlements) {
    ensure(s.payerId).settledPaidCents += s.amountCents;
    ensure(s.receiverId).settledReceivedCents += s.amountCents;
  }

  // 3. Compute net balances:
  // net = (paid - share) + (settledPaid - settledReceived)
  // Positive = person paid more than their share -> they are owed money.
  // Negative = person owes money.
  let netSum = 0;
  for (const b of Object.values(balances)) {
    b.netCents = b.paidCents - b.shareCents + (b.settledPaidCents - b.settledReceivedCents);
    netSum += b.netCents;
  }

  // 4. Compute optimal settlements using greedy algorithm
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const b of Object.values(balances)) {
    if (b.netCents < 0) {
      debtors.push({ userId: b.userId, amount: -b.netCents });
    } else if (b.netCents > 0) {
      creditors.push({ userId: b.userId, amount: b.netCents });
    }
  }

  const suggestedSettlements: SuggestedSettlement[] = [];

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transferAmount = Math.min(debtor.amount, creditor.amount);
    if (transferAmount > 0) {
      suggestedSettlements.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountCents: transferAmount,
      });

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;
    }

    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }

  return {
    balances,
    netSum,
    suggestedSettlements,
  };
}
