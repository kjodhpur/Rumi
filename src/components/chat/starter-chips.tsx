"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircleQuestion, X } from "lucide-react";
import type { ChatStarter } from "@/lib/starters";
import { springSnappy } from "@/lib/motion";
import { useT } from "@/components/providers/i18n";

const storageKey = (conversationId: string) => `rumi:starters-dismissed:${conversationId}`;

/** "Talk about this": openers for the watch-outs between two students. Tapping one fills the composer. */
export function StarterChips({
  conversationId,
  starters,
  onPick,
}: {
  conversationId: string;
  starters: ChatStarter[];
  onPick: (line: string) => void;
}) {
  const t = useT("starters");
  const [dismissed, setDismissed] = React.useState(true);
  React.useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey(conversationId)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [conversationId]);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey(conversationId), "1");
    } catch {
      // Storage unavailable (private mode): hiding for this visit is enough.
    }
  }

  return (
    <AnimatePresence initial={false}>
      {!dismissed ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={springSnappy}
          className="overflow-hidden"
        >
          <div className="mx-auto max-w-[820px] px-3 pt-2.5 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <p
                id={`starters-${conversationId}`}
                className="flex items-center gap-1.5 text-caption font-medium text-ink-3"
              >
                <MessageCircleQuestion className="size-3.5" strokeWidth={2} aria-hidden />{" "}
                {t("chips.title")}
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="flex size-7 items-center justify-center rounded-full text-ink-3 outline-none hover:bg-surface-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
                aria-label={t("chips.hide")}
              >
                <X className="size-4" strokeWidth={2} aria-hidden />
              </button>
            </div>
            <ul
              aria-labelledby={`starters-${conversationId}`}
              className="-mx-3 flex gap-2 overflow-x-auto px-3 pt-1.5 pb-0.5 sm:mx-0 sm:px-0"
            >
              {starters.flatMap((group) =>
                group.lines.map((line) => (
                  <li key={line} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => onPick(line)}
                      className="max-w-[280px] rounded-2xl bg-surface px-3.5 py-2 text-left text-body-sm text-ink ring-1 ring-line transition-colors outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <span className="block text-micro font-medium text-ink-3 uppercase">
                        {group.label}
                      </span>
                      <span className="line-clamp-2">{line}</span>
                    </button>
                  </li>
                )),
              )}
            </ul>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
