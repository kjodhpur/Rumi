"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroup } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [maxMembers, setMaxMembers] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="font-ui text-3xl font-bold tracking-brand text-ink">Create a group</h1>
        <p className="mt-1 text-ink-muted">2–4 people looking for a place together.</p>
      </div>
      <form
        className="space-y-4 rounded-lg border border-border bg-bg-elevated p-5 shadow-elevation1"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            setError(null);
            const res = await createGroup({ name, maxMembers });
            if ("error" in res && res.error) {
              setError(res.error);
              return;
            }
            if (res.groupId) router.push(`/groups/${res.groupId}`);
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Group name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tempe trio"
            required
            minLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max">Max members</Label>
          <select
            id="max"
            className="font-ui h-11 w-full rounded-md border border-border bg-bg px-3 text-sm"
            value={maxMembers}
            onChange={(e) => setMaxMembers(Number(e.target.value))}
          >
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating…" : "Create group"}
        </Button>
      </form>
    </div>
  );
}
