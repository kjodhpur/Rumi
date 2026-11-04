import type { ServerSupabase } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWhyYouMatch } from "@/lib/bedrock/client";
import { photoUrl } from "@/lib/photos";
import { isVerified } from "@/lib/verification";
import { buildSocialUrl, type SocialPlatform } from "@/lib/social/links";
import type { FactorKey, Importance } from "@/lib/options";

export interface ProfilePhoto {
  id: string;
  url: string;
  placeholder: string | null;
}

export interface ProfileMedia {
  userId: string;
  kind: "video" | "audio";
  signedUrl: string;
  durationSeconds: number;
  transcript: string;
}

export interface ProfileDetail {
  id: string;
  isSelf: boolean;
  firstName: string;
  lastInitial: string;
  pronouns: string | null;
  classYear: string | null;
  major: string | null;
  bio: string;
  verified: boolean;
  photos: ProfilePhoto[];
  media: ProfileMedia | null;
  lastActiveAt: string;
  prefs: {
    budgetMin: number;
    budgetMax: number;
    areaNames: string[];
    moveInDate: string | null;
    leaseLength: string;
    housingType: string;
    sleepSchedule: number;
    cleanliness: number;
    noise: number;
    guests: number;
    smoking: string;
    drinking: string;
    pets: string;
    study: string;
  } | null;
  match: {
    score: number;
    reasons: string[];
    watchouts: string[];
    breakdown: { key: FactorKey; label: string; similarity: number; importance: Importance }[];
    sharedArtists: string[];
  } | null;
  music: { artists: { id: string; name: string; image: string | null }[]; genres: string[] } | null;
  isSaved: boolean;
  intro: {
    id: string;
    status: "pending" | "accepted" | "declined" | "withdrawn";
    direction: "sent" | "received";
    conversationId: string | null;
  } | null;
  /** People you both know who opted in. Null when the count should stay hidden. */
  mutualCount: number | null;
  /** Opted-in mutual contacts with names and avatars for points of contact. */
  mutualContacts: { userId: string; firstName: string; lastInitial: string; avatarUrl: string | null }[];
  /** Instagram / LinkedIn handles, shown as links only. "verified" is self-attested. */
  socialLinks: { platform: SocialPlatform; handle: string; verified: boolean; url: string }[];
  /** The viewer's first name (for the share card preview). */
  viewerFirstName: string;
  /** A "people I know" connection between the viewer and this person, if any. */
  connection: { id: string; status: "pending" | "confirmed"; direction: "sent" | "received" } | null;
}

type Breakdown = NonNullable<ProfileDetail["match"]>["breakdown"];

export interface LoadProfileOptions {
  /** Fill "Why you match" from Bedrock when credentials are set. Falls back to stored reasons. */
  explainMatch?: boolean;
}

const labels = (v: unknown) =>
  Array.isArray(v)
    ? v.map((x) => (x as { label?: string }).label).filter((l): l is string => Boolean(l))
    : [];

/** Everything the profile view needs, read with the viewer's session (RLS decides visibility). */
export async function loadProfileDetail(
  supabase: ServerSupabase,
  viewerId: string,
  targetId: string,
  options: LoadProfileOptions = {},
): Promise<ProfileDetail | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_initial, pronouns, class_year, major, bio, student_verified_at, last_active_at, school_id, onboarding_completed_at",
    )
    .eq("id", targetId)
    .maybeSingle();
  if (!profile) return null;

  const [photos, prefs, score, music, saved, intros, areas, social, mediaRes, viewer, connection] = await Promise.all([
    supabase
      .from("photos")
      .select("id, storage_path, placeholder")
      .eq("user_id", targetId)
      .order("position"),
    supabase.rpc("get_public_preferences", { p_user: targetId }),
    supabase
      .from("match_scores")
      .select("score, reasons, watchouts, breakdown, shared_artists")
      .eq("viewer_id", viewerId)
      .eq("candidate_id", targetId)
      .maybeSingle(),
    supabase
      .from("music_profiles")
      .select("top_artists, top_genres")
      .eq("user_id", targetId)
      .maybeSingle(),
    supabase
      .from("saves")
      .select("target_id")
      .eq("user_id", viewerId)
      .eq("target_id", targetId)
      .maybeSingle(),
    supabase
      .from("intros")
      .select("id, status, sender_id, conversation_id, created_at")
      .or(
        `and(sender_id.eq.${viewerId},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${viewerId})`,
      )
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("areas").select("slug, name").eq("school_id", profile.school_id),
    supabase.from("social_links").select("platform, handle, verified_at").eq("user_id", targetId),
    supabase
      .from("profile_media")
      .select("user_id, kind, path, duration_s, transcript")
      .eq("user_id", targetId)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("profiles").select("first_name").eq("id", viewerId).maybeSingle(),
    supabase
      .from("connections")
      .select("id, status, user_a")
      .or(`and(user_a.eq.${viewerId},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${viewerId})`)
      .maybeSingle(),
  ]);

  const areaNames = Object.fromEntries(
    (areas.data ?? []).map((a) => [a.slug, a.name.split(" — ")[0]]),
  );
  const p = prefs.data?.[0];
  const intro = intros.data?.[0];
  const artists = Array.isArray(music.data?.top_artists)
    ? (music.data!.top_artists as { id: string; name: string; image?: string | null }[]).map(
        (a) => ({
          id: a.id,
          name: a.name,
          image: a.image ?? null,
        }),
      )
    : [];

  const breakdown =
    score.data && Array.isArray(score.data.breakdown)
      ? (score.data.breakdown as unknown as Breakdown)
      : [];
  const sharedArtists =
    score.data && Array.isArray(score.data.shared_artists)
      ? (score.data.shared_artists as { name: string }[]).map((a) => a.name)
      : [];
  const watchouts = score.data ? labels(score.data.watchouts) : [];
  let reasons = score.data ? labels(score.data.reasons) : [];
  if (options.explainMatch && score.data && profile.id !== viewerId) {
    const explained = await generateWhyYouMatch({
      firstName: profile.first_name,
      score: score.data.score,
      reasons,
      watchouts,
      breakdown: breakdown.map((item) => ({
        label: item.label,
        similarity: item.similarity,
        importance: item.importance,
      })),
      sharedArtists,
      locale: await getLocale(),
    });
    if (explained.source === "bedrock") reasons = explained.sentences;
  }

  // RLS returned the clip only if the viewer may see this profile; sign a short-lived URL.
  let mediaInfo: ProfileMedia | null = null;
  if (mediaRes.data) {
    try {
      const admin = createAdminClient();
      const { data: signed } = await admin.storage
        .from("intros-media")
        .createSignedUrl(mediaRes.data.path, 900);
      if (signed?.signedUrl) {
        mediaInfo = {
          userId: targetId,
          kind: mediaRes.data.kind as "video" | "audio",
          signedUrl: signed.signedUrl,
          durationSeconds: mediaRes.data.duration_s,
          transcript: mediaRes.data.transcript,
        };
      }
    } catch (error) {
      console.error("[profile] couldn't sign intro clip", error);
    }
  }

  return {
    id: profile.id,
    isSelf: profile.id === viewerId,
    firstName: profile.first_name,
    lastInitial: profile.last_initial,
    pronouns: profile.pronouns,
    classYear: profile.class_year,
    major: profile.major,
    bio: profile.bio,
    verified: isVerified(profile.student_verified_at),
    lastActiveAt: profile.last_active_at,
    photos: (photos.data ?? []).map((ph) => ({
      id: ph.id,
      url: photoUrl(ph.storage_path)!,
      placeholder: ph.placeholder,
    })),
    media: mediaInfo,
    prefs: p
      ? {
          budgetMin: p.budget_min,
          budgetMax: p.budget_max,
          areaNames: (p.areas ?? []).map((slug) => areaNames[slug] ?? slug),
          moveInDate: p.move_in_date,
          leaseLength: p.lease_length,
          housingType: p.housing_type,
          sleepSchedule: p.sleep_schedule,
          cleanliness: p.cleanliness,
          noise: p.noise,
          guests: p.guests,
          smoking: p.smoking,
          drinking: p.drinking,
          pets: p.pets,
          study: p.study,
        }
      : null,
    match: score.data
      ? {
          score: score.data.score,
          reasons,
          watchouts,
          breakdown,
          sharedArtists,
        }
      : null,
    music: artists.length > 0 ? { artists, genres: music.data?.top_genres ?? [] } : null,
    isSaved: Boolean(saved.data),
    intro: intro
      ? {
          id: intro.id,
          status: intro.status as NonNullable<ProfileDetail["intro"]>["status"],
          direction: intro.sender_id === viewerId ? "sent" : "received",
          conversationId: intro.conversation_id,
        }
      : null,
    socialLinks: (social.data ?? []).map((s) => ({
      platform: s.platform as SocialPlatform,
      handle: s.handle,
      verified: Boolean(s.verified_at),
      url: buildSocialUrl(s.platform as SocialPlatform, s.handle),
    })),
    viewerFirstName: viewer.data?.first_name ?? "",
    connection: connection.data
      ? {
          id: connection.data.id,
          status: connection.data.status as "pending" | "confirmed",
          direction: connection.data.user_a === viewerId ? "sent" : "received",
        }
      : null,
    mutualCount: await mutualCount(supabase, profile.id === viewerId ? null : profile.id),
    mutualContacts: await loadMutualContacts(supabase, profile.id === viewerId ? null : profile.id),
  };
}

async function loadMutualContacts(supabase: ServerSupabase, otherId: string | null) {
  if (!otherId) return [];
  const { data, error } = await supabase.rpc("mutual_connections_details", { target_id: otherId });
  if (error || !Array.isArray(data)) return [];
  return data.map((c) => ({
    userId: c.user_id,
    firstName: c.first_name,
    lastInitial: c.last_initial,
    avatarUrl: photoUrl(c.avatar_path),
  }));
}

async function mutualCount(supabase: ServerSupabase, otherId: string | null) {
  if (!otherId) return null;
  const { data, error } = await supabase.rpc("mutual_count", { p_other: otherId });
  if (error || typeof data !== "number" || data < 1) return null;
  return data;
}
