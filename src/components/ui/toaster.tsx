"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as "light" | "dark") ?? "light"}
      position="bottom-right"
      offset={24}
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)", left: 16, right: 16 }}
      gap={8}
      visibleToasts={3}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !bg-surface-raised !text-ink !shadow-lg !ring-1 !ring-line !border-0 !px-4 !py-3 !gap-3 !font-sans",
          title: "!text-body-sm !font-medium",
          description: "!text-body-sm !text-ink-2",
          actionButton: "!bg-ink !text-ink-inverse !rounded-sm !font-medium !h-8 !px-3",
          cancelButton: "!bg-surface-sunken !text-ink !rounded-sm",
          icon: "!text-ink",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
