"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  HandCoins,
  ListChecks,
  Plus,
  Receipt,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ChoiceChips, MultiChips } from "@/components/ui/choice";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addChore,
  addExpense,
  completeChore,
  deleteExpense,
  recordSettlement,
  removeChore,
  seedChores,
} from "@/app/actions/room-hub";
import { CADENCES, type ChoreCadence } from "@/lib/chores/rotation";
import { cn } from "@/lib/utils";
import { useIntlLocale, useMessages, useT } from "@/components/providers/i18n";
import { choreTitle } from "@/lib/i18n/room";

export interface RoomMemberView {
  id: string;
  firstName: string;
  lastInitial: string;
  avatarUrl: string | null;
  /** False for someone who left the room but still has expenses on record. */
  current: boolean;
}

export interface ChoreView {
  id: string;
  title: string;
  cadence: ChoreCadence;
  fromAgreement: boolean;
  next: { id: string; assigneeId: string; dueOn: string } | null;
  lastDone: { by: string | null; at: string } | null;
}

export interface ExpenseView {
  id: string;
  payerId: string;
  amountCents: number;
  description: string;
  createdAt: string;
  shares: { userId: string; cents: number }[];
}

export interface SettleUp {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const toCents = (value: string) => {
  const n = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};
const due = (iso: string, today: string, t: ReturnType<typeof useT<"room">>, intl: string) => {
  if (iso < today) return t("chores.overdue");
  if (iso === today) return t("chores.dueToday");
  return t("chores.due", {
    date: new Date(`${iso}T12:00:00Z`).toLocaleDateString(intl, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  });
};

export function RoomHomeView({
  groupId,
  groupName,
  userId,
  today,
  members,
  chores,
  expenses,
  balances,
  settleUps,
  hasAgreement,
}: {
  groupId: string;
  groupName: string;
  userId: string;
  /** Campus date (yyyy-mm-dd). */
  today: string;
  members: RoomMemberView[];
  chores: ChoreView[];
  expenses: ExpenseView[];
  balances: Record<string, number>;
  settleUps: SettleUp[];
  hasAgreement: boolean;
}) {
  const router = useRouter();
  const t = useT("room");
  const intl = useIntlLocale();
  const safetyBody = useMessages().chat.safetyBody;
  const [pending, setPending] = React.useState<string | null>(null);
  const [sheet, setSheet] = React.useState<"chore" | "expense" | "settle" | null>(null);
  const name = (id: string) => {
    const m = members.find((x) => x.id === id);
    if (id === userId) return t("you");
    if (!m) return t("former");
    return m.current ? m.firstName : t("left", { name: m.firstName });
  };

  async function run(
    key: string,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
    setPending(key);
    const result = await action();
    setPending(null);
    if (!result.ok) return void toast.error(result.error);
    toast.success(success);
    router.refresh();
  }

  const mine = balances[userId] ?? 0;
  const current = members.filter((m) => m.current);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <div>
        <Link
          href={`/groups/${groupId}`}
          className="-ml-2 inline-flex h-9 items-center gap-1 rounded-full px-2 text-body-sm font-medium text-ink-2 hover:bg-surface-hover hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden /> {groupName}
        </Link>
        <h1 className="mt-2 font-display text-display-md text-ink lg:text-display-lg">
          {t("title")}
        </h1>
        <p className="mt-1.5 text-body-sm text-ink-2">{t("intro")}</p>
      </div>

      <Tabs defaultValue="chores">
        <TabsList className="mb-6">
          <TabsTrigger value="chores">{t("tabChores")}</TabsTrigger>
          <TabsTrigger value="expenses">{t("tabExpenses")}</TabsTrigger>
        </TabsList>

        <TabsContent value="chores" className="flex flex-col gap-4 outline-none">
          {chores.length === 0 ? (
            <EmptyState
              icon={<ListChecks strokeWidth={1.75} />}
              title={t("chores.none")}
              description={hasAgreement ? t("chores.noneAgreement") : t("chores.noneDefault")}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    loading={pending === "seed"}
                    onClick={() => void run("seed", () => seedChores(groupId), t("chores.seeded"))}
                  >
                    <Sparkles aria-hidden />{" "}
                    {hasAgreement ? t("chores.useAgreement") : t("chores.addCommon")}
                  </Button>
                  <Button variant="secondary" onClick={() => setSheet("chore")}>
                    <Plus aria-hidden /> {t("chores.add")}
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-line overflow-hidden rounded-lg bg-surface ring-1 ring-line">
                {chores.map((c) => {
                  const myTurn = c.next?.assigneeId === userId;
                  const title = choreTitle(c.title, t);
                  return (
                    <li key={c.id} className="flex items-center gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-medium text-ink">{title}</p>
                        <p className="mt-0.5 text-caption text-ink-2">
                          {t(`cadence.${c.cadence}`)}
                          {c.next ? (
                            <>
                              {" · "}
                              <span
                                className={cn(c.next.dueOn < today && "font-medium text-warning")}
                              >
                                {due(c.next.dueOn, today, t, intl)}
                              </span>
                              {" · "}
                              {myTurn ? (
                                <span className="font-medium text-ink">{t("chores.yourTurn")}</span>
                              ) : (
                                t("chores.turn", { name: name(c.next.assigneeId) })
                              )}
                            </>
                          ) : null}
                          {c.fromAgreement ? t("chores.fromAgreement") : ""}
                        </p>
                      </div>
                      {c.next ? (
                        <Button
                          size="sm"
                          variant={myTurn ? "primary" : "secondary"}
                          loading={pending === c.next.id}
                          onClick={() =>
                            void run(
                              c.next!.id,
                              () => completeChore(groupId, c.next!.id),
                              t("chores.doneToast", { title }),
                            )
                          }
                        >
                          <Check aria-hidden /> {t("chores.done")}
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("chores.remove", { title })}
                        loading={pending === `rm-${c.id}`}
                        onClick={() =>
                          void run(
                            `rm-${c.id}`,
                            () => removeChore(groupId, c.id),
                            t("chores.removed"),
                          )
                        }
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <Button variant="secondary" className="self-start" onClick={() => setSheet("chore")}>
                <Plus aria-hidden /> {t("chores.add")}
              </Button>
            </>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="flex flex-col gap-5 outline-none">
          <div className="rounded-lg bg-surface p-5 ring-1 ring-line">
            <p className="text-caption text-ink-3">{t("expenses.balance")}</p>
            <p
              className={cn(
                "mt-1 font-display text-display-sm tabular-nums",
                mine > 0 ? "text-success" : mine < 0 ? "text-ink" : "text-ink-2",
              )}
            >
              {mine === 0
                ? t("expenses.square")
                : mine > 0
                  ? t("expenses.owed", { amount: money(mine) })
                  : t("expenses.owe", { amount: money(-mine) })}
            </p>
            {settleUps.length ? (
              <ul className="mt-4 flex flex-col gap-1.5 text-body-sm text-ink-2">
                {settleUps.map((s) => (
                  <li key={`${s.fromUserId}-${s.toUserId}`}>
                    {s.fromUserId === userId
                      ? t("expenses.youPay", { to: name(s.toUserId) })
                      : s.toUserId === userId
                        ? t("expenses.paysYou", { from: name(s.fromUserId) })
                        : t("expenses.pays", {
                            from: name(s.fromUserId),
                            to: name(s.toUserId),
                          })}{" "}
                    <span className="font-medium text-ink tabular-nums">
                      {money(s.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setSheet("expense")}>
                <Plus aria-hidden /> {t("expenses.add")}
              </Button>
              {current.length > 1 ? (
                <Button variant="secondary" onClick={() => setSheet("settle")}>
                  <HandCoins aria-hidden /> {t("expenses.paidBack")}
                </Button>
              ) : null}
            </div>
            <p className="mt-4 flex gap-2 text-caption text-ink-3">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />{" "}
              {t("expenses.tracking")} {safetyBody}
            </p>
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt strokeWidth={1.75} />}
              title={t("expenses.none")}
              description={t("expenses.noneBody")}
            />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg bg-surface ring-1 ring-line">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-medium text-ink">{e.description}</p>
                    <p className="mt-0.5 text-caption text-ink-2">
                      {(() => {
                        const date = new Date(e.createdAt).toLocaleDateString(intl, {
                          month: "short",
                          day: "numeric",
                        });
                        return e.payerId === userId
                          ? t("expenses.youPaid", { date })
                          : t("expenses.paid", { name: name(e.payerId), date });
                      })()}
                      {" · "}
                      {e.shares.map((s) => `${name(s.userId)} ${money(s.cents)}`).join(", ")}
                    </p>
                  </div>
                  <span className="text-body-sm font-medium text-ink tabular-nums">
                    {money(e.amountCents)}
                  </span>
                  {e.payerId === userId ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("expenses.remove", { description: e.description })}
                      loading={pending === e.id}
                      onClick={() =>
                        void run(e.id, () => deleteExpense(groupId, e.id), t("expenses.removed"))
                      }
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <ChoreSheet
        open={sheet === "chore"}
        onOpenChange={(o) => setSheet(o ? "chore" : null)}
        groupId={groupId}
        onSaved={() => router.refresh()}
      />
      <ExpenseSheet
        open={sheet === "expense"}
        onOpenChange={(o) => setSheet(o ? "expense" : null)}
        groupId={groupId}
        userId={userId}
        members={current}
        onSaved={() => router.refresh()}
      />
      <SettleSheet
        open={sheet === "settle"}
        onOpenChange={(o) => setSheet(o ? "settle" : null)}
        groupId={groupId}
        others={members.filter((m) => m.id !== userId)}
        suggested={settleUps.filter((s) => s.fromUserId === userId)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function ChoreSheet({
  open,
  onOpenChange,
  groupId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groupId: string;
  onSaved: () => void;
}) {
  const t = useT("room");
  const [title, setTitle] = React.useState("");
  const [cadence, setCadence] = React.useState<ChoreCadence>("weekly");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await addChore({ groupId, title, cadence });
    setPending(false);
    if (!result.ok) return setError(result.error);
    setTitle("");
    setError(null);
    onOpenChange(false);
    toast.success(t("choreSheet.added"));
    onSaved();
  }
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("choreSheet.title")}
      description={t("choreSheet.description")}
      footer={
        <Button type="submit" form="chore-form" block loading={pending}>
          {t("choreSheet.submit")}
        </Button>
      }
    >
      <form id="chore-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label={t("choreSheet.chore")} error={error}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder={t("choreSheet.placeholder")}
            />
          )}
        </Field>
        <Field label={t("choreSheet.often")}>
          {({ id }) => (
            <ChoiceChips
              aria-labelledby={id}
              value={cadence}
              onValueChange={setCadence}
              options={CADENCES.map((c) => ({ value: c, label: t(`cadence.${c}`) }))}
            />
          )}
        </Field>
      </form>
    </Sheet>
  );
}

function ExpenseSheet({
  open,
  onOpenChange,
  groupId,
  userId,
  members,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groupId: string;
  userId: string;
  members: RoomMemberView[];
  onSaved: () => void;
}) {
  const t = useT("room");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [mode, setMode] = React.useState<"equal" | "custom">("equal");
  const [who, setWho] = React.useState<string[]>(members.map((m) => m.id));
  const [custom, setCustom] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) setWho(members.map((m) => m.id));
  }, [open, members]);

  const total = toCents(amount);
  const customTotal = Object.values(custom).reduce((sum, v) => sum + (toCents(v) || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(total) || total <= 0) return setError(t("amountError"));
    setPending(true);
    const result = await addExpense({
      groupId,
      description,
      amountCents: total,
      split:
        mode === "equal"
          ? { kind: "equal", memberIds: who }
          : {
              kind: "custom",
              shares: members.map((m) => ({
                userId: m.id,
                cents: toCents(custom[m.id] ?? "0") || 0,
              })),
            },
    });
    setPending(false);
    if (!result.ok) return setError(result.error);
    setDescription("");
    setAmount("");
    setCustom({});
    setError(null);
    onOpenChange(false);
    toast.success(t("expenseSheet.added"));
    onSaved();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("expenseSheet.title")}
      description={t("expenseSheet.description")}
      footer={
        <Button type="submit" form="expense-form" block loading={pending}>
          {t("expenses.add")}
        </Button>
      }
    >
      <form id="expense-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label={t("expenseSheet.what")}>
          {({ id }) => (
            <Input
              id={id}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              placeholder={t("expenseSheet.whatPlaceholder")}
            />
          )}
        </Field>
        <Field label={t("amount")}>
          {({ id }) => (
            <Input
              id={id}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$0.00"
            />
          )}
        </Field>
        <SegmentedControl
          aria-label={t("expenseSheet.how")}
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "equal", label: t("expenseSheet.even") },
            { value: "custom", label: t("expenseSheet.custom") },
          ]}
        />
        {mode === "equal" ? (
          <Field label={t("expenseSheet.between")}>
            {({ id }) => (
              <MultiChips
                aria-labelledby={id}
                value={who}
                onValueChange={setWho}
                options={members.map((m) => ({
                  value: m.id,
                  label: m.id === userId ? t("you") : m.firstName,
                  icon: (
                    <Avatar
                      src={m.avatarUrl}
                      firstName={m.firstName}
                      lastInitial={m.lastInitial}
                      size={20}
                    />
                  ),
                }))}
              />
            )}
          </Field>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map((m) => (
              <Field key={m.id} label={m.id === userId ? t("you") : m.firstName}>
                {({ id }) => (
                  <Input
                    id={id}
                    inputMode="decimal"
                    value={custom[m.id] ?? ""}
                    onChange={(e) => setCustom((c) => ({ ...c, [m.id]: e.target.value }))}
                    placeholder="$0.00"
                  />
                )}
              </Field>
            ))}
            <p
              className={cn(
                "text-caption tabular-nums",
                Number.isInteger(total) && customTotal !== total ? "text-warning" : "text-ink-3",
              )}
              aria-live="polite"
            >
              {t("expenseSheet.of", {
                sum: money(customTotal),
                total: money(Number.isInteger(total) && total > 0 ? total : 0),
              })}
            </p>
          </div>
        )}
        {error ? (
          <p role="alert" className="text-body-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}

function SettleSheet({
  open,
  onOpenChange,
  groupId,
  others,
  suggested,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groupId: string;
  others: RoomMemberView[];
  suggested: SettleUp[];
  onSaved: () => void;
}) {
  const t = useT("room");
  const [receiver, setReceiver] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const first = suggested[0];
    setReceiver(first?.toUserId ?? others[0]?.id ?? "");
    setAmount(first ? (first.amountCents / 100).toFixed(2) : "");
    setError(null);
  }, [open, suggested, others]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = toCents(amount);
    if (!Number.isInteger(cents) || cents <= 0) return setError(t("amountError"));
    setPending(true);
    const result = await recordSettlement({ groupId, receiverId: receiver, amountCents: cents });
    setPending(false);
    if (!result.ok) return setError(result.error);
    onOpenChange(false);
    toast.success(t("settle.recorded"));
    onSaved();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("settle.title")}
      description={t("settle.description")}
      footer={
        <Button type="submit" form="settle-form" block loading={pending}>
          {t("settle.submit")}
        </Button>
      }
    >
      <form id="settle-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label={t("settle.who")}>
          {({ id }) => (
            <ChoiceChips
              aria-labelledby={id}
              value={receiver}
              onValueChange={setReceiver}
              options={others.map((m) => ({
                value: m.id,
                label: m.current ? m.firstName : t("left", { name: m.firstName }),
              }))}
            />
          )}
        </Field>
        <Field label={t("amount")}>
          {({ id }) => (
            <Input
              id={id}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$0.00"
            />
          )}
        </Field>
        {error ? (
          <p role="alert" className="text-body-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
