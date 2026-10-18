"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveReport, suspendUser } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function AdminActions({
  reportId,
  userId,
  suspended,
}: {
  reportId: string;
  userId: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resolveReport(reportId, "resolved");
            router.refresh();
          })
        }
      >
        Resolve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resolveReport(reportId, "dismissed");
            router.refresh();
          })
        }
      >
        Dismiss
      </Button>
      <Button
        type="button"
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await suspendUser(userId, !suspended);
            router.refresh();
          })
        }
      >
        {suspended ? "Unsuspend user" : "Suspend user"}
      </Button>
    </div>
  );
}
