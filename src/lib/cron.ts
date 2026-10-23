import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without a secret the
 * jobs only run in local development, never in a deployed environment.
 */
export function isAuthorizedCron(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  if (!secret) return process.env.NODE_ENV === "development";
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
