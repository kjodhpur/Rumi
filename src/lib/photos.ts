/** Public URL for a file in the `photos` bucket. Paths are `{user_id}/{uuid}.jpg`. */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/photos/${path}`;
}
