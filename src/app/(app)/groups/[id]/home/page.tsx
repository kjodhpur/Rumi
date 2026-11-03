import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { loadRoomContext } from "@/lib/groups/room";
import { computeGroupBalances } from "@/lib/expenses/balances";
import { photoUrl } from "@/lib/photos";
import { CAMPUS_TZ } from "@/lib/time";
import { ErrorState } from "@/components/ui/error-state";
import { RoomHomeView, type ChoreView, type ExpenseView, type RoomMemberView } from "@/components/groups/home/room-home-view";
import type { ChoreCadence } from "@/lib/chores/rotation";

export const metadata: Metadata = { title: "Chores & expenses" };
export const dynamic = "force-dynamic";

export default async function RoomHomePage({ params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) notFound();
  const user = await getUser();
  if (!user) redirect(`/login?next=/groups/${params.id}/home`);

  const supabase = createClient();
  const room = await loadRoomContext(supabase, user.id, params.id);
  if (!room) notFound();

  const [chores, instances, expenses, settlements] = await Promise.all([
    supabase.from("chores").select("id, title, cadence, from_agreement").eq("group_id", params.id).order("created_at"),
    supabase.from("chore_instances").select("id, chore_id, assignee_id, due_on, completed_at, completed_by").eq("group_id", params.id).order("due_on"),
    supabase
      .from("expenses")
      .select("id, payer_id, amount_cents, description, created_at, deleted_at, expense_splits(user_id, share_cents)")
      .eq("group_id", params.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("settlements").select("id, payer_id, receiver_id, amount_cents").eq("group_id", params.id),
  ]);
  if (chores.error || instances.error || expenses.error || settlements.error) {
    return <ErrorState title="Couldn't load chores and expenses" description="Refresh the page to try again." />;
  }

  const active = (expenses.data ?? []).filter((e) => !e.deleted_at);
  const shareRows = (e: (typeof active)[number]) => (e.expense_splits as { user_id: string; share_cents: number }[] | null) ?? [];
  const balance = computeGroupBalances(
    room.members.map((m) => m.id),
    active.map((e) => ({ id: e.id, payerId: e.payer_id, amountCents: e.amount_cents, description: e.description, splits: shareRows(e).map((s) => ({ userId: s.user_id, shareCents: s.share_cents })) })),
    (settlements.data ?? []).map((s) => ({ id: s.id, payerId: s.payer_id, receiverId: s.receiver_id, amountCents: s.amount_cents })),
  );

  // People on old expenses who have since left still show (balances stay outstanding).
  const knownIds = new Set(room.members.map((m) => m.id));
  const formerIds = Object.keys(balance.balances).filter((id) => !knownIds.has(id));
  const [{ data: currentProfiles }, { data: formerProfiles }] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_initial, avatar_path").in("id", [...knownIds]),
    formerIds.length ? supabase.from("profiles").select("id, first_name, last_initial, avatar_path").in("id", formerIds) : Promise.resolve({ data: [] as { id: string; first_name: string; last_initial: string; avatar_path: string | null }[] }),
  ]);
  const toMember = (p: { id: string; first_name: string; last_initial: string; avatar_path: string | null }, current: boolean): RoomMemberView => ({
    id: p.id,
    firstName: p.first_name,
    lastInitial: p.last_initial,
    avatarUrl: photoUrl(p.avatar_path),
    current,
  });
  const members = [...(currentProfiles ?? []).map((p) => toMember(p, true)), ...(formerProfiles ?? []).map((p) => toMember(p, false))];

  const choreViews: ChoreView[] = (chores.data ?? []).map((c) => {
    const mine = (instances.data ?? []).filter((i) => i.chore_id === c.id);
    const next = mine.find((i) => !i.completed_at) ?? null;
    const last = [...mine].filter((i) => i.completed_at).sort((a, b) => b.completed_at!.localeCompare(a.completed_at!))[0];
    return {
      id: c.id,
      title: c.title,
      cadence: c.cadence as ChoreCadence,
      fromAgreement: c.from_agreement,
      next: next ? { id: next.id, assigneeId: next.assignee_id, dueOn: next.due_on } : null,
      lastDone: last ? { by: last.completed_by, at: last.completed_at! } : null,
    };
  });

  const expenseViews: ExpenseView[] = active.map((e) => ({
    id: e.id,
    payerId: e.payer_id,
    amountCents: e.amount_cents,
    description: e.description,
    createdAt: e.created_at,
    shares: shareRows(e).map((s) => ({ userId: s.user_id, cents: s.share_cents })),
  }));

  return (
    <RoomHomeView
      groupId={room.groupId}
      groupName={room.name}
      userId={user.id}
      today={new Date().toLocaleDateString("en-CA", { timeZone: CAMPUS_TZ })}
      members={members}
      chores={choreViews}
      expenses={expenseViews}
      balances={Object.fromEntries(Object.values(balance.balances).map((b) => [b.userId, b.netCents]))}
      settleUps={balance.suggestedSettlements}
      hasAgreement={room.agreementStatus !== null && room.agreementStatus !== "void"}
    />
  );
}
