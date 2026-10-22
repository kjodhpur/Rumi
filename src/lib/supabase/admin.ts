import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv, serverEnv } from "@/lib/env";

let admin: ReturnType<typeof createClient<Database>> | undefined;

/**
 * Service-role client. Bypasses RLS — only for trusted server work: match
 * recompute, notification fan-out, admin actions, rate limiting, deletion.
 */
export function createAdminClient() {
  if (!admin) {
    admin = createClient<Database>(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}
