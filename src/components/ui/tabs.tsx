"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { springSnappy } from "@/lib/motion";

const TabsContext = React.createContext<{ value?: string; id: string }>({ id: "" });

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  const id = React.useId();
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value ?? internal;
  return (
    <TabsContext.Provider value={{ value: current, id }}>
      <TabsPrimitive.Root
        value={current}
        onValueChange={(v) => {
          setInternal(v);
          onValueChange?.(v);
        }}
        className={className}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("relative flex items-center gap-6 border-b border-line", className)}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  value,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  const ctx = React.useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        "relative -mb-px inline-flex h-11 items-center gap-2 text-body-sm font-medium outline-none",
        "transition-colors duration-150 focus-visible:text-ink",
        active ? "text-ink" : "text-ink-3 hover:text-ink-2",
        className,
      )}
      {...props}
    >
      {children}
      {active ? (
        <motion.span
          layoutId={`${ctx.id}-underline`}
          transition={springSnappy}
          className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink"
        />
      ) : null}
    </TabsPrimitive.Trigger>
  );
}

export const TabsContent = TabsPrimitive.Content;
