"use client";

import * as React from "react";
import { CloudOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/** Errors inside the app keep the navigation around them. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={<CloudOff strokeWidth={1.5} />}
      title="That didn't load"
      description={
        <>
          Check your connection and try again.
          {error.digest ? <span className="mt-2 block text-caption text-ink-3">Reference: {error.digest}</span> : null}
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
