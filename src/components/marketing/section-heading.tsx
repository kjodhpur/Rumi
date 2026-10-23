import { cn } from "@/lib/utils";

export function Eyebrow({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <p id={id} className={cn("text-caption font-semibold tracking-wide text-accent-ink uppercase", className)}>
      {children}
    </p>
  );
}

export function SectionTitle({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={cn("mt-3 font-display text-[36px] !leading-[1.08] text-ink sm:text-display-xl", className)}>
      {children}
    </h2>
  );
}
