/** Public URL for a file in the `photos` bucket. Paths are `{user_id}/{uuid}.jpg`. */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/photos/${path}`;
}

/**
 * next/image placeholder for a stored low-res preview. A data URL is painted as a
 * plain background (scaled smoothly by the browser) — much cheaper than Next's
 * SVG blur filter, which matters with a dozen cards on screen.
 */
export function imagePlaceholder(placeholder: string | null | undefined): `data:image/${string}` | "empty" {
  return placeholder?.startsWith("data:image/") ? (placeholder as `data:image/${string}`) : "empty";
}
