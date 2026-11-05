"use client";

import * as React from "react";
import { CloudOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/i18n";

/** Errors inside the app keep the navigation around them. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT("pages");
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={<CloudOff strokeWidth={1.5} />}
      title={t("appError.title")}
      description={
        <>
          {t("appError.body")}
          {error.digest ? (
            <span className="mt-2 block text-caption text-ink-3">
              {t("appError.reference", { digest: error.digest })}
            </span>
          ) : null}
        </>
      }
      action={
        <Button variant="secondary" onClick={reset}>
          {t("tryAgain")}
        </Button>
      }
    />
  );
}
