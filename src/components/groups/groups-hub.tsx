"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { cancelGroupRequest } from "@/app/actions/groups";
import { CreateGroupSheet } from "./create-group-sheet";
import { GroupsStrip, type GroupSuggestion } from "./groups-strip";

export function GroupsHub({
  suggestions,
  myRequests,
}: {
  suggestions: GroupSuggestion[];
  myRequests: { id: string; groupId: string; groupName: string; createdAt: string }[];
}) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [requests, setRequests] = React.useState(myRequests);

  async function cancel(id: string) {
    const result = await cancelGroupRequest(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setRequests((list) => list.filter((r) => r.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Match as a group for three- and four-bedroom places."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="max-sm:hidden">
            <Plus /> Start a group
          </Button>
        }
      />

      <section className="mb-10 overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-display-sm text-ink">Bigger place, better rent.</h2>
            <p className="mt-2 max-w-md text-body-sm text-ink-2">
              Start a group with a friend — or on your own — and we&apos;ll rank everyone else by how well they fit
              <em> all</em> of you. Dealbreakers apply to every member.
            </p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus /> Start a group
          </Button>
        </div>
        <ol className="grid border-t border-line text-body-sm sm:grid-cols-3">
          {[
            ["1", "Create", "Name it and pick 2–4 bedrooms."],
            ["2", "Invite", "People who fit everyone rise to the top."],
            ["3", "Plan", "A group chat opens as people join."],
          ].map(([n, title, text]) => (
            <li key={n} className="flex gap-3 border-line px-6 py-4 max-sm:border-t sm:border-l sm:first:border-l-0 sm:px-8">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-caption font-semibold text-ink-2 tabular">
                {n}
              </span>
              <span>
                <span className="font-medium text-ink">{title}</span>
                <span className="block text-ink-3">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {requests.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 text-caption font-semibold tracking-wide text-ink-3 uppercase">Your requests</h2>
          <ul className="divide-y divide-line rounded-lg bg-surface ring-1 ring-line">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
                  <Users className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium text-ink">{r.groupName}</p>
                  <RelativeTime iso={r.createdAt} prefix="Requested " className="block text-caption text-ink-3" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => void cancel(r.id)}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {suggestions.length > 0 ? (
        <GroupsStrip groups={suggestions} />
      ) : (
        <EmptyState
          icon={<Users strokeWidth={1.5} />}
          title="No open groups fit you yet"
          description="When groups form with room for someone like you, they'll show up here — or start your own."
        />
      )}

      <CreateGroupSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
