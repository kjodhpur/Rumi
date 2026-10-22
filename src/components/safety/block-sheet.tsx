"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { blockUser } from "@/app/actions/social";

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
    toast.success(`${firstName} is blocked`, { description: "You can unblock them in Settings → Privacy." });
    onBlocked();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={`Block ${firstName}?`}
      description="You won't see each other anywhere on Rumi, and any chat between you closes. They aren't notified."
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="lg" className="flex-1" onClick={() => void confirm()} loading={pending}>
            Block
          </Button>
        </div>
      }
    >
      <p className="text-body-sm text-ink-2">
        If they did something wrong, consider reporting them too — it helps keep everyone safe.
      </p>
    </Sheet>
  );
}
