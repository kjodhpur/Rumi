"use client";

import Link from "next/link";
import { useT } from "@/components/providers/i18n";
import { CloudOff } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

export function ErrorState({
  title,
  description,
  retryHref,
}: {
  title?: string;
  description?: string;
  retryHref?: string;
}) {
  const t = useT("common");
  return (
    <EmptyState
      icon={<CloudOff strokeWidth={1.5} />}
      title={title ?? t("somethingWrong")}
      description={description ?? t("tryMoment")}
      action={
        retryHref ? (
          <Button asChild variant="secondary">
            <Link href={retryHref}>{t("tryAgain")}</Link>
          </Button>
        ) : undefined
      }
    />
  );
}
