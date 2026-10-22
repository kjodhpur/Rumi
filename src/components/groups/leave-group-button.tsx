"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveGroup } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await leaveGroup(groupId);
          router.push("/groups");
        })
      }
    >
      Leave
    </Button>
  );
}
