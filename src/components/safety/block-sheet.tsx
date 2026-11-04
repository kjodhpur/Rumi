"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { blockUser } from "@/app/actions/social";
import { useT } from "@/components/providers/i18n";

export function BlockSheet({
  open,
  onOpenChange,
  userId,
  firstName,
  onBlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  firstName: string;
  onBlocked: () => void;
}) {
  const t = useT("safety");
  const [pending, setPending] = React.useState(false);

  async function confirm() {
    setPending(true);
    const result = await blockUser(userId);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onOpenChange(false);
    toast.success(t("block.blocked", { name: firstName }), { description: t("block.blockedHint") });
    onBlocked();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={t("block.title", { name: firstName })}
      description={t("block.description")}
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            {t("block.cancel")}
          </Button>
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            onClick={() => void confirm()}
            loading={pending}
          >
            {t("block.block")}
          </Button>
        </div>
      }
    >
      <p className="text-body-sm text-ink-2">{t("block.tip")}</p>
    </Sheet>
  );
}
