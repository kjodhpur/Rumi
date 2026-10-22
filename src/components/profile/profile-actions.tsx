"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  blockUser,
  hideProfile,
  reportUser,
  saveProfile,
  unsaveProfile,
} from "@/app/actions/social";
import { sendIntro } from "@/app/actions/intros";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FIRST_MESSAGE_MIN_CHARS, REPORT_REASONS } from "@/lib/constants";

export function ProfileActions({
  profileId,
  initiallySaved,
  introStatus,
  conversationId,
}: {
  profileId: string;
  initiallySaved: boolean;
  introStatus?: "none" | "pending_sent" | "pending_received" | "accepted" | "declined";
  conversationId?: string | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [message, setMessage] = useState("");
  const [showIntro, setShowIntro] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("spam");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const status = introStatus ?? "none";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "accepted" && conversationId ? (
          <Button type="button" onClick={() => router.push(`/messages/${conversationId}`)}>
            Open chat
          </Button>
        ) : status === "pending_sent" ? (
          <Button type="button" variant="secondary" disabled>
            Intro pending
          </Button>
        ) : status === "pending_received" ? (
          <Button type="button" variant="secondary" onClick={() => router.push("/intros")}>
            Respond in Intros
          </Button>
        ) : (
          <Button type="button" onClick={() => setShowIntro((v) => !v)}>
            Send intro
          </Button>
        )}
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

      {showIntro ? (
        <div className="space-y-2 rounded-md border border-border bg-bg-elevated p-3 shadow-elevation1">
          <p className="font-ui text-sm font-medium text-ink">
            Send an intro — chat unlocks when they accept.
          </p>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Write at least ${FIRST_MESSAGE_MIN_CHARS} characters`}
          />
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await sendIntro({
                  toUserId: profileId,
                  message,
                });
                if ("error" in res && res.error) {
                  setError(res.error);
                  return;
                }
                setShowIntro(false);
                router.push("/intros");
              })
            }
          >
            Send intro
          </Button>
        </div>
      ) : null}

      {showReport ? (
        <div className="space-y-2 rounded-md border border-border bg-bg-elevated p-3">
          <select
            className="font-ui h-10 w-full rounded-md border border-border bg-bg px-2 text-sm"
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
