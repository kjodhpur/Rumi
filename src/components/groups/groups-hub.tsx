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
import { useT } from "@/components/providers/i18n";

export function GroupsHub({
  suggestions,
  myRequests,
}: {
  suggestions: GroupSuggestion[];
  myRequests: { id: string; groupId: string; groupName: string; createdAt: string }[];
}) {
  const t = useT("groups");
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
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={() => setCreateOpen(true)} className="max-sm:hidden">
            <Plus /> {t("start")}
          </Button>
        }
      />

      <section className="mb-10 overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div>
            <h2 className="font-display text-display-sm text-ink">{t("heroTitle")}</h2>
            <p className="mt-2 max-w-md text-body-sm text-ink-2">
              {t("heroLead")} <em>{t("heroEm")}</em> {t("heroTail")}
            </p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus /> {t("start")}
          </Button>
        </div>
        <ol className="grid border-t border-line text-body-sm sm:grid-cols-3">
          {[
            ["1", t("steps.createTitle"), t("steps.createBody")],
            ["2", t("steps.inviteTitle"), t("steps.inviteBody")],
            ["3", t("steps.planTitle"), t("steps.planBody")],
          ].map(([n, title, text]) => (
            <li
              key={n}
              className="flex gap-3 border-line px-6 py-4 max-sm:border-t sm:border-l sm:px-8 sm:first:border-l-0"
            >
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
          <h2 className="mb-3 text-caption font-semibold tracking-wide text-ink-3 uppercase">
            {t("yourRequests")}
          </h2>
          <ul className="divide-y divide-line rounded-lg bg-surface ring-1 ring-line">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
                  <Users className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium text-ink">{r.groupName}</p>
                  <RelativeTime
                    iso={r.createdAt}
                    prefix={t("requestedAgo")}
                    className="block text-caption text-ink-3"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => void cancel(r.id)}>
                  {t("cancel")}
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
          title={t("noneFit")}
          description={t("noneFitBody")}
        />
      )}

      <CreateGroupSheet open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
