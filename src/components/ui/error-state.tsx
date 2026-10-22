import Link from "next/link";
import { CloudOff } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again in a moment.",
  retryHref,
}: {
  title?: string;
  description?: string;
  retryHref?: string;
}) {
  return (
    <EmptyState
      icon={<CloudOff strokeWidth={1.5} />}
      title={title}
      description={description}
      action={
        retryHref ? (
          <Button asChild variant="secondary">
            <Link href={retryHref}>Try again</Link>
          </Button>
        ) : undefined
      }
    />
  );
}
