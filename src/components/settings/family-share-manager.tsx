"use client";

import * as React from "react";
import { Copy, Check, Trash2, HeartHandshake, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createFamilyShare,
  getFamilyShareStatus,
  revokeFamilyShare,
  type FamilyShareStatus,
} from "@/app/actions/family-share";

export function FamilyShareManager() {
  const [share, setShare] = React.useState<FamilyShareStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [includeAgreement, setIncludeAgreement] = React.useState(true);
  const [includePhotos, setIncludePhotos] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await getFamilyShareStatus();
        if (!cancelled && res.ok) {
          setShare(res.data.share);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const shareUrl = share
    ? typeof window !== "undefined"
      ? `${window.location.origin}/parent/${share.token}`
      : `/parent/${share.token}`
    : "";

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await createFamilyShare({
        include_agreement: includeAgreement,
        include_photos: includePhotos,
      });

      if (res.ok) {
        toast("Family link generated!", {
          description: "Anyone with this link can view your match overview.",
        });
        const refresh = await getFamilyShareStatus();
        if (refresh.ok) setShare(refresh.data.share);
      } else {
        toast("Could not create family link", { description: res.error });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!share) return;
    if (!confirm("Revoke this family share link? It will immediately stop working.")) return;

    setLoading(true);
    try {
      const res = await revokeFamilyShare(share.id);
      if (res.ok) {
        toast("Family share link revoked");
        setShare(null);
      } else {
        toast("Could not revoke link", { description: res.error });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Could not copy link");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5">
        <HeartHandshake className="mt-0.5 size-5 shrink-0 text-accent" />
        <div>
          <h4 className="text-body font-semibold text-ink">Parent & Family View</h4>
          <p className="mt-0.5 text-caption text-ink-2">
            Share a read-only overview of your roommate match with family. Never reveals chats, email addresses, or dorm room numbers.
          </p>
        </div>
      </div>

      {share ? (
        <div className="rounded-xl border border-line bg-surface-sunken p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-emerald-600">
              <ShieldCheck className="size-4" /> Active link
            </span>
            <span className="text-caption-xs text-ink-3">
              Expires {new Date(share.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Input readOnly value={shareUrl} className="font-mono text-caption" />
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </Button>
            <a
              href={`/parent/${share.token}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-caption font-medium text-ink hover:bg-surface-hover"
            >
              <ExternalLink className="size-3.5" /> View
            </a>
          </div>

          <div className="pt-2 text-right border-t border-line">
            <button
              type="button"
              onClick={handleRevoke}
              disabled={loading}
              className="inline-flex items-center gap-1 text-caption-xs font-medium text-rose-600 hover:underline"
            >
              <Trash2 className="size-3" /> Revoke link immediately
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-caption font-medium text-ink">
              <input
                type="checkbox"
                checked={includeAgreement}
                onChange={(e) => setIncludeAgreement(e.target.checked)}
                className="size-4 rounded accent-accent"
              />
              Show Roommate Agreement status (e.g. signed or draft)
            </label>
            <label className="flex items-center gap-2 text-caption font-medium text-ink">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                className="size-4 rounded accent-accent"
              />
              Include roommate photo (only if roommate has also consented)
            </label>
          </div>

          <Button
            size="sm"
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-accent text-white hover:opacity-90"
          >
            {loading ? "Generating..." : "Generate private family link"}
          </Button>
        </div>
      )}
    </div>
  );
}
