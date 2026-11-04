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
import { useT } from "@/components/providers/i18n";

export function CreateGroupSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const t = useT("groups");
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
    toast.success(t("create.ready", { name: name.trim() }), { description: t("create.readyHint") });
    router.push(`/groups/${result.data.id}`);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("create.title")}
      description={t("create.description")}
      footer={
        <Button
          size="lg"
          block
          loading={pending}
          onClick={() => void submit()}
          disabled={!name.trim()}
        >
          {t("create.submit")}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <Field label={t("create.name")} error={error} hint={t("create.nameHint")}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("create.namePlaceholder")}
              maxLength={40}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              autoFocus
            />
          )}
        </Field>
        <div className="flex flex-col gap-3">
          <p className="text-body-sm font-medium text-ink">{t("create.total")}</p>
          <SegmentedControl
            aria-label={t("create.size")}
            value={size}
            onValueChange={setSize}
            options={[
              { value: "2", label: t("create.people", { n: 2 }) },
              { value: "3", label: t("create.people", { n: 3 }) },
              { value: "4", label: t("create.people", { n: 4 }) },
            ]}
          />
          <p className="text-body-sm text-ink-3">
            {size === "2" ? t("create.two") : size === "3" ? t("create.three") : t("create.four")}
          </p>
        </div>
      </div>
    </Sheet>
  );
}
