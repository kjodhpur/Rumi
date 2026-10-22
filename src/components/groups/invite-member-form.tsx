"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteToGroup } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteMemberForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2 border-t border-border pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          const res = await inviteToGroup(groupId, userId.trim());
          if (res.error) {
            setError(res.error);
            return;
          }
          setUserId("");
          router.refresh();
        });
      }}
    >
      <Label htmlFor="invite">Invite by user ID</Label>
      <p className="text-xs text-ink-muted">
        Paste a teammate’s profile UUID (from their profile URL). They must already be on Rumi.
      </p>
      <div className="flex gap-2">
        <Input
          id="invite"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="uuid"
          required
        />
        <Button type="submit" disabled={pending}>
          Add
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
