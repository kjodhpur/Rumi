/**
 * Next 14 caches `fetch` GET responses in its Data Cache by default. Supabase
 * reads must always hit the database (RLS, fresh scores), so server clients opt out.
 */
export const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
