"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  Circle,
  Plus,
  DollarSign,
  ShieldAlert,
  Trash2,
  ArrowRight,
  HandCoins,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import type { ChoreCadence } from "@/lib/chores/rotation";
import {
  completeChoreInstance,
  createChore,
  seedDefaultChoresIfEmpty,
} from "@/app/actions/room-chores";
import {
  createExpense,
  deleteExpense,
  recordSettlement,
} from "@/app/actions/room-expenses";

export interface ChoreRecord {
  id: string;
  title: string;
  cadence: ChoreCadence;
  rotation: string[];
  activeInstance?: {
    id: string;
    assignee_id: string;
    due_on: string;
    completed_at: string | null;
  } | null;
}

export interface ExpenseRecord {
  id: string;
  payer_id: string;
  amount_cents: number;
  description: string;
  created_at: string;
  splits: {
    user_id: string;
    share_cents: number;
  }[];
}

export interface MemberSummary {
  id: string;
  firstName: string;
  lastInitial: string;
  avatarUrl: string | null;
}

export interface BalancesSummary {
  netCents: number;
  breakdown: Record<string, number>; // user_id -> netCents
  suggestedSettlements: {
    fromUserId: string;
    toUserId: string;
    amountCents: number;
  }[];
}

interface RoomHomeViewProps {
  groupId: string;
  userId: string;
  members: MemberSummary[];
  chores: ChoreRecord[];
  expenses: ExpenseRecord[];
  balances: BalancesSummary;
}

export function RoomHomeView({
  groupId,
  userId,
  members,
  chores,
  expenses,
  balances,
}: RoomHomeViewProps) {
  const [activeTab, setActiveTab] = React.useState<"chores" | "expenses">("chores");

  // Modals
  const [addChoreOpen, setAddChoreOpen] = React.useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = React.useState(false);
  const [settleOpen, setSettleOpen] = React.useState(false);

  // Chore form
  const [choreTitle, setChoreTitle] = React.useState("");
  const [choreCadence, setChoreCadence] = React.useState<ChoreCadence>("weekly");
  const [isSeeding, setIsSeeding] = React.useState(false);

  // Expense form
  const [expenseDescription, setExpenseDescription] = React.useState("");
  const [expenseAmount, setExpenseAmount] = React.useState("");
  const [splitMode, setSplitMode] = React.useState<"equal" | "custom">("equal");
  const [customSplits, setCustomSplits] = React.useState<Record<string, string>>({});

  // Settle form
  const [settleReceiverId, setSettleReceiverId] = React.useState(
    members.find((m) => m.id !== userId)?.id || "",
  );
  const [settleAmount, setSettleAmount] = React.useState("");
  const [settleNote, setSettleNote] = React.useState("");

  const [loading, setLoading] = React.useState(false);

  const memberMap = React.useMemo(() => {
    const map = new Map<string, MemberSummary>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const memberIds = React.useMemo(() => members.map((m) => m.id), [members]);

  async function handleSeedChores() {
    setIsSeeding(true);
    try {
      const res = await seedDefaultChoresIfEmpty(groupId, memberIds);
      if (res.ok) {
        toast("Default chore wheel created!");
      } else {
        toast("Could not create chores", { description: res.error });
      }
    } finally {
      setIsSeeding(false);
    }
  }

  async function handleCompleteChore(instanceId: string) {
    const res = await completeChoreInstance(groupId, instanceId);
    if (res.ok) {
      toast("Chore marked done! Rotated to next roommate.");
    } else {
      toast("Could not update chore", { description: res.error });
    }
  }

  async function handleCreateChore(e: React.FormEvent) {
    e.preventDefault();
    if (!choreTitle.trim()) return;

    setLoading(true);
    try {
      const res = await createChore(groupId, choreTitle, choreCadence);
      if (res.ok) {
        toast("Chore added to rotation");
        setAddChoreOpen(false);
        setChoreTitle("");
      } else {
        toast("Could not add chore", { description: res.error });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(expenseAmount);
    if (isNaN(dollars) || dollars <= 0) {
      toast("Enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      let custom: { userId: string; amountDollars: number }[] | undefined;
      if (splitMode === "custom") {
        custom = memberIds.map((id) => ({
          userId: id,
          amountDollars: parseFloat(customSplits[id] || "0"),
        }));
      }

      const res = await createExpense({
        groupId,
        description: expenseDescription,
        amountDollars: dollars,
        customSplits: custom,
      });

      if (res.ok) {
        toast("Expense added");
        setAddExpenseOpen(false);
        setExpenseDescription("");
        setExpenseAmount("");
      } else {
        toast("Could not save expense", { description: res.error });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm("Delete this expense? Balances will be recalculated.")) return;
    const res = await deleteExpense(groupId, id);
    if (res.ok) {
      toast("Expense deleted");
    } else {
      toast("Could not delete expense", { description: res.error });
    }
  }

  async function handleSettleUp(e: React.FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(settleAmount);
    if (isNaN(dollars) || dollars <= 0) {
      toast("Enter a valid settlement amount");
      return;
    }

    setLoading(true);
    try {
      const res = await recordSettlement(groupId, settleReceiverId, dollars, settleNote);
      if (res.ok) {
        toast("Settlement recorded");
        setSettleOpen(false);
        setSettleAmount("");
        setSettleNote("");
      } else {
        toast("Could not record settlement", { description: res.error });
      }
    } finally {
      setLoading(false);
    }
  }

  const myNetCents = balances.netCents;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/groups/${groupId}`}
          className="inline-flex items-center gap-1 text-body-sm font-medium text-ink-2 hover:text-ink"
        >
          <ChevronLeft className="size-4" /> Back to room
        </Link>
        <div className="flex items-center gap-2">
          {activeTab === "chores" ? (
            <Button
              size="sm"
              onClick={() => setAddChoreOpen(true)}
              className="inline-flex items-center gap-1.5 bg-accent text-white hover:opacity-90"
            >
              <Plus className="size-4" /> Add chore
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSettleOpen(true)}
              >
                <HandCoins className="mr-1.5 size-3.5 text-accent" /> Settle up
              </Button>
              <Button
                size="sm"
                onClick={() => setAddExpenseOpen(true)}
                className="inline-flex items-center gap-1.5 bg-accent text-white hover:opacity-90"
              >
                <Plus className="size-4" /> Add expense
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h1 className="font-display text-display-md text-ink">Room Chores & Expenses</h1>
        <p className="mt-1 text-body-sm text-ink-2">
          Rotating responsibilities and transparent, zero-sum shared expenses.
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab("chores")}
          className={`pb-3 text-body-sm font-semibold transition-colors ${
            activeTab === "chores"
              ? "border-b-2 border-accent text-accent"
              : "text-ink-2 hover:text-ink"
          } mr-6`}
        >
          Chores ({chores.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`pb-3 text-body-sm font-semibold transition-colors ${
            activeTab === "expenses"
              ? "border-b-2 border-accent text-accent"
              : "text-ink-2 hover:text-ink"
          }`}
        >
          Expenses ({expenses.length})
        </button>
      </div>

      {/* Chores View */}
      {activeTab === "chores" ? (
        <div className="mt-6 space-y-4">
          {chores.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-8 text-center text-ink-2">
              <Sparkles className="mx-auto size-8 text-accent" />
              <p className="mt-2 text-body font-semibold text-ink">No chores set up yet</p>
              <p className="mt-1 text-caption text-ink-3">
                Seed a standard roommate rotation wheel for trash, kitchen, bathroom, and floors.
              </p>
              <Button
                className="mt-4 bg-accent text-white hover:opacity-90"
                size="sm"
                onClick={handleSeedChores}
                disabled={isSeeding}
              >
                {isSeeding ? "Setting up..." : "Generate chore wheel"}
              </Button>
            </div>
          ) : (
            chores.map((chore) => {
              const inst = chore.activeInstance;
              const isCompleted = !!inst?.completed_at;
              const assignee = inst ? memberMap.get(inst.assignee_id) : null;
              const isMyTurn = inst?.assignee_id === userId && !isCompleted;

              return (
                <div
                  key={chore.id}
                  className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                    isMyTurn
                      ? "border-accent/40 bg-accent/5"
                      : "border-line bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => inst && handleCompleteChore(inst.id)}
                      disabled={isCompleted}
                      className="shrink-0 text-ink-3 transition-colors hover:text-accent disabled:opacity-50"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-6 text-emerald-500" />
                      ) : (
                        <Circle className="size-6 text-ink-3" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-body font-semibold ${isCompleted ? "line-through text-ink-3" : "text-ink"}`}>
                          {chore.title}
                        </h4>
                        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-caption-xs font-medium text-ink-3 uppercase">
                          {chore.cadence}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-caption text-ink-2">
                        {assignee ? (
                          <span className="flex items-center gap-1.5 font-medium">
                            <Avatar
                              src={assignee.avatarUrl}
                              firstName={assignee.firstName}
                              lastInitial={assignee.lastInitial}
                              size={18}
                            />
                            {assignee.id === userId ? "Your turn" : `${assignee.firstName}'s turn`}
                          </span>
                        ) : null}
                        {inst ? (
                          <span>• Due {new Date(inst.due_on).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {inst && !isCompleted ? (
                    <Button
                      variant={isMyTurn ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => handleCompleteChore(inst.id)}
                      className={isMyTurn ? "bg-accent text-white hover:opacity-90" : ""}
                    >
                      Done
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Expenses View */
        <div className="mt-6 space-y-6">
          {/* Net Balance Banner */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <span className="text-caption font-semibold uppercase tracking-wider text-ink-3">
              Your Net Balance
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span
                  className={`text-display-md font-bold tracking-tight ${
                    myNetCents > 0
                      ? "text-emerald-600"
                      : myNetCents < 0
                        ? "text-amber-600"
                        : "text-ink"
                  }`}
                >
                  {myNetCents > 0
                    ? `+$${(myNetCents / 100).toFixed(2)}`
                    : myNetCents < 0
                      ? `-$${(Math.abs(myNetCents) / 100).toFixed(2)}`
                      : "$0.00"}
                </span>
                <p className="mt-0.5 text-caption text-ink-2">
                  {myNetCents > 0
                    ? "You are owed money overall"
                    : myNetCents < 0
                      ? "You owe money to the room"
                      : "All settled up!"}
                </p>
              </div>

              {balances.suggestedSettlements.length > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSettleOpen(true)}
                >
                  Settle up
                </Button>
              ) : null}
            </div>

            {/* Suggested Transfers */}
            {balances.suggestedSettlements.length > 0 ? (
              <div className="mt-4 border-t border-line pt-3 space-y-2">
                <span className="text-caption-xs font-semibold uppercase text-ink-3">
                  Suggested settlement
                </span>
                {balances.suggestedSettlements.map((s, idx) => {
                  const from = memberMap.get(s.fromUserId)?.firstName || "Roommate";
                  const to = memberMap.get(s.toUserId)?.firstName || "Roommate";
                  const isMePaying = s.fromUserId === userId;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-surface-sunken p-2.5 text-caption text-ink"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="font-semibold">{from}</span>
                        <ArrowRight className="size-3 text-ink-3" />
                        <span className="font-semibold">{to}</span>
                      </span>
                      <span className="font-semibold text-accent">
                        ${(s.amountCents / 100).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Payment Safety Disclaimer */}
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-sunken p-3 text-caption-xs text-ink-2">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-accent" />
              <span>
                Rumi never moves money. Settle with roommates using Venmo, Zelle, or Cash App and record completed payments here.
              </span>
            </div>
          </div>

          {/* Recent Expenses List */}
          <div>
            <h3 className="text-body font-semibold text-ink">Recent Expenses</h3>
            {expenses.length === 0 ? (
              <p className="mt-3 text-caption text-ink-3">No expenses recorded yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {expenses.map((exp) => {
                  const payer = memberMap.get(exp.payer_id)?.firstName || "Roommate";
                  const isPayer = exp.payer_id === userId;

                  return (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between rounded-xl border border-line bg-surface p-4 shadow-xs"
                    >
                      <div>
                        <h4 className="text-body font-semibold text-ink">{exp.description}</h4>
                        <p className="mt-0.5 text-caption text-ink-2">
                          Paid by {isPayer ? "you" : payer} •{" "}
                          {new Date(exp.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-body font-bold text-ink">
                          ${(exp.amount_cents / 100).toFixed(2)}
                        </span>
                        {isPayer ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-ink-3 hover:text-rose-600"
                            aria-label="Delete expense"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Chore Sheet */}
      <Sheet
        open={addChoreOpen}
        onOpenChange={setAddChoreOpen}
        title="Add room chore"
        description="Chores rotate automatically across all room members."
        size="md"
      >
        <form onSubmit={handleCreateChore} className="space-y-4 py-2">
          <div>
            <label className="text-body-xs font-semibold text-ink">Chore title</label>
            <Input
              value={choreTitle}
              onChange={(e) => setChoreTitle(e.target.value)}
              placeholder="e.g. Clean the kitchen counter"
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="text-body-xs font-semibold text-ink">Cadence</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["daily", "weekly", "biweekly", "monthly"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChoreCadence(c)}
                  className={`rounded-xl border p-2 text-caption font-medium capitalize ${
                    choreCadence === c
                      ? "border-accent bg-accent/10 text-accent font-semibold"
                      : "border-line bg-surface text-ink-2 hover:bg-surface-hover"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-accent text-white hover:opacity-90"
            disabled={loading}
          >
            {loading ? "Adding chore..." : "Add chore"}
          </Button>
        </form>
      </Sheet>

      {/* Add Expense Sheet */}
      <Sheet
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        title="Record shared expense"
        description="Track room supplies, groceries, or utilities."
        size="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 py-2">
          <div>
            <label className="text-body-xs font-semibold text-ink">Description</label>
            <Input
              value={expenseDescription}
              onChange={(e) => setExpenseDescription(e.target.value)}
              placeholder="e.g. Paper towels, dish soap, spices"
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="text-body-xs font-semibold text-ink">Amount ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="text-body-xs font-semibold text-ink">Split method</label>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setSplitMode("equal")}
                className={`flex-1 rounded-xl border p-2 text-caption font-medium ${
                  splitMode === "equal"
                    ? "border-accent bg-accent/10 text-accent font-semibold"
                    : "border-line bg-surface text-ink-2"
                }`}
              >
                Split equally
              </button>
              <button
                type="button"
                onClick={() => setSplitMode("custom")}
                className={`flex-1 rounded-xl border p-2 text-caption font-medium ${
                  splitMode === "custom"
                    ? "border-accent bg-accent/10 text-accent font-semibold"
                    : "border-line bg-surface text-ink-2"
                }`}
              >
                Custom amounts
              </button>
            </div>
          </div>

          {splitMode === "custom" ? (
            <div className="space-y-2 rounded-xl border border-line bg-surface-sunken p-3">
              <span className="text-caption-xs font-semibold uppercase text-ink-3">
                Member shares ($)
              </span>
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <span className="text-caption text-ink font-medium">{m.firstName}</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={customSplits[m.id] || ""}
                    onChange={(e) =>
                      setCustomSplits({ ...customSplits, [m.id]: e.target.value })
                    }
                    className="w-24 text-right"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full bg-accent text-white hover:opacity-90"
            disabled={loading}
          >
            {loading ? "Saving expense..." : "Save expense"}
          </Button>
        </form>
      </Sheet>

      {/* Settle Up Sheet */}
      <Sheet
        open={settleOpen}
        onOpenChange={setSettleOpen}
        title="Record settlement"
        description="Mark a payment made to a roommate outside Rumi."
        size="md"
      >
        <form onSubmit={handleSettleUp} className="space-y-4 py-2">
          <div>
            <label className="text-body-xs font-semibold text-ink">Paid to</label>
            <select
              value={settleReceiverId}
              onChange={(e) => setSettleReceiverId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-surface p-2.5 text-body-sm text-ink"
            >
              {members
                .filter((m) => m.id !== userId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastInitial}.
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-body-xs font-semibold text-ink">Amount paid ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1"
              required
            />
          </div>

          <div>
            <label className="text-body-xs font-semibold text-ink">Note (optional)</label>
            <Input
              value={settleNote}
              onChange={(e) => setSettleNote(e.target.value)}
              placeholder="e.g. Venmo transfer for groceries"
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-accent text-white hover:opacity-90"
            disabled={loading}
          >
            {loading ? "Recording..." : "Record settlement"}
          </Button>
        </form>
      </Sheet>
    </div>
  );
}
