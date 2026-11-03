"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { createFamilyShare, getFamilyShareStatus, revokeFamilyShare, type FamilyShareStatus } from "@/app/actions/family-share";

/**
 * Family link (Phase 7.9): a read-only page with your match summary for a parent or
 * guardian. Roommates appear by name only if they turned on "Family can see my name".
 */
export function FamilyShareManager() {
  const [share, setShare] = React.useState<FamilyShareStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [includeAgreement, setIncludeAgreement] = React.useState(true);

  React.useEffect(() => {
    void getFamilyShareStatus().then((r) => {
      setLoading(false);
      if (r.ok) setShare(r.data.share);
      else setError(r.error);
    });
  }, []);

  const url = share ? `${window.location.origin}${share.path}` : "";

  async function create() {
    setPending(true);
    const r = await createFamilyShare({ includeAgreement });
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    setShare(r.data.share);
    toast.success("Family link ready");
  }

  async function revoke() {
    if (!share) return;
    setPending(true);
    const r = await revokeFamilyShare(share.id);
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    setShare(null);
    toast.success("Link turned off. It no longer opens.");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  }

  if (loading) return <Skeleton className="h-28 w-full rounded-md" />;
  if (error) return <p className="text-body-sm text-danger">{error}</p>;

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <p className="text-body-sm text-ink-2">
        Share a read-only page with a parent or guardian: your roommates&apos; first names (if they allow it), your match scores and top reasons. Never your messages.
      </p>
      {share ? (
        <>
          <div className="flex gap-2">
            <Input readOnly value={url} aria-label="Family link" onFocus={(e) => e.currentTarget.select()} />
            <Button variant="secondary" size="icon" aria-label="Copy family link" onClick={() => void copy()}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </Button>
          </div>
          <p className="text-caption text-ink-3">
            {share.includeAgreement ? "Includes your agreement status. " : ""}Works until {new Date(share.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href={share.path} target="_blank" rel="noopener">
                <ExternalLink aria-hidden /> Preview
              </a>
            </Button>
            <Button variant="danger-ghost" size="sm" loading={pending} onClick={() => void revoke()}>
              <Link2Off aria-hidden /> Turn off
            </Button>
          </div>
        </>
      ) : (
        <>
          <label className="flex items-center justify-between gap-3 text-body-sm text-ink">
            Include whether our agreement is signed
            <Switch checked={includeAgreement} onCheckedChange={setIncludeAgreement} aria-label="Include agreement status" />
          </label>
          <Button className="self-start" loading={pending} onClick={() => void create()}>
            Create family link
          </Button>
        </>
      )}
    </div>
  );
}
