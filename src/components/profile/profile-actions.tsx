"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  blockUser,
  hideProfile,
  reportUser,
  saveProfile,
  startConversation,
  unsaveProfile,
} from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS } from "@/lib/constants";

export function ProfileActions({
  profileId,
  initiallySaved,
}: {
  profileId: string;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("spam");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setShowMessage((v) => !v)}>
          Message
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (saved) {
                await unsaveProfile(profileId);
                setSaved(false);
              } else {
                await saveProfile(profileId);
                setSaved(true);
              }
            })
          }
        >
          {saved ? "Saved" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await hideProfile(profileId);
              router.push("/matches");
            })
          }
        >
          Hide
        </Button>
        <Button type="button" variant="ghost" onClick={() => setShowReport((v) => !v)}>
          Report
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await blockUser(profileId);
              router.push("/matches");
            })
          }
        >
          Block
        </Button>
      </div>

      {showMessage ? (
        <div className="space-y-2 rounded-xl border border-rumi-sand bg-white p-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say hi — at least 20 characters for the first message"
          />
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await startConversation({
                  recipientId: profileId,
                  body: message,
                });
                if ("error" in res && res.error) {
                  setError(res.error);
                  return;
                }
                if (res.conversationId) router.push(`/messages/${res.conversationId}`);
              })
            }
          >
            Send
          </Button>
        </div>
      ) : null}

      {showReport ? (
        <div className="space-y-2 rounded-xl border border-rumi-sand bg-white p-3">
          <select
            className="h-10 w-full rounded-xl border border-rumi-sand px-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value as (typeof REPORT_REASONS)[number])}
          >
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await reportUser({ reportedId: profileId, reason });
                setShowReport(false);
              })
            }
          >
            Submit report
          </Button>
        </div>
      ) : null}
    </div>
  );
}
