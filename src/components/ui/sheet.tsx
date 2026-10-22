"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { Dialog, VisuallyHidden } from "radix-ui";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { springSheet } from "@/lib/motion";
import { useIsDesktop } from "@/hooks/use-media-query";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Keep the title for screen readers but don't render it visually. */
  hideHeader?: boolean;
  children: React.ReactNode;
  /** Sticky action row (buttons). Sits above the home indicator on phones. */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const widths = { sm: "max-w-[420px]", md: "max-w-[520px]", lg: "max-w-[680px]" };

/**
 * One API, two native-feeling presentations: a drag-to-dismiss bottom sheet on
 * phones and a centered dialog on larger screens.
 */
export function Sheet(props: SheetProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopDialog {...props} /> : <MobileDrawer {...props} />;
}

function MobileDrawer({
  open,
  onOpenChange,
  title,
  description,
  hideHeader,
  children,
  footer,
  className,
}: SheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col rounded-t-xl bg-surface outline-none",
            "shadow-[0_-8px_40px_rgb(0_0_0/0.12)] ring-1 ring-line",
            className,
          )}
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong" />
          {hideHeader ? (
            <VisuallyHidden.Root>
              <Drawer.Title>{title}</Drawer.Title>
              {description ? <Drawer.Description>{description}</Drawer.Description> : null}
            </VisuallyHidden.Root>
          ) : (
            <div className="shrink-0 px-5 pt-4 pb-1">
              <Drawer.Title className="font-display text-display-sm text-ink">{title}</Drawer.Title>
              {description ? (
                <Drawer.Description className="mt-1.5 text-body-sm text-ink-2">
                  {description}
                </Drawer.Description>
              ) : null}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-5">
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-line bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
              {footer}
            </div>
          ) : (
            <div className="pb-safe shrink-0" />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function DesktopDialog({
  open,
  onOpenChange,
  title,
  description,
  hideHeader,
  children,
  footer,
  size = "md",
  className,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6">
              <Dialog.Content asChild forceMount>
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 4 }}
                  transition={springSheet}
                  className={cn(
                    "pointer-events-auto relative flex max-h-[min(760px,calc(100dvh-48px))] w-full flex-col",
                    "rounded-xl bg-surface shadow-lg ring-1 ring-line outline-none",
                    widths[size],
                    className,
                  )}
                >
                  {hideHeader ? (
                    <VisuallyHidden.Root>
                      <Dialog.Title>{title}</Dialog.Title>
                      {description ? <Dialog.Description>{description}</Dialog.Description> : null}
                    </VisuallyHidden.Root>
                  ) : (
                    <div className="shrink-0 px-6 pt-6 pr-14 pb-1">
                      <Dialog.Title className="font-display text-display-sm text-ink">{title}</Dialog.Title>
                      {description ? (
                        <Dialog.Description className="mt-1.5 text-body-sm text-ink-2">
                          {description}
                        </Dialog.Description>
                      ) : null}
                    </div>
                  )}
                  <Dialog.Close
                    className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-hover hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="size-5" strokeWidth={1.75} />
                  </Dialog.Close>
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">{children}</div>
                  {footer ? (
                    <div className="shrink-0 border-t border-line px-6 py-4">{footer}</div>
                  ) : null}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
