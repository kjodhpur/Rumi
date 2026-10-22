"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteToGroup } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteMemberForm({
  groupId,
  candidates = [],
}: {
  groupId: string;
  /** Saved / intro-accepted people the owner can add quickly */
  candidates?: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function invite(id: string) {
    startTransition(async () => {
      setError(null);
      const res = await inviteToGroup(groupId, id.trim());
      if (res.error) {
        setError(res.error);
        return;
      }
      setUserId("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      {candidates.length ? (
        <div className="space-y-2">
          <p className="font-ui text-sm font-medium">Invite from your connections</p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => invite(c.id)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          invite(userId);
        }}
      >
        <Label htmlFor="invite">Or paste profile ID</Label>
        <p className="text-xs text-ink-muted">
          From a profile URL: `/profile/&lt;id&gt;`. Prefer inviting people you already intro’d.
        </p>
        <div className="flex gap-2">
          <Input
            id="invite"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="uuid"
            required={!candidates.length}
          />
          <Button type="submit" disabled={pending || !userId.trim()}>
            Add
          </Button>
        </div>
      </form>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
