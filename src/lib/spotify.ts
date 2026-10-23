import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/crypto";
import { serverEnv, publicEnv } from "@/lib/env";

const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
export const SPOTIFY_SCOPES = "user-top-read";

export function spotifyConfigured() {
  const { clientId, clientSecret } = serverEnv.spotify;
  return Boolean(clientId && clientSecret);
}

export function redirectUri() {
  return process.env.SPOTIFY_REDIRECT_URI || `${publicEnv.appUrl}/api/spotify/callback`;
}

export function authorizeUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: serverEnv.spotify.clientId,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri(),
    state,
    show_dialog: "false",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = serverEnv.spotify;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Spotify token error ${res.status}`);
  return (await res.json()) as TokenResponse;
}

export function exchangeCode(code: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri() });
}

async function api<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Spotify API ${path} → ${res.status}`);
  return (await res.json()) as T;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
  images?: { url: string; width: number }[];
}

/** Top artists plus genres weighted by rank (earlier artists count more). */
export async function fetchTaste(accessToken: string) {
  const [medium, short] = await Promise.all([
    api<{ items: SpotifyArtist[] }>("/me/top/artists?time_range=medium_term&limit=30", accessToken),
    api<{ items: SpotifyArtist[] }>("/me/top/artists?time_range=short_term&limit=20", accessToken).catch(() => ({ items: [] })),
  ]);
  const seen = new Map<string, SpotifyArtist>();
  for (const artist of [...medium.items, ...short.items]) if (!seen.has(artist.id)) seen.set(artist.id, artist);
  const artists = [...seen.values()].slice(0, 30);

  const genreWeight = new Map<string, number>();
  artists.forEach((artist, rank) => {
    for (const genre of artist.genres ?? []) genreWeight.set(genre, (genreWeight.get(genre) ?? 0) + (30 - rank));
  });
  const genres = [...genreWeight.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 20);

  return {
    artists: artists.map((a) => ({
      id: a.id,
      name: a.name,
      image: [...(a.images ?? [])].sort((x, y) => x.width - y.width).find((img) => img.width >= 64)?.url ?? null,
      genres: a.genres ?? [],
    })),
    genres,
  };
}

export async function saveConnection(userId: string, tokens: TokenResponse) {
  const me = await api<{ id: string; display_name: string | null }>("/me", tokens.access_token);
  const admin = createAdminClient();
  const { error } = await admin.from("spotify_accounts").upsert({
    user_id: userId,
    spotify_user_id: me.id,
    display_name: me.display_name,
    access_token_enc: encrypt(tokens.access_token),
    refresh_token_enc: encrypt(tokens.refresh_token ?? ""),
    expires_at: new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString(),
    scopes: tokens.scope,
    connected_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Returns a valid access token, refreshing (and re-encrypting) when expired. */
async function accessTokenFor(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("spotify_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  if (Date.parse(data.expires_at) > Date.now()) return decrypt(data.access_token_enc);
  const refreshToken = decrypt(data.refresh_token_enc);
  if (!refreshToken) return null;
  const tokens = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
  await admin
    .from("spotify_accounts")
    .update({
      access_token_enc: encrypt(tokens.access_token),
      refresh_token_enc: tokens.refresh_token ? encrypt(tokens.refresh_token) : data.refresh_token_enc,
      expires_at: new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString(),
    })
    .eq("user_id", userId);
  return tokens.access_token;
}

export async function syncTaste(userId: string) {
  const token = await accessTokenFor(userId);
  if (!token) return false;
  const taste = await fetchTaste(token);
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await Promise.all([
    admin.from("music_profiles").upsert({ user_id: userId, top_artists: taste.artists, top_genres: taste.genres, synced_at: now }),
    admin.from("spotify_accounts").update({ last_synced_at: now }).eq("user_id", userId),
  ]);
  return true;
}
