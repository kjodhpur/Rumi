"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton({ className, label = "Try again", onRetry }: { className?: string; label?: string; onRetry?: () => void }) {
  return (
    <Button size="lg" variant="primary" className={className} onClick={() => (onRetry ? onRetry() : window.location.reload())}>
      <RotateCw strokeWidth={1.75} aria-hidden /> {label}
    </Button>
  );
}
