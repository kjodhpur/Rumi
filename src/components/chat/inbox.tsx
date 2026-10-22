"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { toast } from "sonner";
import { Inbox as InboxIcon, MessageCircle, Sparkle, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { CountBubble } from "@/components/ui/badge";
import { RelativeTime } from "@/components/ui/relative-time";
import { useHydrated } from "@/hooks/use-hydrated";
import { listStamp } from "@/lib/time";
import { useProfileOverlay } from "@/components/profile/profile-overlay";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { respondToIntro, withdrawIntro } from "@/app/actions/social";
import { respondToGroupRequest } from "@/app/actions/groups";
import type { ConversationSummary } from "@/lib/messages";
import type { GroupInvite, IntroRequest } from "@/lib/requests";
import { CLASS_YEARS, labelOf } from "@/lib/options";
import { cn, displayName } from "@/lib/utils";
import { itemVariants, listVariants, spring } from "@/lib/motion";

export function Inbox({
  userId,
  conversations,
  requests,
}: {
  userId: string;
  conversations: ConversationSummary[];
  requests: { received: IntroRequest[]; sent: IntroRequest[]; groupInvites: GroupInvite[] };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const tab = search.get("tab") === "requests" ? "requests" : "chats";
  const requestCount = requests.received.length + requests.groupInvites.length;

  // Live list: refresh on any message, intro or invite change.
  React.useEffect(() => {
    const supabase = getSupabaseBrowser();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 350);
    };
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "intros" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_requests" }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return (
    <div className="mx-auto max-w-[760px]">
      <PageHeader title="Messages" description="Chats open once an intro is accepted." />
      <Tabs
        value={tab}
        onValueChange={(value) => router.replace(value === "requests" ? `${pathname}?tab=requests` : pathname, { scroll: false })}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="chats">Chats</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {requestCount > 0 ? <CountBubble count={requestCount} /> : null}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chats" className="outline-none">
          <ChatList userId={userId} conversations={conversations} hasRequests={requestCount > 0} />
        </TabsContent>
        <TabsContent value="requests" className="outline-none">
          <Requests requests={requests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChatList({ conversations, hasRequests }: { userId: string; conversations: ConversationSummary[]; hasRequests: boolean }) {
  const hydrated = useHydrated();
  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<MessageCircle strokeWidth={1.5} />}
        title="No chats yet"
        description="Send an intro from someone's profile. When they accept, your conversation shows up here."
        action={
          hasRequests ? (
            <Button asChild>
              <Link href="/messages?tab=requests">Review requests</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/matches">Browse matches</Link>
            </Button>
          )
        }
      />
    );
  }
  return (
    <motion.ul className="-mx-2 flex flex-col" variants={listVariants} initial="hidden" animate="show">
      {conversations.map((c) => (
        <motion.li key={c.id} variants={itemVariants}>
          <Link
            href={`/messages/${c.id}`}
            className="flex items-center gap-3.5 rounded-lg px-2 py-3 outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus active:bg-surface-hover"
          >
            {c.kind === "group" ? (
              <GroupAvatar members={c.members} />
            ) : (
              <Avatar src={c.members[0]?.avatarUrl} firstName={c.members[0]?.firstName} lastInitial={c.members[0]?.lastInitial} size={52} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className={cn("truncate text-body", c.unread ? "font-semibold text-ink" : "font-medium text-ink")}>
                  {c.title}
                  {c.kind === "group" ? <Users className="ml-1.5 inline size-3.5 text-ink-3" strokeWidth={2} aria-label="Group" /> : null}
                </p>
                <span suppressHydrationWarning className={cn("shrink-0 text-caption tabular", c.unread ? "font-medium text-accent-ink" : "text-ink-3")}>
                  {listStamp(c.lastMessageAt, hydrated)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <p className={cn("truncate text-body-sm", c.unread ? "text-ink" : "text-ink-2")}>
                  {c.lastMessagePreview ? (
                    <>
                      {c.lastMessageMine ? <span className="text-ink-3">You: </span> : null}
                      {c.lastMessagePreview}
                    </>
                  ) : (
                    <span className="text-ink-3">No messages yet — say hi</span>
                  )}
                </p>
                {c.unread > 0 ? (
                  <>
                    <CountBubble count={c.unread} />
                    <span className="sr-only">{c.unread} unread</span>
                  </>
                ) : null}
              </div>
            </div>
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function GroupAvatar({ members, size = 52 }: { members: ConversationSummary["members"]; size?: number }) {
  const [a, b] = members;
  const inner = Math.round(size * 0.68);
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }} aria-hidden>
      <Avatar src={a?.avatarUrl} firstName={a?.firstName ?? "G"} lastInitial={a?.lastInitial} size={inner} className="absolute top-0 left-0" />
      <Avatar
        src={b?.avatarUrl}
        firstName={b?.firstName ?? "+"}
        lastInitial={b?.lastInitial}
        size={inner}
        className="absolute right-0 bottom-0 rounded-full ring-2 ring-bg"
      />
    </span>
  );
}

function Requests({ requests }: { requests: { received: IntroRequest[]; sent: IntroRequest[]; groupInvites: GroupInvite[] } }) {
  const [received, setReceived] = React.useState(requests.received);
  const [invites, setInvites] = React.useState(requests.groupInvites);
  const [sent, setSent] = React.useState(requests.sent);
  React.useEffect(() => setReceived(requests.received), [requests.received]);
  React.useEffect(() => setInvites(requests.groupInvites), [requests.groupInvites]);
  React.useEffect(() => setSent(requests.sent), [requests.sent]);

  if (received.length === 0 && invites.length === 0 && sent.length === 0) {
    return (
      <EmptyState
        icon={<InboxIcon strokeWidth={1.5} />}
        title="No requests right now"
        description="Intros and group invites from other students land here. You decide who gets a chat."
      />
    );
  }

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-10">
        {received.length > 0 ? (
          <section aria-labelledby="req-intros">
            <h2 id="req-intros" className="mb-3 text-caption font-semibold tracking-wide text-ink-3 uppercase">
              Intros for you
            </h2>
            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {received.map((r) => (
                  <IntroCard key={r.id} request={r} onDone={() => setReceived((list) => list.filter((x) => x.id !== r.id))} />
                ))}
              </AnimatePresence>
            </ul>
          </section>
        ) : null}

        {invites.length > 0 ? (
          <section aria-labelledby="req-groups">
            <h2 id="req-groups" className="mb-3 text-caption font-semibold tracking-wide text-ink-3 uppercase">
              Group invites
            </h2>
            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {invites.map((invite) => (
                  <InviteCard key={invite.id} invite={invite} onDone={() => setInvites((list) => list.filter((x) => x.id !== invite.id))} />
                ))}
              </AnimatePresence>
            </ul>
          </section>
        ) : null}

        {sent.length > 0 ? (
          <section aria-labelledby="req-sent">
            <h2 id="req-sent" className="mb-3 text-caption font-semibold tracking-wide text-ink-3 uppercase">
              Sent · waiting for a reply
            </h2>
            <ul className="divide-y divide-line rounded-lg bg-surface ring-1 ring-line">
              <AnimatePresence initial={false}>
                {sent.map((r) => (
                  <SentRow key={r.id} request={r} onDone={() => setSent((list) => list.filter((x) => x.id !== r.id))} />
                ))}
              </AnimatePresence>
            </ul>
          </section>
        ) : null}
      </div>
    </LayoutGroup>
  );
}

function IntroCard({ request, onDone }: { request: IntroRequest; onDone: () => void }) {
  const router = useRouter();
  const overlay = useProfileOverlay();
  const [pending, setPending] = React.useState<"accept" | "decline" | null>(null);
  const name = displayName(request.person.firstName, request.person.lastInitial);

  async function respond(accept: boolean) {
    setPending(accept ? "accept" : "decline");
    const result = await respondToIntro(request.id, accept);
    if (!result.ok) {
      setPending(null);
      toast.error(result.error);
      return;
    }
    if (accept && result.data.conversationId) {
      router.push(`/messages/${result.data.conversationId}`);
      return;
    }
    onDone();
    toast(`Passed on ${request.person.firstName}`, { description: "They won't be told." });
  }

  function openProfile() {
    overlay?.open({
      id: request.person.id,
      firstName: request.person.firstName,
      lastInitial: request.person.lastInitial,
      classYear: request.person.classYear,
      major: request.person.major,
      avatarUrl: request.person.avatarUrl,
      placeholder: request.person.placeholder,
      photoCount: 1,
      verified: true,
      score: request.score ?? 0,
      reasons: request.reasons,
      watchouts: [],
      sharedArtists: [],
      budgetMin: 0,
      budgetMax: 0,
      moveInDate: null,
      areaNames: [],
      isSaved: false,
      introStatus: "pending",
    });
  }

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
      transition={spring}
      className="rounded-lg bg-surface p-4 shadow-sm ring-1 ring-line sm:p-5"
    >
      <div className="flex items-center gap-3.5">
        <button type="button" onClick={openProfile} className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus" aria-label={`View ${name}'s profile`}>
          <Avatar src={request.person.avatarUrl} firstName={request.person.firstName} lastInitial={request.person.lastInitial} size={52} />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={openProfile} className="text-left text-body font-semibold text-ink hover:underline">
            {name}
          </button>
          <p className="truncate text-body-sm text-ink-2">
            {[labelOf(CLASS_YEARS, request.person.classYear), request.person.major].filter(Boolean).join(" · ")}
          </p>
        </div>
        {request.score !== null ? <ScoreRing score={request.score} size={44} /> : null}
      </div>
      <p className="mt-4 rounded-md bg-surface-sunken px-3.5 py-3 text-body text-ink">{request.message}</p>
      {request.reasons[0] ? (
        <p className="mt-3 flex items-center gap-2 text-body-sm text-ink-2">
          <Sparkle className="size-3.5 shrink-0 fill-accent text-accent" strokeWidth={0} aria-hidden />
          {request.reasons[0]}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2.5">
        <Button variant="secondary" className="flex-1" onClick={() => void respond(false)} loading={pending === "decline"} disabled={pending !== null}>
          Pass
        </Button>
        <Button className="flex-[2]" onClick={() => void respond(true)} loading={pending === "accept"} disabled={pending !== null}>
          Accept & chat
        </Button>
      </div>
      <RelativeTime iso={request.createdAt} className="mt-2.5 block text-caption text-ink-3" />
    </motion.li>
  );
}

function InviteCard({ invite, onDone }: { invite: GroupInvite; onDone: () => void }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"accept" | "decline" | null>(null);
  const scores = invite.members.map((m) => m.score).filter((s): s is number => s !== null);
  const fit = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  async function respond(accept: boolean) {
    setPending(accept ? "accept" : "decline");
    const result = await respondToGroupRequest(invite.id, accept);
    if (!result.ok) {
      setPending(null);
      toast.error(result.error);
      return;
    }
    if (accept) {
      toast.success(`You joined ${invite.groupName}`);
      router.push(`/groups/${result.data.groupId}`);
      return;
    }
    onDone();
  }

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
      transition={spring}
      className="rounded-lg bg-surface p-4 shadow-sm ring-1 ring-line sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-ink">{invite.groupName}</p>
          <p className="text-body-sm text-ink-2">
            {invite.inviterName} invited you · {invite.members.length} of {invite.targetSize}
          </p>
        </div>
        {fit !== null ? <ScoreRing score={fit} size={44} /> : null}
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {invite.members.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-full bg-surface-sunken py-1 pr-3 pl-1">
            <Avatar src={m.avatarUrl} firstName={m.firstName} lastInitial={m.lastInitial} size={26} />
            <span className="text-body-sm text-ink">{m.firstName}</span>
            {m.score !== null ? <span className="text-caption text-ink-3 tabular">{m.score}%</span> : null}
          </li>
        ))}
      </ul>
      {invite.message ? <p className="mt-4 rounded-md bg-surface-sunken px-3.5 py-3 text-body text-ink">{invite.message}</p> : null}
      <div className="mt-4 flex gap-2.5">
        <Button variant="secondary" className="flex-1" onClick={() => void respond(false)} loading={pending === "decline"} disabled={pending !== null}>
          Decline
        </Button>
        <Button className="flex-[2]" onClick={() => void respond(true)} loading={pending === "accept"} disabled={pending !== null}>
          Join group
        </Button>
      </div>
    </motion.li>
  );
}

function SentRow({ request, onDone }: { request: IntroRequest; onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  async function withdraw() {
    setPending(true);
    const result = await withdrawIntro(request.id);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onDone();
  }
  return (
    <motion.li layout="position" exit={{ opacity: 0 }} className="flex items-center gap-3 p-3.5">
      <Avatar src={request.person.avatarUrl} firstName={request.person.firstName} lastInitial={request.person.lastInitial} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-ink">{displayName(request.person.firstName, request.person.lastInitial)}</p>
        <RelativeTime iso={request.createdAt} prefix="Sent " className="block truncate text-caption text-ink-3" />
      </div>
      <Button variant="ghost" size="sm" onClick={() => void withdraw()} loading={pending}>
        Withdraw
      </Button>
    </motion.li>
  );
}
