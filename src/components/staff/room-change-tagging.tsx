"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { saveRoomChangeReason, tagRoomChange } from "@/app/actions/room-changes";

export interface QueueItem {
  id: string;
  student: string;
  building: string;
  createdAt: string;
  source: "student" | "import" | "staff";
  reasonKeys: string[];
  staffNote: string | null;
  studentNote: string | null;
}

export interface ReasonOption {
  key: string;
  label: string;
  active: boolean;
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function RoomChangeQueue({
  schoolId,
  items,
  reasons,
}: {
  schoolId: string;
  items: QueueItem[];
  reasons: ReasonOption[];
}) {
  const [editing, setEditing] = React.useState<QueueItem | null>(null);
  const label = (k: string) => reasons.find((r) => r.key === k)?.label ?? k;
  const untagged = items.filter((i) => !i.reasonKeys.length);
  return (
    <section
      className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
      aria-labelledby="queue-title"
    >
      <h2 id="queue-title" className="text-body font-semibold text-ink">
        Tag requests{" "}
        {untagged.length ? (
          <span className="font-normal text-ink-3">({untagged.length} untagged)</span>
        ) : null}
      </h2>
      <p className="mt-1 text-body-sm text-ink-2">
        Imported changes arrive without reasons. Tag each with up to three; changing tags later is
        recorded in the audit log.
      </p>
      {items.length ? (
        <ul className="mt-4 divide-y divide-line rounded-lg ring-1 ring-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-ink">
                  {item.student} · {item.building}
                </p>
                <p className="text-caption text-ink-3">
                  {when(item.createdAt)} ·{" "}
                  {item.source === "import"
                    ? "From StarRez"
                    : item.source === "staff"
                      ? "Added by staff"
                      : "Asked in Rumi"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.reasonKeys.length ? (
                    item.reasonKeys.map((k) => (
                      <Badge key={k} size="sm">
                        {label(k)}
                      </Badge>
                    ))
                  ) : (
                    <Badge size="sm" variant="warning">
                      Untagged
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={item.reasonKeys.length ? "ghost" : "secondary"}
                onClick={() => setEditing(item)}
              >
                {item.reasonKeys.length ? "Retag" : "Tag now"}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-md bg-surface-sunken p-3 text-body-sm text-ink-2">
          No room-change requests yet.
        </p>
      )}
      {editing ? (
        <TagSheet
          key={editing.id}
          schoolId={schoolId}
          item={editing}
          reasons={reasons.filter((r) => r.active)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}

function TagSheet({
  schoolId,
  item,
  reasons,
  onClose,
}: {
  schoolId: string;
  item: QueueItem;
  reasons: ReasonOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [keys, setKeys] = React.useState(
    item.reasonKeys.filter((k) => reasons.some((r) => r.key === k)),
  );
  const [note, setNote] = React.useState(item.staffNote ?? "");
  const [pending, setPending] = React.useState(false);
  async function save() {
    setPending(true);
    const r = await tagRoomChange({ schoolId, id: item.id, reasonKeys: keys, staffNote: note });
    setPending(false);
    if (!r.ok) return toast.error(r.error);
    toast.success("Tags saved");
    onClose();
    router.refresh();
  }
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Why ${item.student} is moving`}
      description={item.building}
      footer={
        <Button block loading={pending} disabled={!keys.length} onClick={() => void save()}>
          Save tags
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {item.studentNote ? (
          <p className="rounded-md bg-surface-sunken p-3 text-body-sm text-ink-2">
            &ldquo;{item.studentNote}&rdquo;
          </p>
        ) : null}
        <div role="group" aria-label="Reasons, up to three" className="flex flex-wrap gap-2">
          {reasons.map((r) => {
            const on = keys.includes(r.key);
            return (
              <ToggleChip
                key={r.key}
                pressed={on}
                disabled={!on && keys.length >= 3}
                onPressedChange={(p) =>
                  setKeys((k) => (p ? [...k, r.key] : k.filter((x) => x !== r.key)))
                }
              >
                {r.label}
              </ToggleChip>
            );
          })}
        </div>
        <Field label="Staff note" hint="Visible to housing staff only." aside="Optional">
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Sheet>
  );
}

export function ReasonTaxonomy({
  schoolId,
  reasons,
}: {
  schoolId: string;
  reasons: ReasonOption[];
}) {
  const router = useRouter();
  const [list, setList] = React.useState(reasons);
  const [draft, setDraft] = React.useState({ key: "", label: "" });
  const [pending, setPending] = React.useState<string | null>(null);
  async function save(r: ReasonOption) {
    setPending(r.key);
    const res = await saveRoomChangeReason({ schoolId, ...r });
    setPending(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Saved");
    router.refresh();
  }
  return (
    <section
      className="rounded-xl bg-surface p-5 ring-1 ring-line sm:p-6"
      aria-labelledby="taxonomy-title"
    >
      <h2 id="taxonomy-title" className="text-body font-semibold text-ink">
        Reasons
      </h2>
      <p className="mt-1 text-body-sm text-ink-2">
        Your list. Turn a reason off rather than renaming it to mean something else, so past tags
        stay true.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {list.map((r, i) => (
          <li key={r.key} className="flex flex-wrap items-center gap-2">
            <Input
              aria-label={`Label for ${r.key}`}
              className="min-w-[180px] flex-1"
              value={r.label}
              maxLength={60}
              onChange={(e) =>
                setList((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <Switch
              checked={r.active}
              aria-label={`${r.label} in use`}
              onCheckedChange={(v) =>
                setList((l) => l.map((x, j) => (j === i ? { ...x, active: v } : x)))
              }
            />
            <Button
              size="sm"
              variant="secondary"
              loading={pending === r.key}
              onClick={() => void save(list[i])}
            >
              Save
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => (
          e.preventDefault(),
          void save({ ...draft, active: true }).then(() => setDraft({ key: "", label: "" }))
        )}
      >
        <Field label="New reason" className="min-w-[180px] flex-1">
          {({ id }) => (
            <Input
              id={id}
              value={draft.label}
              maxLength={60}
              onChange={(e) =>
                setDraft({
                  label: e.target.value,
                  key: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z]+/g, "_")
                    .replace(/^_|_$/g, "")
                    .slice(0, 30),
                })
              }
              placeholder="Temperature"
            />
          )}
        </Field>
        <Button type="submit" variant="ghost" disabled={draft.key.length < 2}>
          <Plus aria-hidden /> Add
        </Button>
      </form>
    </section>
  );
}
