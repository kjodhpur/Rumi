"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, UserRoundSearch } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { sendNudges } from "@/app/actions/staff-dashboard";
import { CLASS_YEARS, HOUSING_TYPES, labelOf } from "@/lib/options";
import type { UnmatchedStudent } from "@/lib/staff/dashboard";

const moveIn = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—";

export function UnmatchedStudents({
  schoolId,
  office,
  students,
}: {
  schoolId: string;
  office: string | null;
  students: UnmatchedStudent[] | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, setPending] = React.useState(false);
  const list = students ?? [];
  const allSelected = list.length > 0 && selected.size === list.length;

  function toggle(id: string, on: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function nudge() {
    setPending(true);
    const result = await sendNudges({ schoolId, userIds: [...selected] });
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success(`Nudge sent to ${result.data.sent} ${result.data.sent === 1 ? "student" : "students"}`, {
      description: result.data.skipped ? `${result.data.skipped} skipped: nudged in the last 7 days or no longer eligible.` : undefined,
    });
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Students"
        description="Students who finished their profile, haven't paired up yet, and chose to share their results with you."
        className="pb-0 lg:pb-0"
      />

      {students === null ? (
        <ErrorState title="Couldn't load students" description="Refresh the page to try again." />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<UserRoundSearch strokeWidth={1.75} />}
          title={office ? "Nobody's waiting" : "Sharing isn't on yet"}
          description={
            office
              ? "Every sharing student with a finished profile is in a pair or group. Totals for everyone are on the overview."
              : "Students can share their results with your office once your pilot agreement is signed. Until then, the overview shows totals."
          }
        />
      ) : (
        <>
          <div className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
            <label className="flex items-center gap-2.5 text-body-sm text-ink">
              <Checkbox
                checked={allSelected ? true : selected.size > 0 ? "indeterminate" : false}
                onCheckedChange={(v) => setSelected(v === true ? new Set(list.map((s) => s.id)) : new Set())}
                aria-label="Select all students"
              />
              {selected.size > 0 ? `${selected.size} selected` : `${list.length} students`}
            </label>
            <Button className="ml-auto" disabled={selected.size === 0} loading={pending} onClick={() => void nudge()}>
              <Send aria-hidden /> Send a nudge
            </Button>
          </div>
          <p className="-mt-2 text-caption text-ink-3">
            A nudge is a short email and in-app note pointing them to their best matches. Each student gets at most one a week.
          </p>

          <div className="overflow-hidden rounded-xl bg-surface shadow-xs ring-1 ring-line">
            <table className="w-full text-left text-body-sm">
              <caption className="sr-only">Unmatched students who chose to share</caption>
              <thead className="hidden border-b border-line bg-surface-sunken/60 text-caption text-ink-3 md:table-header-group">
                <tr>
                  <th scope="col" className="w-12 py-2.5 pl-5">
                    <span className="sr-only">Select</span>
                  </th>
                  <th scope="col" className="py-2.5 pr-3 font-medium">Student</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Housing</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Move-in</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">Best match</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">70+ matches</th>
                  <th scope="col" className="py-2.5 pr-5 pl-3 font-medium">Last nudge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((s) => (
                  <tr key={s.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-x-2 px-4 py-3 md:table-row md:px-0 md:py-0">
                    <td className="md:py-3 md:pl-5">
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={(v) => toggle(s.id, v === true)}
                        aria-label={`Select ${s.name}`}
                      />
                    </td>
                    <td className="min-w-0 md:py-3 md:pr-3">
                      <span className="block truncate font-medium text-ink">{s.name}</span>
                      <span className="block text-caption text-ink-3">
                        {s.classYear ? labelOf(CLASS_YEARS, s.classYear) : "Year not set"}
                        <span className="md:hidden">
                          {" · "}
                          {s.housingType ? labelOf(HOUSING_TYPES, s.housingType) : ""} · moves in {moveIn(s.moveInDate)}
                        </span>
                      </span>
                    </td>
                    <td className="hidden px-3 text-ink-2 md:table-cell md:py-3">{s.housingType ? labelOf(HOUSING_TYPES, s.housingType) : "—"}</td>
                    <td className="hidden px-3 text-ink-2 tabular-nums md:table-cell md:py-3">{moveIn(s.moveInDate)}</td>
                    <td className="text-right font-semibold text-ink tabular-nums md:px-3 md:py-3">
                      {s.bestScore ?? "—"}
                      <span className="block text-caption font-normal text-ink-3 md:hidden">{s.strongMatches} at 70+</span>
                    </td>
                    <td className="hidden px-3 text-right text-ink-2 tabular-nums md:table-cell md:py-3">{s.strongMatches}</td>
                    <td className="hidden pr-5 pl-3 text-caption text-ink-3 md:table-cell md:py-3">
                      {s.lastNudgedAt ? <RelativeTime iso={s.lastNudgedAt} /> : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
