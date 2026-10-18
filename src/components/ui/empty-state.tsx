export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-rumi-sand bg-white/60 px-6 py-16 text-center">
      <h2 className="font-display text-xl text-rumi-ink">{title}</h2>
      {description ? <p className="max-w-sm text-sm text-rumi-muted">{description}</p> : null}
      {action}
    </div>
  );
}
