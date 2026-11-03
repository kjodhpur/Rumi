import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadGroup } from "@/lib/groups";
import { computeGroupBalances, type ExpenseItem, type SettlementItem } from "@/lib/expenses/balances";
import {
  RoomHomeView,
  type ChoreRecord,
  type ExpenseRecord,
  type MemberSummary,
} from "@/components/groups/home/room-home-view";

export const metadata: Metadata = { title: "Room Chores & Expenses" };
export const dynamic = "force-dynamic";

interface RoomHomePageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function RoomHomePage({ params }: RoomHomePageProps) {
  const { id: groupId } = await Promise.resolve(params);
  if (!z.string().uuid().safeParse(groupId).success) redirect("/groups");

  const user = await getUser();
  if (!user) redirect(`/login?next=/groups/${groupId}/home`);

  const supabase = createClient();
  const group = await loadGroup(supabase, user.id, groupId);
  if (!group) redirect("/groups");

  const memberIds = group.members.map((m) => m.id);

  // 1. Load chores and instances
  const { data: choresData } = await supabase
    .from("chores")
    .select("id, title, cadence, rotation")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  const { data: instancesData } = await supabase
    .from("chore_instances")
    .select("id, chore_id, assignee_id, due_on, completed_at")
    .eq("group_id", groupId)
    .order("due_on", { ascending: true });

  const chores: ChoreRecord[] = (choresData || []).map((c) => {
    // Find active (uncompleted) instance, or latest instance
    const instances = (instancesData || []).filter((i) => i.chore_id === c.id);
    const active = instances.find((i) => !i.completed_at) || instances[instances.length - 1] || null;

    return {
      id: c.id,
      title: c.title,
      cadence: c.cadence,
      rotation: c.rotation,
      activeInstance: active
        ? {
            id: active.id,
            assignee_id: active.assignee_id,
            due_on: active.due_on,
            completed_at: active.completed_at,
          }
        : null,
    };
  });

  // 2. Load expenses and splits
  const { data: expensesData } = await supabase
    .from("expenses")
    .select("id, payer_id, amount_cents, description, created_at, deleted_at")
    .eq("group_id", groupId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const expenseIds = (expensesData || []).map((e) => e.id);

  let splitsData: { expense_id: string; user_id: string; share_cents: number }[] = [];
  if (expenseIds.length > 0) {
    const { data: splits } = await supabase
      .from("expense_splits")
      .select("expense_id, user_id, share_cents")
      .in("expense_id", expenseIds);
    splitsData = splits || [];
  }

  // 3. Load settlements
  const { data: settlementsData } = await supabase
    .from("settlements")
    .select("id, payer_id, receiver_id, amount_cents")
    .eq("group_id", groupId);

  // Build structure for computeGroupBalances
  const expenseItems: ExpenseItem[] = (expensesData || []).map((e) => ({
    id: e.id,
    payerId: e.payer_id,
    amountCents: e.amount_cents,
    description: e.description,
    deletedAt: e.deleted_at,
    splits: splitsData
      .filter((s) => s.expense_id === e.id)
      .map((s) => ({
        userId: s.user_id,
        shareCents: s.share_cents,
      })),
  }));

  const settlementItems: SettlementItem[] = (settlementsData || []).map((s) => ({
    id: s.id,
    payerId: s.payer_id,
    receiverId: s.receiver_id,
    amountCents: s.amount_cents,
  }));

  const balanceResults = computeGroupBalances(memberIds, expenseItems, settlementItems);

  const breakdown: Record<string, number> = {};
  for (const [uid, b] of Object.entries(balanceResults.balances)) {
    breakdown[uid] = b.netCents;
  }

  const expensesFormatted: ExpenseRecord[] = (expensesData || []).map((e) => ({
    id: e.id,
    payer_id: e.payer_id,
    amount_cents: e.amount_cents,
    description: e.description,
    created_at: e.created_at,
    splits: splitsData
      .filter((s) => s.expense_id === e.id)
      .map((s) => ({
        user_id: s.user_id,
        share_cents: s.share_cents,
      })),
  }));

  const members: MemberSummary[] = group.members.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastInitial: m.lastInitial,
    avatarUrl: m.avatarUrl,
  }));

  return (
    <RoomHomeView
      groupId={groupId}
      userId={user.id}
      members={members}
      chores={chores}
      expenses={expensesFormatted}
      balances={{
        netCents: balanceResults.balances[user.id]?.netCents || 0,
        breakdown,
        suggestedSettlements: balanceResults.suggestedSettlements,
      }}
    />
  );
}
