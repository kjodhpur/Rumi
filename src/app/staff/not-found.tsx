import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Staff pages call notFound() both for missing records and for roles that can't open them. */
export default function StaffNotFound() {
  return (
    <EmptyState
      icon={<Lock strokeWidth={1.75} />}
      title="This page isn't available to you"
      description="It may not exist, or your role can't open it. Ask a housing admin if you need access."
      action={
        <Button asChild variant="secondary">
          <Link href="/staff">Back to overview</Link>
        </Button>
      }
    />
  );
}
