import "server-only";
import { publicEnv, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import type { Interval } from "./free-slots";

/**
 * Calendar connections (Phase 7.3). Read-only free/busy: Google's `calendar.freebusy` scope
 * and Microsoft Graph `Calendars.ReadBasic` (start, end and busy status; no titles, bodies
 * or attendees are requested or kept). Tokens are AES-GCM encrypted at rest.
 */
export const CALENDAR_PROVIDERS = ["google", "microsoft"] as const;
export type CalendarProvider = (typeof CALENDAR_PROVIDERS)[number];

export const PROVIDER_LABEL: Record<CalendarProvider, string> = {
  google: "Google Calendar",
  microsoft: "Outlook",
};

const CONFIG = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/calendar.freebusy",
  },
  microsoft: {
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "offline_access https://graph.microsoft.com/Calendars.ReadBasic",
  },
} as const;

export function isCalendarProvider(value: string): value is CalendarProvider {
  return (CALENDAR_PROVIDERS as readonly string[]).includes(value);
}

function credentials(provider: CalendarProvider) {
  const c = serverEnv.calendar;
  return provider === "google"
    ? { id: c.googleClientId, secret: c.googleClientSecret }
    : { id: c.microsoftClientId, secret: c.microsoftClientSecret };
}

/** Providers with client credentials, when the feature is on. */
export function configuredProviders(): CalendarProvider[] {
  if (!publicEnv.calendarEnabled) return [];
  return CALENDAR_PROVIDERS.filter((p) => {
    const c = credentials(p);
    return Boolean(c.id && c.secret);
  });
}

export function redirectUri(provider: CalendarProvider) {
  return `${publicEnv.appUrl}/api/calendar/callback/${provider}`;
}

export function authorizeUrl(provider: CalendarProvider, state: string) {
  const config = CONFIG[provider];
  const params = new URLSearchParams({
    client_id: credentials(provider).id,
    redirect_uri: redirectUri(provider),
    response_type: "code",
    scope: config.scope,
    state,
    ...(provider === "google"
      ? { access_type: "offline", prompt: "consent", include_granted_scopes: "false" }
      : { response_mode: "query", prompt: "select_account" }),
  });
  return `${config.authorize}?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

class CalendarAuthError extends Error {}

async function tokenRequest(provider: CalendarProvider, body: Record<string, string>) {
  const { id, secret } = credentials(provider);
  const response = await fetch(CONFIG[provider].token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...body }),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 400 || response.status === 401)
    throw new CalendarAuthError(`token request rejected (${response.status})`);
  if (!response.ok) throw new Error(`token request failed (${response.status})`);
  return (await response.json()) as TokenResponse;
}

export async function connectCalendar(userId: string, provider: CalendarProvider, code: string) {
  const token = await tokenRequest(provider, {
    code,
    redirect_uri: redirectUri(provider),
    grant_type: "authorization_code",
    ...(provider === "microsoft" ? { scope: CONFIG.microsoft.scope } : {}),
  });
  const { error } = await createAdminClient()
    .from("calendar_accounts")
    .upsert({
      user_id: userId,
      provider,
      access_token_enc: encrypt(token.access_token),
      refresh_token_enc: token.refresh_token ? encrypt(token.refresh_token) : null,
      expires_at: new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString(),
      scope: token.scope ?? CONFIG[provider].scope,
      last_error: null,
      last_sync_at: null,
    });
  if (error) throw error;
}

/** Best-effort token revocation; deleting our copy is what matters. */
export async function revokeCalendar(userId: string, provider: CalendarProvider) {
  const db = createAdminClient();
  const { data } = await db
    .from("calendar_accounts")
    .select("access_token_enc, refresh_token_enc")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  await db.from("calendar_accounts").delete().eq("user_id", userId).eq("provider", provider);
  if (!data || provider !== "google") return; // Microsoft has no per-token revocation endpoint.
  try {
    const token = decrypt(data.refresh_token_enc ?? data.access_token_enc);
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: "POST",
      signal: AbortSignal.timeout(4000),
    });
  } catch (error) {
    console.warn("[calendar] revoke failed", error);
  }
}

async function accessToken(userId: string, provider: CalendarProvider) {
  const db = createAdminClient();
  const { data } = await db
    .from("calendar_accounts")
    .select("access_token_enc, refresh_token_enc, expires_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (!data) return null;
  const fresh = data.expires_at && Date.parse(data.expires_at) > Date.now() + 60_000;
  if (fresh) return decrypt(data.access_token_enc);
  if (!data.refresh_token_enc) throw new CalendarAuthError("no refresh token");
  const token = await tokenRequest(provider, {
    refresh_token: decrypt(data.refresh_token_enc),
    grant_type: "refresh_token",
    ...(provider === "microsoft" ? { scope: CONFIG.microsoft.scope } : {}),
  });
  await db
    .from("calendar_accounts")
    .update({
      access_token_enc: encrypt(token.access_token),
      ...(token.refresh_token ? { refresh_token_enc: encrypt(token.refresh_token) } : {}),
      expires_at: new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", provider);
  return token.access_token;
}

async function fetchBusy(provider: CalendarProvider, token: string, from: Date, to: Date) {
  if (provider === "google") {
    const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        items: [{ id: "primary" }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403)
      throw new CalendarAuthError(`google ${response.status}`);
    if (!response.ok) throw new Error(`google freeBusy ${response.status}`);
    const body = (await response.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
    };
    return (body.calendars?.primary?.busy ?? []).map((b) => ({
      start: Date.parse(b.start),
      end: Date.parse(b.end),
    }));
  }
  const params = new URLSearchParams({
    startDateTime: from.toISOString(),
    endDateTime: to.toISOString(),
    $select: "start,end,showAs,isCancelled",
    $top: "250",
  });
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 401 || response.status === 403)
    throw new CalendarAuthError(`graph ${response.status}`);
  if (!response.ok) throw new Error(`graph calendarView ${response.status}`);
  const body = (await response.json()) as {
    value?: {
      start: { dateTime: string };
      end: { dateTime: string };
      showAs?: string;
      isCancelled?: boolean;
    }[];
  };
  const utc = (s: string) => Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(s) ? s : `${s}Z`);
  return (body.value ?? [])
    .filter((e) => !e.isCancelled && e.showAs !== "free")
    .map((e) => ({ start: utc(e.start.dateTime), end: utc(e.end.dateTime) }));
}

/**
 * Busy intervals from every calendar a student connected. A rejected token marks the
 * connection "reconnect" and is skipped; nothing else about the calendar is stored.
 */
export async function busyFor(userId: string, from: Date, to: Date): Promise<Interval[] | null> {
  const db = createAdminClient();
  const { data: accounts } = await db
    .from("calendar_accounts")
    .select("provider")
    .eq("user_id", userId);
  const providers = (accounts ?? [])
    .map((a) => a.provider)
    .filter(
      (p): p is CalendarProvider => isCalendarProvider(p) && configuredProviders().includes(p),
    );
  if (!providers.length) return null;
  const all: Interval[] = [];
  let any = false;
  for (const provider of providers) {
    try {
      const token = await accessToken(userId, provider);
      if (!token) continue;
      all.push(...(await fetchBusy(provider, token, from, to)));
      any = true;
      await db
        .from("calendar_accounts")
        .update({ last_sync_at: new Date().toISOString(), last_error: null })
        .eq("user_id", userId)
        .eq("provider", provider);
    } catch (error) {
      const auth = error instanceof CalendarAuthError;
      console.warn("[calendar] busy lookup failed", provider, auth ? "auth" : error);
      await db
        .from("calendar_accounts")
        .update({
          last_error: auth
            ? "Access expired. Reconnect to keep suggesting times."
            : "Couldn't reach your calendar last time. We'll try again.",
        })
        .eq("user_id", userId)
        .eq("provider", provider);
    }
  }
  return any ? all.filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end)) : null;
}
