/**
 * Seeds 50 fictional ASU students so the app looks alive in development.
 *
 *   npm run seed                      # local Supabase (refuses remote URLs)
 *   npm run seed -- --demo you@asu.edu  # also gives that account intros + a chat
 *   SEED_ALLOW_REMOTE=true npm run seed # for a staging/preview project only
 *
 * Re-running replaces previous seed users. Photos are generated warm monogram
 * portraits; set SEED_PHOTOS=unsplash to try a small set of Unsplash portraits
 * first (needs network access; failures fall back to monograms).
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import * as fontkit from "fontkit";

for (const file of [".env.local", ".env"]) {
  if (fs.existsSync(path.resolve(file))) process.loadEnvFile(path.resolve(file));
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
  process.exit(1);
}
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
if (!isLocal && process.env.SEED_ALLOW_REMOTE !== "true") {
  console.error(`Refusing to seed ${url}. Seed data is fictional — never seed production.`);
  console.error("For a staging project, re-run with SEED_ALLOW_REMOTE=true.");
  process.exit(1);
}

const SEED_DOMAIN = "seed.asu.edu";
const args = process.argv.slice(2);
const demoEmail = args.includes("--demo") ? args[args.indexOf("--demo") + 1]?.toLowerCase() : undefined;

// Imported after env is loaded (these modules read env lazily).
const { createAdminClient } = await import("../src/lib/supabase/admin.ts");
const { recomputeMatchesFor } = await import("../src/lib/matching/recompute.ts");
const { PEOPLE, TASTES, GROUPS, DEMO_MESSAGES, MAJOR_CAMPUS } = await import("./seed-data.ts");

const admin = createAdminClient();

// Deterministic randomness so every run produces the same people.
let seedState = 20261022;
function rand() {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}
const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const chance = (p: number) => rand() < p;
const clamp = (n: number, lo = 1, hi = 5) => Math.max(lo, Math.min(hi, n));

const PALETTES = [
  ["#F3E3D3", "#E6C3A6"],
  ["#E2EADF", "#BFD1B8"],
  ["#EEDAD3", "#D9AFA2"],
  ["#DFE5EC", "#B8C6D6"],
  ["#F1E6C6", "#DEC48E"],
  ["#E9DFD7", "#CBB8A8"],
];

const UNSPLASH: Record<"woman" | "man", string[]> = {
  woman: [
    "photo-1494790108377-be9c29b29330", "photo-1438761681033-6461ffad8d80", "photo-1534528741775-53994a69daeb",
    "photo-1517841905240-472988babdf9", "photo-1580489944761-15a19d654956", "photo-1573496359142-b8d87734a5a2",
    "photo-1554151228-14d9def656e4", "photo-1544005313-94ddf0286df2",
  ],
  man: [
    "photo-1507003211169-0a1dd7228f2d", "photo-1500648767791-00dcc994a43e", "photo-1506794778202-cad84cf45f1d",
    "photo-1539571696357-5a69c17a67c6", "photo-1472099645785-5658abf4ff4e", "photo-1535713875002-d1d0cf377fde",
  ],
};
const usedUnsplash = new Set<string>();

const serif = fontkit.openSync(path.resolve("src/fonts/InstrumentSerif-latin.woff2")) as fontkit.Font;

/** A warm duotone portrait with an Instrument Serif initial — the app's own photo fallback. */
async function monogramPhoto(initial: string, index: number) {
  const [from, to] = PALETTES[index % PALETTES.length];
  const glyph = serif.glyphForCodePoint(initial.codePointAt(0)!);
  const box = glyph.bbox;
  const scale = 440 / serif.unitsPerEm;
  const w = (box.maxX - box.minX) * scale;
  const h = (box.maxY - box.minY) * scale;
  const tx = (960 - w) / 2 - box.minX * scale;
  const ty = (1200 - h) / 2 + box.maxY * scale;
  const d = glyph.path.toSVG();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
    <radialGradient id="l" cx="0.3" cy="0.2" r="0.9"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>
    <rect width="960" height="1200" fill="url(#g)"/><rect width="960" height="1200" fill="url(#l)"/>
    <path d="${d}" transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale} ${-scale})" fill="#171614" fill-opacity="0.62"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 84 }).toBuffer();
}

async function unsplashPhoto(gender: "woman" | "man" | "nonbinary") {
  if (process.env.SEED_PHOTOS !== "unsplash" || gender === "nonbinary") return null;
  const id = UNSPLASH[gender].find((p) => !usedUnsplash.has(p));
  if (!id) return null;
  usedUnsplash.add(id);
  try {
    const res = await fetch(`https://images.unsplash.com/${id}?w=960&h=1200&fit=crop&crop=faces&q=80&fm=jpg`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function placeholderFor(image: Buffer) {
  const tiny = await sharp(image).resize(12, 15).jpeg({ quality: 60 }).toBuffer();
  return `data:image/jpeg;base64,${tiny.toString("base64")}`;
}

function dateFromNow(months: number, day: number) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, day));
  return d.toISOString().slice(0, 10);
}

/** Upcoming academic start dates: August, January, or early summer. */
function moveInDate() {
  const now = new Date();
  const year = now.getUTCMonth() >= 7 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const roll = rand();
  if (roll < 0.6) return `${year}-08-${String(between(1, 20)).padStart(2, "0")}`;
  if (roll < 0.85) return `${year}-01-${String(between(3, 15)).padStart(2, "0")}`;
  return dateFromNow(between(6, 8), between(1, 28));
}

async function removeExistingSeed() {
  const { data } = await admin.from("user_settings").select("user_id, email").like("email", `%@${SEED_DOMAIN}`);
  for (const row of data ?? []) {
    const { data: files } = await admin.storage.from("photos").list(row.user_id);
    if (files?.length) await admin.storage.from("photos").remove(files.map((f) => `${row.user_id}/${f.name}`));
    await admin.auth.admin.deleteUser(row.user_id);
  }
  return data?.length ?? 0;
}

async function createPerson(person: (typeof PEOPLE)[number], index: number) {
  const slug = `${person.first}.${person.last}`.toLowerCase().replace(/[^a-z.]/g, "");
  const email = `rumi-${slug}@${SEED_DOMAIN}`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !created.user) throw error ?? new Error("createUser failed");
  const id = created.user.id;

  // Lifestyle with gentle correlations (night owls skew social, studio majors skew late).
  const lateMajor = ["Architecture", "Film", "Graphic Design", "Digital Culture"].includes(person.major);
  const bioQuiet = /quiet|calm|early|bed by|asleep/i.test(person.bio);
  const sleep = clamp(lateMajor ? between(3, 5) : bioQuiet ? between(1, 3) : between(2, 4));
  const noise = clamp(bioQuiet ? between(1, 2) : between(2, 4));
  const guests = clamp(/social|friends over|hosting|dinner|game nights/i.test(person.bio) ? between(3, 4) : between(1, 3));
  const cleanliness = clamp(/clean|tidy|organized|neat/i.test(person.bio) ? between(4, 5) : between(2, 4));
  const preferredAreas = MAJOR_CAMPUS[person.major] ?? ["tempe-campus"];
  const extraArea = pick(["tempe-south", "mesa", "scottsdale", "tempe-campus", "central-phoenix"]);
  const areas = [...new Set([...preferredAreas.slice(0, chance(0.5) ? 2 : 1), ...(chance(0.6) ? [extraArea] : [])])];
  const budgetMin = between(11, 20) * 50;
  const budgetMax = budgetMin + between(4, 9) * 50;
  const pets = /cat|dog|gecko/i.test(person.bio) ? "have" : chance(0.12) ? "want" : "none";
  const drinking = /don't drink|don’t drink|not drink/i.test(person.bio) ? "never" : pick(["socially", "socially", "socially", "never", "often"]);

  const dealbreakers = ["budget", "area"] as string[];
  if (chance(0.45)) dealbreakers.push("smoking");
  if (bioQuiet && chance(0.4)) dealbreakers.push("noise");
  if (cleanliness >= 5 && chance(0.4)) dealbreakers.push("cleanliness");
  if (chance(0.15)) dealbreakers.push("pets");

  const weights: Record<string, number> = {};
  for (const key of ["budget", "areas", "sleep", "cleanliness", "noise", "guests", "smoking", "study"]) {
    if (chance(0.35)) weights[key] = pick([1, 2, 3]);
  }

  const uploads: { storage_path: string; position: number; width: number; height: number; placeholder: string }[] = [];
  const photoCount = 1;
  for (let position = 0; position < photoCount; position++) {
    const image = (await unsplashPhoto(person.gender)) ?? (await monogramPhoto(person.first.charAt(0), index));
    const storagePath = `${id}/${randomUUID()}.jpg`;
    const { error: uploadError } = await admin.storage
      .from("photos")
      .upload(storagePath, image, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (uploadError) throw uploadError;
    uploads.push({ storage_path: storagePath, position, width: 960, height: 1200, placeholder: await placeholderFor(image) });
  }

  const daysAgo = between(0, 40);
  await Promise.all([
    admin
      .from("profiles")
      .update({
        first_name: person.first,
        last_initial: person.last.charAt(0),
        pronouns: person.pronouns,
        gender: person.gender,
        class_year: person.year,
        major: person.major,
        bio: person.bio,
        is_seed: true,
        student_verified_at: new Date().toISOString(),
        onboarding_step: 9,
        last_active_at: new Date(Date.now() - between(0, 72) * 3_600_000).toISOString(),
        created_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      })
      .eq("id", id),
    admin
      .from("user_settings")
      .update({
        last_name: person.last,
        // Seed inboxes don't exist — never email them.
        notify_email_intros: false,
        notify_email_messages: false,
        notify_email_matches: false,
        notify_email_groups: false,
      })
      .eq("user_id", id),
    admin
      .from("preferences")
      .update({
        budget_min: budgetMin,
        budget_max: budgetMax,
        areas,
        move_in_date: moveInDate(),
        lease_length: pick(["academic_year", "academic_year", "twelve_months", "twelve_months", "flexible", "semester"]),
        housing_type: pick(["off_campus", "off_campus", "off_campus", "either", "on_campus"]),
        gender_pref: person.gender === "nonbinary" ? [] : chance(0.55) ? [person.gender, "nonbinary"] : [],
        sleep_schedule: sleep,
        cleanliness,
        noise,
        guests,
        smoking: chance(0.9) ? "never" : pick(["sometimes", "regularly"]),
        drinking,
        pets,
        study: bioQuiet ? pick(["home_quiet", "campus"]) : pick(["campus", "mix", "home_social", "home_quiet"]),
        dealbreakers,
        weights,
      })
      .eq("user_id", id),
    admin.from("photos").insert(uploads.map((u) => ({ ...u, user_id: id }))),
  ]);

  if (person.taste && chance(0.75)) {
    const pool = [...TASTES[person.taste]];
    const crossover = TASTES[pick(Object.keys(TASTES) as (keyof typeof TASTES)[])];
    const chosen = [...pool.sort(() => rand() - 0.5).slice(0, between(5, 8)), ...[...crossover].sort(() => rand() - 0.5).slice(0, 2)];
    const unique = [...new Map(chosen.map((a) => [a[0], a])).values()];
    const genres = [...new Set(unique.flatMap((a) => a[2]))];
    await admin.from("music_profiles").upsert({
      user_id: id,
      top_artists: unique.map(([artistId, name, artistGenres]) => ({ id: artistId, name, image: null, genres: artistGenres })),
      top_genres: genres,
      synced_at: new Date().toISOString(),
    });
  }

  await admin.from("profiles").update({ onboarding_completed_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString() }).eq("id", id);
  return { id, first: person.first };
}

async function createGroups(people: { id: string; first: string }[]) {
  for (const group of GROUPS) {
    const members = group.members.map((first) => people.find((p) => p.first === first)).filter(Boolean) as { id: string; first: string }[];
    if (members.length === 0) continue;
    const { data: g, error } = await admin
      .from("groups")
      .insert({ school_id: "asu", name: group.name, owner_id: members[0].id, target_size: group.target })
      .select("id")
      .single();
    if (error) throw error;
    await admin.from("group_members").insert(members.map((m, i) => ({ group_id: g.id, user_id: m.id, role: i === 0 ? "owner" : "member" })));
    const { data: c } = await admin.from("conversations").insert({ kind: "group", group_id: g.id }).select("id").single();
    await admin.from("conversation_members").insert(members.map((m) => ({ conversation_id: c!.id, user_id: m.id })));
    await admin.from("messages").insert({ conversation_id: c!.id, kind: "system", body: `${members[0].first} started ${group.name}` });
  }
}

async function seedDemoFor(email: string) {
  const { data: settings } = await admin.from("user_settings").select("user_id").eq("email", email).maybeSingle();
  if (!settings) {
    console.warn(`No Rumi account for ${email} yet — sign in once, finish onboarding, then re-run with --demo.`);
    return;
  }
  const userId = settings.user_id;
  const { data: me } = await admin.from("profiles").select("onboarding_completed_at").eq("id", userId).single();
  if (!me?.onboarding_completed_at) {
    console.warn(`${email} hasn't finished onboarding — finish it first, then re-run with --demo.`);
    return;
  }
  await recomputeMatchesFor(userId);
  const { data: top } = await admin
    .from("match_scores")
    .select("candidate_id, score, profiles!match_scores_candidate_id_fkey(first_name, is_seed)")
    .eq("viewer_id", userId)
    .order("score", { ascending: false })
    .limit(12);
  const seeds = (top ?? []).filter((r) => (r.profiles as unknown as { is_seed: boolean }).is_seed);
  if (seeds.length < 3) {
    console.warn("Not enough compatible seed people for a demo inbox (check your dealbreakers).");
    return;
  }

  // Two pending intros…
  for (const row of seeds.slice(1, 3)) {
    const name = (row.profiles as unknown as { first_name: string }).first_name;
    await admin.from("intros").insert({
      sender_id: row.candidate_id,
      recipient_id: userId,
      message: `Hi! I'm ${name} — Rumi says we're a ${row.score}% match. Still looking for a place for next year?`,
    });
  }
  // …and one accepted conversation with history.
  const partner = seeds[0];
  const { data: intro } = await admin
    .from("intros")
    .insert({ sender_id: partner.candidate_id, recipient_id: userId, message: DEMO_MESSAGES[0][1], status: "accepted", responded_at: new Date().toISOString() })
    .select("id")
    .single();
  const { data: convo } = await admin.from("conversations").insert({ kind: "direct" }).select("id").single();
  await admin.from("conversation_members").insert([
    { conversation_id: convo!.id, user_id: userId, last_read_at: new Date(Date.now() - 3_600_000).toISOString() },
    { conversation_id: convo!.id, user_id: partner.candidate_id },
  ]);
  await admin.from("intros").update({ conversation_id: convo!.id }).eq("id", intro!.id);
  let t = Date.now() - DEMO_MESSAGES.length * 7 * 60_000;
  for (const [who, body] of DEMO_MESSAGES) {
    t += 7 * 60_000;
    await admin.from("messages").insert({
      conversation_id: convo!.id,
      sender_id: who === "them" ? partner.candidate_id : userId,
      body,
      created_at: new Date(t).toISOString(),
    });
  }
  console.log(`Demo inbox ready for ${email}: 2 intros + 1 conversation.`);
}

async function main() {
  console.log(`Seeding ${PEOPLE.length} fictional students into ${url}…`);
  const removed = await removeExistingSeed();
  if (removed) console.log(`Removed ${removed} previous seed users.`);

  const people: { id: string; first: string }[] = [];
  for (const [index, person] of PEOPLE.entries()) {
    people.push(await createPerson(person, index));
    process.stdout.write(".");
  }
  console.log(`\nCreated ${people.length} people.`);

  await createGroups(people);
  console.log(`Created ${GROUPS.length} groups.`);

  let pairs = 0;
  for (const person of people) {
    const { matches } = await recomputeMatchesFor(person.id);
    pairs += matches;
  }
  console.log(`Computed compatibility (${Math.round(pairs / 2)} mutual matches).`);

  // Real (non-seed) local accounts get fresh scores against the new people.
  const { data: real } = await admin
    .from("profiles")
    .select("id")
    .eq("is_seed", false)
    .not("onboarding_completed_at", "is", null);
  for (const r of real ?? []) await recomputeMatchesFor(r.id);

  if (demoEmail) await seedDemoFor(demoEmail);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
