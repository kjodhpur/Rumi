"use client";

import * as React from "react";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Errors inside the staff dashboard keep the staff navigation around them. */
export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <EmptyState
      icon={<CloudOff strokeWidth={1.5} />}
      title="That didn't load"
      description={
        <>
          Try again in a moment. Nothing you saved was lost.
          {error.digest ? (
            <span className="mt-2 block text-caption text-ink-3">Reference: {error.digest}</span>
          ) : null}
        </>
      }
      action={
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
