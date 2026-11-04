"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/i18n";

export function CopyButton({
  value,
  label,
  size = "sm",
}: {
  value: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const t = useT("common");
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(t("copyFailed"));
    }
  }
  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={() => void copy()}
      aria-live="polite"
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? t("copied") : (label ?? t("copy"))}
    </Button>
  );
}
