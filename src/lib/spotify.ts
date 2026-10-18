import { createHash, randomBytes } from "crypto";
import { encryptToken, decryptToken } from "./crypto";
import { createAdminClient } from "./supabase/admin";

const SPOTIFY_AUTH = "https://accounts.spotify.com";
const SPOTIFY_API = "https://api.spotify.com/v1";

export function getSpotifyAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: "user-top-read user-read-email",
    state,
    code_challenge_method: "S256",
    code_challenge: state.split(".")[1] ?? state,
  });
  // PKCE: state carries userId.verifierHash; code_challenge passed separately via cookie in route
  return `${SPOTIFY_AUTH}/authorize?${params.toString()}`;
}

export function buildSpotifyAuthorizeUrl(opts: {
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: "user-top-read user-read-email",
    state: opts.state,
    code_challenge_method: "S256",
    code_challenge: opts.codeChallenge,
  });
  return `${SPOTIFY_AUTH}/authorize?${params.toString()}`;
}

export async function exchangeSpotifyCode(
  code: string,
  codeVerifier: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    code_verifier: codeVerifier,
  });

  const res = await fetch(`${SPOTIFY_AUTH}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Spotify token exchange failed: ${await res.text()}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function refreshSpotifyToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
  });
  if (process.env.SPOTIFY_CLIENT_SECRET) {
    body.set("client_secret", process.env.SPOTIFY_CLIENT_SECRET);
  }
  const res = await fetch(`${SPOTIFY_AUTH}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Spotify refresh failed: ${await res.text()}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

interface SpotifyArtistRaw {
  id: string;
  name: string;
  images?: Array<{ url: string }>;
  genres?: string[];
}

interface SpotifyTrackRaw {
  id: string;
  name: string;
}

export async function fetchSpotifyTops(accessToken: string) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [artistsRes, tracksRes] = await Promise.all([
    fetch(`${SPOTIFY_API}/me/top/artists?time_range=medium_term&limit=50`, { headers }),
    fetch(`${SPOTIFY_API}/me/top/tracks?time_range=medium_term&limit=50`, { headers }),
  ]);
  if (!artistsRes.ok || !tracksRes.ok) {
    throw new Error("Failed to fetch Spotify top items");
  }
  const artistsJson = (await artistsRes.json()) as { items: SpotifyArtistRaw[] };
  const tracksJson = (await tracksRes.json()) as { items: SpotifyTrackRaw[] };

  const genreCounts = new Map<string, number>();
  const artists = artistsJson.items.map((art, i) => {
    for (const g of art.genres ?? []) {
      genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
    return {
      artist_id: art.id,
      name: art.name,
      image_url: art.images?.[0]?.url ?? null,
      rank: i + 1,
    };
  });

  const tracks = tracksJson.items.map((t, i) => ({
    track_id: t.id,
    name: t.name,
    rank: i + 1,
  }));

  const genres = Array.from(genreCounts.entries()).map(([genre, count]) => ({
    genre,
    count,
  }));

  return { artists, tracks, genres };
}

export async function persistSpotifyConnection(
  userId: string,
  tokens: { access_token: string; refresh_token: string; expires_in: number },
) {
  const admin = createAdminClient();
  const expires = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await admin.from("spotify_connections").upsert({
    user_id: userId,
    access_token_enc: encryptToken(tokens.access_token),
    refresh_token_enc: encryptToken(tokens.refresh_token),
    token_expires_at: expires,
    last_synced_at: new Date().toISOString(),
  });

  const tops = await fetchSpotifyTops(tokens.access_token);
  await admin.from("spotify_top_artists").delete().eq("user_id", userId);
  await admin.from("spotify_genres").delete().eq("user_id", userId);
  await admin.from("spotify_top_tracks").delete().eq("user_id", userId);

  if (tops.artists.length) {
    await admin.from("spotify_top_artists").insert(
      tops.artists.map((a) => ({ ...a, user_id: userId })),
    );
  }
  if (tops.genres.length) {
    await admin.from("spotify_genres").insert(
      tops.genres.map((g) => ({ ...g, user_id: userId })),
    );
  }
  if (tops.tracks.length) {
    await admin.from("spotify_top_tracks").insert(
      tops.tracks.map((t) => ({ ...t, user_id: userId })),
    );
  }

  await admin.from("events").insert({
    user_id: userId,
    event_name: "spotify_connect",
  });
}

export async function syncUserSpotify(userId: string) {
  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("spotify_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!conn) return;

  let access = decryptToken(conn.access_token_enc);
  let refresh = decryptToken(conn.refresh_token_enc);
  const expiresAt = new Date(conn.token_expires_at).getTime();
  if (Date.now() > expiresAt - 60_000) {
    const refreshed = await refreshSpotifyToken(refresh);
    access = refreshed.access_token;
    if (refreshed.refresh_token) refresh = refreshed.refresh_token;
    await admin
      .from("spotify_connections")
      .update({
        access_token_enc: encryptToken(access),
        refresh_token_enc: encryptToken(refresh),
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq("user_id", userId);
  }

  await persistSpotifyConnection(userId, {
    access_token: access,
    refresh_token: refresh,
    expires_in: 3600,
  });
}

export async function disconnectSpotify(userId: string) {
  const admin = createAdminClient();
  await admin.from("spotify_connections").delete().eq("user_id", userId);
  await admin.from("spotify_top_artists").delete().eq("user_id", userId);
  await admin.from("spotify_genres").delete().eq("user_id", userId);
  await admin.from("spotify_top_tracks").delete().eq("user_id", userId);
}

function base64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const hash = createHash("sha256").update(verifier).digest();
  return base64Url(hash);
}

export function randomVerifier(): string {
  return base64Url(randomBytes(32));
}
