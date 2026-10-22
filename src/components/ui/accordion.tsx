"use client";

import * as React from "react";
import { Accordion as Primitive } from "radix-ui";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

interface AccordionItemData {
  id: string;
  question: string;
  answer: React.ReactNode;
}

/**
 * FAQ accordion that only animates transform and opacity: answers fade in, and
 * the rows below glide to their new position (layout="position" → translate only).
 */
export function Accordion({ items, className }: { items: AccordionItemData[]; className?: string }) {
  const [open, setOpen] = React.useState<string>("");
  return (
    <LayoutGroup>
      <Primitive.Root
        type="single"
        collapsible
        value={open}
        onValueChange={setOpen}
        className={cn("border-b border-line", className)}
      >
        {items.map((item) => {
          const isOpen = open === item.id;
          return (
            <motion.div key={item.id} layout="position" transition={spring}>
              <Primitive.Item value={item.id} className="border-t border-line">
                <Primitive.Header>
                  <Primitive.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left text-title font-medium text-ink outline-none focus-visible:text-accent-ink">
                    {item.question}
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={spring}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-2 group-hover:text-ink"
                    >
                      <Plus className="size-[18px]" strokeWidth={1.75} aria-hidden />
                    </motion.span>
                  </Primitive.Trigger>
                </Primitive.Header>
                <AnimatePresence initial={false} mode="popLayout">
                  {isOpen ? (
                    <Primitive.Content forceMount asChild>
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                        transition={spring}
                        className="max-w-2xl pr-12 pb-6 text-body text-ink-2"
                      >
                        {item.answer}
                      </motion.div>
                    </Primitive.Content>
                  ) : null}
                </AnimatePresence>
              </Primitive.Item>
            </motion.div>
          );
        })}
      </Primitive.Root>
    </LayoutGroup>
  );
}
