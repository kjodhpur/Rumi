"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Crown, LogOut, MessageCircle, MoreHorizontal, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/ui/relative-time";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfileOverlay } from "@/components/profile/profile-overlay";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cancelGroupRequest, inviteToGroup, leaveGroup, respondToGroupRequest } from "@/app/actions/groups";
import type { GroupCandidate, GroupDetail } from "@/lib/groups";
import { CLASS_YEARS, labelOf } from "@/lib/options";
import { cn, displayName, formatBudget } from "@/lib/utils";
import { revealDelay, spring } from "@/lib/motion";
import { useEntrance } from "@/hooks/use-entrance";
import { moveInLabel } from "@/components/matches/card-meta";

export function GroupDetailView({ userId, group }: { userId: string; group: GroupDetail }) {
  const entrance = useEntrance(group.candidates.map((c) => c.id));
  const router = useRouter();
  const overlay = useProfileOverlay();
  const [inviting, setInviting] = React.useState<GroupCandidate | null>(null);
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const open = group.targetSize - group.members.length;
  const memberById = new Map(group.members.map((m) => [m.id, m]));
  const cohesion = group.pairs.length
    ? Math.round(group.pairs.reduce((sum, p) => sum + p.score, 0) / group.pairs.length)
    : null;
  // Every pairing, including ones with no score because a dealbreaker conflicts.
  const memberPairs = group.members.flatMap((a, i) => group.members.slice(i + 1).map((b) => [a, b] as const));
  const pairScore = (x: string, y: string) =>
    group.pairs.find((p) => (p.a === x && p.b === y) || (p.a === y && p.b === x))?.score ?? null;

  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase
      .channel(`group:${group.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_requests", filter: `group_id=eq.${group.id}` }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [group.id, router]);

  async function leave() {
    setLeaving(true);
    const result = await leaveGroup(group.id);
    setLeaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setLeaveOpen(false);
    toast.success(`You left ${group.name}`);
    router.replace("/groups");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={group.name}
        description={
          group.status === "full"
            ? `Full · ${group.members.length} of ${group.targetSize} — time to find your place.`
            : `${group.members.length} of ${group.targetSize} · ${open} ${open === 1 ? "spot" : "spots"} open`
        }
        actions={
          <>
            {group.conversationId ? (
              <Button asChild variant="secondary">
                <Link href={`/messages/${group.conversationId}`}>
                  <MessageCircle /> Group chat
                </Link>
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Group options">
                  <MoreHorizontal strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem destructive onSelect={() => setLeaveOpen(true)}>
                  <LogOut /> Leave group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Members + fit */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line sm:p-6">
          <h2 className="mb-5 text-caption font-semibold tracking-wide text-ink-3 uppercase">Members</h2>
          <ul className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            {group.members.map((m) => (
              <li key={m.id} className="flex flex-col items-center text-center">
                <Avatar src={m.avatarUrl} firstName={m.firstName} lastInitial={m.lastInitial} size={64} />
                <p className="mt-2.5 flex items-center gap-1 text-body-sm font-semibold text-ink">
                  {m.id === userId ? "You" : displayName(m.firstName, m.lastInitial)}
                  {m.role === "owner" ? <Crown className="size-3.5 text-warning" strokeWidth={2} aria-label="Group owner" /> : null}
                </p>
                <p className="mt-0.5 line-clamp-1 text-caption text-ink-3">
                  {[labelOf(CLASS_YEARS, m.classYear), m.major].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
            {Array.from({ length: Math.max(0, open) }).map((_, i) => (
              <li key={`open-${i}`} className="flex flex-col items-center text-center">
                <span className="flex size-16 items-center justify-center rounded-full border-[1.5px] border-dashed border-line-strong text-ink-3">
                  <UserPlus className="size-5" strokeWidth={1.5} aria-hidden />
                </span>
                <p className="mt-2.5 text-body-sm text-ink-3">Open spot</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-surface p-5 shadow-sm ring-1 ring-line sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-caption font-semibold tracking-wide text-ink-3 uppercase">How you all fit</h2>
            {cohesion !== null ? <ScoreRing score={cohesion} size={44} /> : null}
          </div>
          {group.members.length < 2 ? (
            <p className="text-body-sm text-ink-2">Invite someone and you&apos;ll see every pairing&apos;s compatibility here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {memberPairs.map(([a, b]) => {
                const score = pairScore(a.id, b.id);
                return (
                  <li key={`${a.id}-${b.id}`} className="flex items-center gap-3">
                    <span className="flex -space-x-2">
                      <Avatar src={a.avatarUrl} firstName={a.firstName} lastInitial={a.lastInitial} size={28} className="rounded-full ring-2 ring-surface" />
                      <Avatar src={b.avatarUrl} firstName={b.firstName} lastInitial={b.lastInitial} size={28} className="rounded-full ring-2 ring-surface" />
                    </span>
                    <span className="flex-1 text-body-sm text-ink">
                      {a.id === userId ? "You" : a.firstName} &amp; {b.id === userId ? "you" : b.firstName}
                    </span>
                    {score !== null ? (
                      <span className="text-body-sm font-semibold text-ink tabular">{score}%</span>
                    ) : (
                      <span className="text-caption text-warning">Dealbreaker clash</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {group.status === "full" && group.conversationId ? (
        <section className="mt-4 flex flex-col gap-4 rounded-xl bg-ink p-6 text-ink-inverse sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-display-sm">Your group is complete.</p>
            <p className="mt-1 text-body-sm opacity-75">Compare listings, split a budget, and plan tours together in the group chat.</p>
          </div>
          <Button asChild variant="secondary" className="shrink-0">
            <Link href={`/messages/${group.conversationId}`}>
              <MessageCircle /> Open group chat
            </Link>
          </Button>
        </section>
      ) : null}

      {/* Join requests */}
      {group.joinRequests.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-caption font-semibold tracking-wide text-ink-3 uppercase">Want to join</h2>
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {group.joinRequests.map((r) => (
                <JoinRequestRow key={r.id} request={r} />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ) : null}

      {/* Suggestions */}
      {group.status === "open" ? (
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-title font-semibold text-ink">Suggested for your group</h2>
            <p className="text-body-sm text-ink-2">Ranked by how well they fit every member — not just you.</p>
          </div>
          {group.candidates.length === 0 ? (
            <EmptyState
              icon={<Users strokeWidth={1.5} />}
              title="No one fits everyone yet"
              description="Suggestions need to pass every member's dealbreakers. As more students join, they'll appear here."
              className="py-10"
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.candidates.map((c, i) => (
                <li key={c.id} style={revealDelay(i)} className={cn("flex flex-col rounded-lg bg-surface p-4 shadow-sm ring-1 ring-line", entrance(c.id))}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      aria-label={`View ${c.firstName}'s profile`}
                      onClick={() =>
                        overlay?.open({
                          id: c.id,
                          firstName: c.firstName,
                          lastInitial: c.lastInitial,
                          classYear: c.classYear,
                          major: c.major,
                          avatarUrl: c.avatarUrl,
                          placeholder: c.placeholder,
                          photoCount: 1,
                          verified: true,
                          score: c.memberScores.find((s) => s.memberId === userId)?.score ?? c.groupScore,
                          reasons: [],
                          watchouts: [],
                          sharedArtists: [],
                          budgetMin: c.budgetMin,
                          budgetMax: c.budgetMax,
                          moveInDate: c.moveInDate,
                          areaNames: [],
                          isSaved: false,
                          introStatus: null,
                        })
                      }
                    >
                      <Avatar src={c.avatarUrl} firstName={c.firstName} lastInitial={c.lastInitial} size={52} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-ink">{displayName(c.firstName, c.lastInitial)}</p>
                      <p className="truncate text-body-sm text-ink-2">{[labelOf(CLASS_YEARS, c.classYear), c.major].filter(Boolean).join(" · ")}</p>
                    </div>
                    <ScoreRing score={c.groupScore} size={44} />
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {c.memberScores.map((s) => (
                      <li key={s.memberId} className="rounded-full bg-surface-sunken px-2.5 py-1 text-caption text-ink-2">
                        {s.memberId === userId ? "You" : memberById.get(s.memberId)?.firstName} · <span className="font-medium text-ink tabular">{s.score}%</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-caption text-ink-3">
                    {formatBudget(c.budgetMin, c.budgetMax)}
                    {c.moveInDate ? ` · Moves ${moveInLabel(c.moveInDate)}` : ""}
                  </p>
                  <Button
                    size="sm"
                    variant={c.pendingKind ? "subtle" : "primary"}
                    className="mt-4"
                    disabled={Boolean(c.pendingKind)}
                    onClick={() => setInviting(c)}
                  >
                    {c.pendingKind === "invite" ? "Invited" : c.pendingKind === "request" ? "Asked to join — see above" : (<><UserPlus /> Invite</>)}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {group.sentInvites.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-caption font-semibold tracking-wide text-ink-3 uppercase">Invites sent</h2>
          <ul className="divide-y divide-line rounded-lg bg-surface ring-1 ring-line">
            {group.sentInvites.map((r) => (
              <SentInviteRow key={r.id} request={r} />
            ))}
          </ul>
        </section>
      ) : null}

      <InviteSheet groupId={group.id} groupName={group.name} candidate={inviting} onClose={() => setInviting(null)} />

      <Sheet
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        size="sm"
        title={`Leave ${group.name}?`}
        description={
          group.members.length === 1
            ? "You're the only member, so the group and its chat will be deleted."
            : "You'll leave the group chat. You can be invited back later."
        }
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => setLeaveOpen(false)}>
              Stay
            </Button>
            <Button variant="danger" size="lg" className="flex-1" loading={leaving} onClick={() => void leave()}>
              Leave group
            </Button>
          </div>
        }
      >
        <p className="text-body-sm text-ink-2">
          {group.ownerId === userId && group.members.length > 1
            ? "Ownership passes to the longest-standing member."
            : "Your matches and messages aren't affected."}
        </p>
      </Sheet>
    </div>
  );
}

function JoinRequestRow({ request }: { request: GroupDetail["joinRequests"][number] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"accept" | "decline" | null>(null);
  async function respond(accept: boolean) {
    setPending(accept ? "accept" : "decline");
    const result = await respondToGroupRequest(request.id, accept);
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(accept ? `${request.person.firstName} joined the group` : "Request declined");
    router.refresh();
  }
  const myScore = request.scores[0]?.score;
  return (
    <motion.li layout="position" exit={{ opacity: 0, x: 40 }} transition={spring} className="rounded-lg bg-surface p-4 shadow-sm ring-1 ring-line">
      <div className="flex items-center gap-3">
        <Avatar src={request.person.avatarUrl} firstName={request.person.firstName} lastInitial={request.person.lastInitial} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-semibold text-ink">{displayName(request.person.firstName, request.person.lastInitial)}</p>
          <RelativeTime iso={request.createdAt} prefix="Asked " className="block text-caption text-ink-3" />
        </div>
        {typeof myScore === "number" ? <ScoreRing score={myScore} size={40} /> : null}
      </div>
      {request.message ? <p className="mt-3 rounded-md bg-surface-sunken px-3 py-2.5 text-body-sm text-ink">{request.message}</p> : null}
      <div className="mt-3 flex gap-2.5">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => void respond(false)} loading={pending === "decline"} disabled={pending !== null}>
          Decline
        </Button>
        <Button size="sm" className="flex-[2]" onClick={() => void respond(true)} loading={pending === "accept"} disabled={pending !== null}>
          Accept
        </Button>
      </div>
    </motion.li>
  );
}

function SentInviteRow({ request }: { request: GroupDetail["sentInvites"][number] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  async function cancel() {
    setPending(true);
    const result = await cancelGroupRequest(request.id);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }
  return (
    <li className="flex items-center gap-3 p-3.5">
      <Avatar src={request.person.avatarUrl} firstName={request.person.firstName} lastInitial={request.person.lastInitial} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-ink">{displayName(request.person.firstName, request.person.lastInitial)}</p>
        <RelativeTime iso={request.createdAt} prefix="Invited " className="block text-caption text-ink-3" />
      </div>
      <Button variant="ghost" size="sm" loading={pending} onClick={() => void cancel()}>
        Cancel
      </Button>
    </li>
  );
}

function InviteSheet({
  groupId,
  groupName,
  candidate,
  onClose,
}: {
  groupId: string;
  groupName: string;
  candidate: GroupCandidate | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (candidate) {
      setMessage(`Hey ${candidate.firstName}! We're looking for one more for ${groupName} — you fit all of us really well.`);
      setSuccess(false);
    }
  }, [candidate, groupName]);

  async function send() {
    if (!candidate) return;
    setPending(true);
    const result = await inviteToGroup({ groupId, userId: candidate.id, message });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      onClose();
      router.refresh();
      toast.success(`Invite sent to ${candidate.firstName}`);
    }, 700);
  }

  return (
    <Sheet
      open={Boolean(candidate)}
      onOpenChange={(o) => !o && onClose()}
      title={candidate ? `Invite ${candidate.firstName}` : "Invite"}
      description="They'll see everyone's compatibility before deciding."
      footer={
        <Button size="lg" block loading={pending} success={success} successLabel="Invited" onClick={() => void send()}>
          Send invite
        </Button>
      }
    >
      <Textarea aria-label="Invite message" rows={3} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} />
    </Sheet>
  );
}
