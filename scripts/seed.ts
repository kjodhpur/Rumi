/**
 * Seed 60 realistic fake ASU student profiles for local/demo.
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.
 *
 * Usage: npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FIRST = [
  "Ava", "Noah", "Mia", "Liam", "Sofia", "Ethan", "Zoe", "Kai", "Amara", "Jayden",
  "Priya", "Diego", "Harper", "Omar", "Nina", "Leo", "Ivy", "Marcus", "Elena", "Sam",
];
const LAST = "ABCDEFGHJKLMNPRSTW";
const MAJORS = [
  "Computer Science", "Business", "Psychology", "Engineering", "Biology",
  "Journalism", "Design", "Finance", "Nursing", "Political Science",
];
const CAMPUSES = ["Tempe", "Downtown Phoenix", "Polytechnic", "West Valley"] as const;
const YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Grad"] as const;
const AREAS = [
  "Tempe near campus", "Tempe south", "Mesa", "Downtown Phoenix",
  "Tooker House", "Vertex", "The Hyve", "Union Tempe", "Other",
];
const ARTISTS = [
  { id: "art1", name: "Taylor Swift" },
  { id: "art2", name: "Bad Bunny" },
  { id: "art3", name: "SZA" },
  { id: "art4", name: "The Weeknd" },
  { id: "art5", name: "Billie Eilish" },
  { id: "art6", name: "Drake" },
  { id: "art7", name: "Olivia Rodrigo" },
  { id: "art8", name: "Kendrick Lamar" },
  { id: "art9", name: "Doja Cat" },
  { id: "art10", name: "Arctic Monkeys" },
];
const GENRES = ["pop", "hip hop", "r&b", "indie", "latin", "rock", "electronic"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("Seeding 60 Rumi demo profiles…");

  // Clean previous seed users (profiles marked is_seed)
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("is_seed", true);
  for (const row of existing ?? []) {
    await admin.auth.admin.deleteUser(row.id);
  }

  for (let i = 0; i < 60; i++) {
    const id = randomUUID();
    const email = `seed${i.toString().padStart(2, "0")}.${id.slice(0, 6)}@asu.edu`;
    const first = pick(FIRST);
    const lastInitial = pick(LAST.split(""));

    const { error: authErr } = await admin.auth.admin.createUser({
      id,
      email,
      email_confirm: true,
      user_metadata: { seed: true },
    });
    if (authErr) {
      // Trigger may have created profile; update if user exists
      console.warn("auth create:", authErr.message);
    }

    await admin.from("profiles").upsert({
      id,
      email,
      first_name: first,
      last_initial: lastInitial,
      photo_url: `https://i.pravatar.cc/400?u=rumi-seed-${i}`,
      year: pick(YEARS),
      major: pick(MAJORS),
      campus: pick(CAMPUSES),
      bio: `${first} is looking for a chill roommate near ASU. Loves coffee and late study sessions.`,
      own_gender: pick(["woman", "man", "non-binary", "prefer-not-to-say"] as const),
      show_gender_publicly: Math.random() > 0.7,
      onboarding_complete: true,
      onboarding_step: 6,
      is_seed: true,
      verified: true,
      paused: false,
      suspended: false,
    });

    const budgetMin = randInt(400, 1400);
    await admin.from("housing_prefs").upsert({
      user_id: id,
      looking_for: pick(["on-campus", "off-campus", "either"] as const),
      budget_min: budgetMin,
      budget_max: Math.min(2000, budgetMin + randInt(100, 600)),
      preferred_areas: [pick(AREAS), pick(AREAS)].filter(
        (v, idx, a) => a.indexOf(v) === idx,
      ),
      move_in_term: pick(["Fall 2027", "Spring 2027", "Summer 2027", "ASAP"] as const),
      lease_length: pick(["semester", "10-12 months", "flexible"] as const),
      roommates_wanted: pick(["1", "2", "3+"] as const),
      place_status: pick(["has-place", "needs-place"] as const),
    });

    await admin.from("lifestyle_prefs").upsert({
      user_id: id,
      sleep_schedule: randInt(1, 5),
      cleanliness: randInt(1, 5),
      guests: randInt(1, 5),
      noise_tolerance: randInt(1, 5),
      social_level: randInt(1, 5),
      study_at_home: randInt(1, 5),
      cooking_sharing: randInt(1, 5),
      smoking: pick(["no", "outside-only", "yes"] as const),
      drinking: pick(["no", "socially", "often"] as const),
      pets: pick(["have-pet", "ok-with-pets", "no-pets"] as const),
      gender_preference: pick(["same-gender", "any", "no-preference"] as const),
      dealbreakers: Math.random() > 0.7 ? ["smoking"] : [],
      weights: {
        sleep_schedule: "somewhat",
        cleanliness: pick(["somewhat", "very"] as const),
        guests: "somewhat",
        noise_tolerance: "somewhat",
        social_level: "somewhat",
        study_at_home: "somewhat",
        cooking_sharing: "not",
      },
    });

    if (Math.random() > 0.35) {
      const shuffled = [...ARTISTS].sort(() => Math.random() - 0.5).slice(0, 8);
      await admin.from("spotify_connections").upsert({
        user_id: id,
        access_token_enc: "seed",
        refresh_token_enc: "seed",
        token_expires_at: new Date(Date.now() + 86400000).toISOString(),
        spotify_user_id: `seed-${i}`,
      });
      await admin.from("spotify_top_artists").delete().eq("user_id", id);
      await admin.from("spotify_top_artists").insert(
        shuffled.map((a, rank) => ({
          user_id: id,
          artist_id: a.id,
          name: a.name,
          image_url: null,
          rank: rank + 1,
        })),
      );
      await admin.from("spotify_genres").delete().eq("user_id", id);
      await admin.from("spotify_genres").insert(
        GENRES.slice(0, 4).map((genre, gi) => ({
          user_id: id,
          genre,
          count: 10 - gi,
        })),
      );
    }

    if ((i + 1) % 10 === 0) console.log(`  …${i + 1}/60`);
  }

  console.log("Done. Set NEXT_PUBLIC_SHOW_SEED_PROFILES=true to include seeds in matching.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
