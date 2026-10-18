export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-rumi-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-asu-maroon border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
