import { Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/** Shown when a signed-in staff member opens a page their role can't use. */
export function PermissionDenied({ title, description }: { title: string; description: string }) {
  return <EmptyState icon={<Lock strokeWidth={1.75} />} title={`${title} isn't available to you`} description={description} />;
}
