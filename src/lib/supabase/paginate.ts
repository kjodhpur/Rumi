/**
 * The Supabase API returns at most 1,000 rows per request (supabase/config.toml max_rows,
 * and the same default in production), and a long `in (…)` list can overflow the request
 * URL. These helpers read everything: page by page, and id list by id list.
 */

export const PAGE_SIZE = 1000;
export const ID_CHUNK = 150;

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Every row of a query. The builder must order by a unique key so pages don't overlap. */
export async function selectAll<T>(
  page: (from: number, to: number) => Page<T>,
  size = PAGE_SIZE,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

/** Every row for a list of ids, a chunk of ids at a time (each chunk paged too). */
export async function selectByIds<T>(
  ids: readonly string[],
  page: (chunk: string[], from: number, to: number) => Page<T>,
  chunk = ID_CHUNK,
): Promise<T[]> {
  const out: T[] = [];
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += chunk) {
    const part = unique.slice(i, i + chunk);
    out.push(...(await selectAll((from, to) => page(part, from, to))));
  }
  return out;
}
