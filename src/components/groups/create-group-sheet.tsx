"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { createGroup } from "@/app/actions/groups";

export function CreateGroupSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [size, setSize] = React.useState<"2" | "3" | "4">("3");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const result = await createGroup({ name, targetSize: Number(size) });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    toast.success(`${name.trim()} is ready`, { description: "Invite people who fit — we'll rank them for you." });
    router.push(`/groups/${result.data.id}`);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Start a group"
      description="Team up for a bigger place. We'll rank people by how well they fit everyone in the group."
      footer={
        <Button size="lg" block loading={pending} onClick={() => void submit()} disabled={!name.trim()}>
          Create group
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <Field label="Group name" error={error} hint="Something your future roommates will recognize.">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tempe 4BR crew"
              maxLength={40}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              autoFocus
            />
          )}
        </Field>
        <div className="flex flex-col gap-3">
          <p className="text-body-sm font-medium text-ink">Total roommates, including you</p>
          <SegmentedControl
            aria-label="Group size"
            value={size}
            onValueChange={setSize}
            options={[
              { value: "2", label: "2 people" },
              { value: "3", label: "3 people" },
              { value: "4", label: "4 people" },
            ]}
          />
          <p className="text-body-sm text-ink-3">
            {size === "2" ? "A two-bedroom." : size === "3" ? "A three-bedroom house or apartment." : "A four-bedroom — the best rent per person near campus."}
          </p>
        </div>
      </div>
    </Sheet>
  );
}
