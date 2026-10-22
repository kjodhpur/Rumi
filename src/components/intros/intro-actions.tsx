"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToIntro, withdrawIntro } from "@/app/actions/intros";
import { Button } from "@/components/ui/button";

export function IntroActions({
  introId,
  mode,
}: {
  introId: string;
  mode: "receive" | "withdraw";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (mode === "withdraw") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await withdrawIntro(introId);
            router.refresh();
          })
        }
      >
        Withdraw
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await respondToIntro(introId, "accepted");
            router.refresh();
            router.push("/messages");
          })
        }
      >
        Accept
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await respondToIntro(introId, "declined");
            router.refresh();
          })
        }
      >
        Decline
      </Button>
    </div>
  );
}
