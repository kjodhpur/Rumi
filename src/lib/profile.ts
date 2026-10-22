import type { ServerSupabase } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/photos";
import type { FactorKey, Importance } from "@/lib/options";

export interface ProfilePhoto {
  id: string;
  url: string;
  placeholder: string | null;
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
}

type Breakdown = NonNullable<ProfileDetail["match"]>["breakdown"];

const labels = (v: unknown) =>
  Array.isArray(v) ? v.map((x) => (x as { label?: string }).label).filter((l): l is string => Boolean(l)) : [];

/** Everything the profile view needs, read with the viewer's session (RLS decides visibility). */
export async function loadProfileDetail(
  supabase: ServerSupabase,
  viewerId: string,
  targetId: string,
): Promise<ProfileDetail | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_initial, pronouns, class_year, major, bio, student_verified_at, last_active_at, school_id, onboarding_completed_at")
    .eq("id", targetId)
    .maybeSingle();
  if (!profile) return null;

  const [photos, prefs, score, music, saved, intros, areas] = await Promise.all([
    supabase.from("photos").select("id, storage_path, placeholder").eq("user_id", targetId).order("position"),
    supabase.rpc("get_public_preferences", { p_user: targetId }),
    supabase
      .from("match_scores")
      .select("score, reasons, watchouts, breakdown, shared_artists")
      .eq("viewer_id", viewerId)
      .eq("candidate_id", targetId)
      .maybeSingle(),
    supabase.from("music_profiles").select("top_artists, top_genres").eq("user_id", targetId).maybeSingle(),
    supabase.from("saves").select("target_id").eq("user_id", viewerId).eq("target_id", targetId).maybeSingle(),
    supabase
      .from("intros")
      .select("id, status, sender_id, conversation_id, created_at")
      .or(
        `and(sender_id.eq.${viewerId},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${viewerId})`,
      )
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("areas").select("slug, name").eq("school_id", profile.school_id),
  ]);

  const areaNames = Object.fromEntries((areas.data ?? []).map((a) => [a.slug, a.name.split(" — ")[0]]));
  const p = prefs.data?.[0];
  const intro = intros.data?.[0];
  const artists = Array.isArray(music.data?.top_artists)
    ? (music.data!.top_artists as { id: string; name: string; image?: string | null }[]).map((a) => ({
        id: a.id,
        name: a.name,
        image: a.image ?? null,
      }))
    : [];

  return {
    id: profile.id,
    isSelf: profile.id === viewerId,
    firstName: profile.first_name,
    lastInitial: profile.last_initial,
    pronouns: profile.pronouns,
    classYear: profile.class_year,
    major: profile.major,
    bio: profile.bio,
    verified: Boolean(
      profile.student_verified_at && Date.parse(profile.student_verified_at) > Date.now() - 365 * 86_400_000,
    ),
    lastActiveAt: profile.last_active_at,
    photos: (photos.data ?? []).map((ph) => ({ id: ph.id, url: photoUrl(ph.storage_path)!, placeholder: ph.placeholder })),
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
          reasons: labels(score.data.reasons),
          watchouts: labels(score.data.watchouts),
          breakdown: Array.isArray(score.data.breakdown) ? (score.data.breakdown as unknown as Breakdown) : [],
          sharedArtists: Array.isArray(score.data.shared_artists)
            ? (score.data.shared_artists as { name: string }[]).map((a) => a.name)
            : [],
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
  };
}
