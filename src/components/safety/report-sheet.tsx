"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OptionCards } from "@/components/ui/choice";
import { reportUser } from "@/app/actions/social";
import { REPORT_REASONS, type ReportReason } from "@/lib/options";
import { LAUNCH_SCHOOL } from "@/lib/school";

type Reason = ReportReason;

export function ReportSheet({
  open,
  onOpenChange,
  reportedId,
  firstName,
  messageId,
  conversationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedId: string;
  firstName: string;
  messageId?: string;
  conversationId?: string;
}) {
  const [reason, setReason] = React.useState<Reason | "">("");
  const [details, setDetails] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    if (!reason) {
      setError("Choose what's going on.");
      return;
    }
    setPending(true);
    const result = await reportUser({ reportedId, reason, details: details || undefined, messageId, conversationId });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    setReason("");
    setDetails("");
    toast.success("Thanks for telling us", {
      description: `Our team reviews every report. ${firstName} won't know it was you.`,
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Report ${firstName}`}
      description={`Reports are confidential. If you're in danger, call 911 or ${LAUNCH_SCHOOL.police.name} at ${LAUNCH_SCHOOL.police.phone}.`}
      footer={
        <Button variant="danger" size="lg" block onClick={() => void submit()} loading={pending}>
          Send report
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <OptionCards
          aria-label="Reason for report"
          value={reason}
          onValueChange={(v) => {
            setReason(v);
            setError(null);
          }}
          options={REPORT_REASONS}
          columns={2}
          className="grid-cols-1 sm:grid-cols-2"
        />
        <Textarea
          aria-label="Details (optional)"
          placeholder="Anything that helps us understand (optional)"
          rows={3}
          maxLength={1000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        {error ? (
          <p role="alert" className="text-body-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
