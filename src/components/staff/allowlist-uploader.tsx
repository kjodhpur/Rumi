"use client";

import * as React from "react";
import { UploadCloud, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { uploadAdmitAllowlist } from "@/app/actions/admissions";

interface AllowlistUploaderProps {
  schoolId: string;
}

export function AllowlistUploader({ schoolId }: AllowlistUploaderProps) {
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      toast("Please paste or enter email addresses");
      return;
    }

    setLoading(true);
    const res = await uploadAdmitAllowlist(schoolId, content);
    setLoading(false);

    if (res.ok) {
      toast.success(`Allowlisted ${res.data.uploadedCount} admitted students`, {
        description: "Hashed with SHA-256 for privacy. Zero plaintext emails stored.",
      });
      setContent("");
      setOpen(false);
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5"
      >
        <UploadCloud className="size-4 text-accent" />
        <span>Import Admit Allowlist</span>
      </Button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Admit allowlist for incoming students"
        description="Allow incoming students who don't yet have university SSO or email accounts to join the pre-arrival matching pool."
        size="md"
      >
        <form onSubmit={handleUpload} className="space-y-4 py-2">
          <div className="rounded-xl border border-line bg-surface-sunken p-3 text-caption text-ink-2">
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <ShieldCheck className="size-4 text-accent" />
              <span>FERPA & Zero-PII Compliance</span>
            </div>
            <p className="mt-1 text-caption-xs text-ink-3">
              Uploaded personal emails are hashed with SHA-256 before insertion. Plaintext personal emails are never persisted to Postgres.
            </p>
          </div>

          <div>
            <label className="text-body-xs font-semibold text-ink">
              Admit email addresses (CSV or one per line)
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="alex.smith@gmail.com&#10;taylor.jones@yahoo.com&#10;jordan@outlook.com"
              className="mt-1 font-mono text-body-xs"
              rows={8}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-accent text-white hover:opacity-90"
            disabled={loading || !content.trim()}
          >
            {loading ? "Processing hashes..." : "Allowlist admitted students"}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
