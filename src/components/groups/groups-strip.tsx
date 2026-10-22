"use client";

import * as React from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/score-ring";
import { requestToJoin } from "@/app/actions/groups";

export interface GroupSuggestion {
  id: string;
  name: string;
  targetSize: number;
  memberCount: number;
  score: number;
  minScore: number;
  pending: boolean;
  members: { id: string; firstName: string; lastInitial: string; avatarUrl: string | null; score: number }[];
}

export function GroupsStrip({ groups }: { groups: GroupSuggestion[] }) {
  return (
    <section className="mb-10" aria-labelledby="groups-for-you">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 id="groups-for-you" className="text-title font-semibold text-ink">
            Groups with a room for you
          </h2>
          <p className="text-body-sm text-ink-2">Everyone in these groups is a mutual match with you.</p>
        </div>
      </div>
      <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </ul>
    </section>
  );
}

function GroupCard({ group }: { group: GroupSuggestion }) {
  const [pending, setPending] = React.useState(group.pending);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  async function request() {
    setLoading(true);
    const result = await requestToJoin({ groupId: group.id });
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      setPending(true);
      setSuccess(false);
    }, 900);
    toast.success(`Request sent to ${group.name}`, { description: "Anyone in the group can accept." });
  }

  const open = group.targetSize - group.memberCount;
  return (
    <li className="w-[280px] shrink-0 snap-start rounded-lg bg-surface p-4 shadow-sm ring-1 ring-line">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-ink">{group.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-caption text-ink-3">
            <Users className="size-3.5" strokeWidth={1.75} aria-hidden />
            {group.memberCount} of {group.targetSize} · {open} {open === 1 ? "spot" : "spots"} open
          </p>
        </div>
        <ScoreRing score={group.score} size={40} />
      </div>
      <ul className="mt-4 flex -space-x-2" aria-label="Members">
        {group.members.map((m) => (
          <li key={m.id} title={`${m.firstName} · ${m.score}%`}>
            <Avatar src={m.avatarUrl} firstName={m.firstName} lastInitial={m.lastInitial} size={32} className="rounded-full ring-2 ring-surface" />
          </li>
        ))}
      </ul>
      <p className="mt-3 text-caption text-ink-2">
        You fit {group.members.map((m) => m.firstName).join(", ")} — lowest pair {group.minScore}%.
      </p>
      <Button
        variant={pending ? "subtle" : "primary"}
        size="sm"
        block
        className="mt-4"
        disabled={pending}
        loading={loading}
        success={success}
        successLabel="Requested"
        onClick={() => void request()}
      >
        {pending ? "Request pending" : "Ask to join"}
      </Button>
    </li>
  );
}
