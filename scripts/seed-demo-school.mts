/**
 * Demo University (§6): a fictional school for demonstrations. Every row is marked
 * (schools.is_demo, profiles.is_seed + is_demo); staff screens show a "Demo data" badge and
 * student screens a banner. Nothing here is real, and the outcomes report says so.
 *
 *   npm run seed -- --demo-school
 *
 * 200 students, 60 pairs, 15 groups of 3–4, 3 buildings, two comparison groups (Rumi vs
 * the usual process), 8 weeks of check-ins with a few realistic risk cases, signed and
 * unsigned agreements, room changes, one StarRez import with deliberate errors, and a staff
 * account for every role.
 */
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../src/types/database";

type Admin = SupabaseClient<Database>;

export interface DemoDeps {
  admin: Admin;
  monogramPhoto: (initial: string, index: number) => Promise<Buffer>;
  placeholderFor: (image: Buffer) => Promise<string>;
  recomputeSchool: (schoolId: string) => Promise<unknown>;
  assignPairs: (
    candidates: { id: string; signedUpAt: string }[],
    edges: { a: string; b: string; score: number }[],
    options: { minScore: number },
  ) => { pairs: { a: string; b: string; score: number }[] };
  buildDraft: (
    members: {
      id: string;
      firstName: string;
      sleepSchedule: number;
      cleanliness: number;
      noise: number;
      guests: number;
      smoking: string;
      drinking: string;
      pets: string;
    }[],
    watchouts: string[],
  ) => { key: string; title: string; content: string }[];
}

export const DEMO_SCHOOL = "demo";
export const DEMO_DOMAIN = "demo.rumimatch.app";
const CONSENT_VERSION = "2026-11";

let state = 20261104;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const chance = (p: number) => rand() < p;
const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(n)));
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return dateOnly(d);
};

const FIRST = [
  "Avery",
  "Jordan",
  "Riley",
  "Morgan",
  "Casey",
  "Quinn",
  "Rowan",
  "Sage",
  "Emerson",
  "Hayden",
  "Reese",
  "Skyler",
  "Dakota",
  "Finley",
  "Harper",
  "Kai",
  "Logan",
  "Marley",
  "Noel",
  "Parker",
  "Peyton",
  "Remy",
  "Sasha",
  "Taylor",
  "Blake",
  "Cameron",
  "Drew",
  "Elliot",
  "Frankie",
  "Gray",
  "Indie",
  "Jules",
  "Kendall",
  "Lane",
  "Milan",
  "Nico",
  "Oakley",
  "Phoenix",
  "River",
  "Shiloh",
];
const LAST = [
  "Abara",
  "Brooks",
  "Castillo",
  "Dang",
  "Ellis",
  "Farouk",
  "Garza",
  "Hollis",
  "Ibarra",
  "Jensen",
  "Kowal",
  "Lindqvist",
  "Moreau",
  "Nakamura",
  "Okafor",
  "Patel",
  "Quintero",
  "Rossi",
  "Sato",
  "Torres",
  "Underwood",
  "Vance",
  "Whitfield",
  "Xu",
  "Yilmaz",
  "Zamora",
  "Achebe",
  "Bianchi",
  "Chen",
  "Delgado",
];
const MAJORS = [
  "Biology",
  "Computer Science",
  "Nursing",
  "Business",
  "Psychology",
  "Mechanical Engineering",
  "Film",
  "Economics",
  "Journalism",
  "Architecture",
  "Public Health",
  "Data Science",
];
const COLLEGE_FOR: Record<string, string> = {
  Biology: "sciences",
  "Computer Science": "engineering",
  Nursing: "health",
  Business: "business",
  Psychology: "sciences",
  "Mechanical Engineering": "engineering",
  Film: "arts",
  Economics: "business",
  Journalism: "arts",
  Architecture: "arts",
  "Public Health": "health",
  "Data Science": "engineering",
};
const BIOS = [
  "Early riser, gym before class, quiet weeknights.",
  "Night owl who cooks too much pasta. Happy to share.",
  "Plants, podcasts and a very clean kitchen.",
  "Studio major, so I'm out late most nights.",
  "Into board games and low-key weekends.",
  "Runner, coffee person, lights out by eleven.",
  "I like a lively place but I respect headphones-on time.",
  "Homebody with a lot of books. Guests sometimes.",
];
const BUILDINGS = [
  { name: "Maple Hall", college: "maple" },
  { name: "Cedar Hall", college: "cedar" },
  { name: "Willow Hall", college: "willow" },
];

async function removeDemoSchool(admin: Admin) {
  const { data: users } = await admin
    .from("user_settings")
    .select("user_id")
    .like("email", `%@${DEMO_DOMAIN}`);
  for (const u of users ?? []) {
    const { data: files } = await admin.storage.from("photos").list(u.user_id);
    if (files?.length)
      await admin.storage.from("photos").remove(files.map((f) => `${u.user_id}/${f.name}`));
    await admin.auth.admin.deleteUser(u.user_id);
  }
  await admin.from("schools").delete().eq("id", DEMO_SCHOOL);
  return users?.length ?? 0;
}

async function createSchool(admin: Admin) {
  const today = dateOnly(new Date());
  const termStart = addDays(today, -80);
  const { error } = await admin.from("schools").insert({
    id: DEMO_SCHOOL,
    name: "Demo University",
    short_name: "Demo U",
    email_domains: [DEMO_DOMAIN],
    timezone: "America/Phoenix",
    active: true,
    is_demo: true,
    housing_office_name: "Demo University Housing",
    pre_arrival_enabled: true,
    plan: "pilot",
    licensed_beds: 400,
  });
  if (error) throw error;
  await admin.from("areas").insert([
    {
      school_id: DEMO_SCHOOL,
      slug: "demo-north",
      name: "North campus",
      description: "Maple and Cedar halls",
      sort_order: 0,
    },
    {
      school_id: DEMO_SCHOOL,
      slug: "demo-south",
      name: "South campus",
      description: "Willow Hall and the rec center",
      sort_order: 1,
    },
    {
      school_id: DEMO_SCHOOL,
      slug: "demo-downtown",
      name: "Downtown",
      description: "Apartments near the light rail",
      sort_order: 2,
    },
  ]);
  const options = [
    ["campus", "main", "Main campus"],
    ["campus", "downtown", "Downtown campus"],
    ["academic_college", "engineering", "College of Engineering"],
    ["academic_college", "sciences", "College of Sciences"],
    ["academic_college", "business", "School of Business"],
    ["academic_college", "health", "College of Health"],
    ["academic_college", "arts", "College of Arts"],
    ["residential_college", "maple", "Maple Residential College"],
    ["residential_college", "cedar", "Cedar Residential College"],
    ["residential_college", "willow", "Willow Residential College"],
    ["llc", "honors", "Honors community"],
    ["llc", "stem_women", "Women in STEM"],
  ] as const;
  await admin.from("school_options").upsert(
    options.map(([kind, value, label], position) => ({
      school_id: DEMO_SCHOOL,
      kind,
      value,
      label,
      position,
    })),
    { onConflict: "school_id,kind,value" },
  );

  const { data: previous } = await admin
    .from("terms")
    .insert({
      school_id: DEMO_SCHOOL,
      name: "Spring 2026",
      starts_on: addDays(termStart, -150),
      ends_on: addDays(termStart, -40),
      active: false,
    })
    .select("id")
    .single();
  const { data: term, error: termError } = await admin
    .from("terms")
    .insert({
      school_id: DEMO_SCHOOL,
      name: "Fall 2026",
      starts_on: termStart,
      ends_on: addDays(termStart, 120),
      active: true,
      deadlines: {
        roommateRequest: addDays(today, 9),
        selectionOpens: addDays(today, 16),
        selectionCloses: addDays(today, 30),
        agreementDue: addDays(today, 21),
      } as unknown as Json,
    })
    .select("id, starts_on")
    .single();
  if (termError || !term) throw termError ?? new Error("term insert failed");

  await admin.from("room_change_reasons").upsert(
    [
      ["noise", "Noise"],
      ["guests", "Guests"],
      ["cleanliness", "Cleanliness"],
      ["schedule", "Schedule"],
      ["communication", "Communication"],
      ["safety", "Safety"],
      ["accommodation", "Accommodation"],
      ["cost", "Cost"],
      ["other", "Other"],
    ].map(([key, label], position) => ({
      school_id: DEMO_SCHOOL,
      key,
      label,
      position,
      active: true,
    })),
    { onConflict: "school_id,key" },
  );
  await admin.from("escalation_routes").insert([
    {
      school_id: DEMO_SCHOOL,
      category: "harassment",
      destination_label: "Demo U Title IX Office",
      email: `titleix@${DEMO_DOMAIN}`,
      phone: "555-0100",
      active: true,
    },
    {
      school_id: DEMO_SCHOOL,
      category: "wellbeing",
      destination_label: "Demo U CARE Team",
      email: `care@${DEMO_DOMAIN}`,
      phone: "555-0101",
      active: true,
    },
    {
      school_id: DEMO_SCHOOL,
      category: "threat",
      destination_label: "Demo U Police (non-emergency)",
      phone: "555-0102",
      active: true,
    },
  ]);
  return { termId: term.id, termStart: term.starts_on, previousTermId: previous?.id ?? null };
}

async function createAccount(admin: Admin, email: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error(`createUser ${email}`);
  return data.user.id;
}

async function createStaff(admin: Admin) {
  const roles = [
    ["housing_admin", "Alex", "Rivera", {}],
    ["housing_staff", "Sam", "Okoro", { accommodations: true }],
    ["ra", "Jamie", "Lund", { buildings: ["Maple Hall"] }],
    ["analyst", "Robin", "Tran", {}],
    ["moderator", "Morgan", "Hale", {}],
  ] as const;
  const ids: Record<string, string> = {};
  for (const [role, first, last, scopes] of roles) {
    const email = `${role}@${DEMO_DOMAIN}`;
    const id = await createAccount(admin, email);
    await Promise.all([
      admin
        .from("profiles")
        .update({
          is_staff: true,
          is_seed: true,
          is_demo: true,
          first_name: first,
          last_initial: last[0],
        })
        .eq("id", id),
      admin
        .from("user_settings")
        .update({
          last_name: last,
          notify_email_intros: false,
          notify_email_messages: false,
          notify_email_matches: false,
          notify_email_groups: false,
        })
        .eq("user_id", id),
      admin
        .from("staff_members")
        .insert({ user_id: id, school_id: DEMO_SCHOOL, role, scopes: scopes as unknown as Json }),
    ]);
    ids[role] = id;
  }
  return ids;
}

interface Student {
  id: string;
  first: string;
  last: string;
  college: string;
  residential: string;
  prefs: {
    sleep: number;
    clean: number;
    noise: number;
    guests: number;
    smoking: string;
    drinking: string;
    pets: string;
  };
}

async function createStudents(deps: DemoDeps, count: number): Promise<Student[]> {
  const { admin } = deps;
  const out: Student[] = [];
  for (let i = 0; i < count; i++) {
    const first = FIRST[i % FIRST.length];
    const last = LAST[Math.floor(i / FIRST.length) % LAST.length];
    const email = `${first}.${last}.${i}@${DEMO_DOMAIN}`.toLowerCase();
    const id = await createAccount(admin, email);
    const gender = pick(["woman", "woman", "man", "man", "nonbinary"] as const);
    const major = pick(MAJORS);
    // 180 in the two Rumi halls, 20 in the comparison hall.
    const residential = i < 180 ? (i % 2 ? "maple" : "cedar") : "willow";
    const year = pick(["freshman", "freshman", "sophomore", "junior", "senior"] as const);
    const late = ["Film", "Architecture"].includes(major);
    const prefs = {
      sleep: clamp(late ? between(3, 5) : between(1, 4)),
      clean: clamp(between(2, 5)),
      noise: clamp(between(1, 4)),
      guests: clamp(between(1, 4)),
      smoking: chance(0.92) ? "never" : pick(["sometimes", "regularly"]),
      drinking: pick(["never", "socially", "socially", "socially", "often"]),
      pets: chance(0.1) ? "have" : chance(0.1) ? "want" : "none",
    };
    const image = await deps.monogramPhoto(first.charAt(0), i);
    const storagePath = `${id}/${randomUUID()}.jpg`;
    const { error: uploadError } = await admin.storage
      .from("photos")
      .upload(storagePath, image, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (uploadError) throw uploadError;
    const joined = between(20, 90);
    const dealbreakers = ["budget"];
    if (chance(0.4)) dealbreakers.push("smoking");
    if (prefs.noise <= 1 && chance(0.4)) dealbreakers.push("noise");
    await Promise.all([
      admin
        .from("profiles")
        .update({
          first_name: first,
          last_initial: last[0],
          gender,
          class_year: year,
          major,
          bio: pick(BIOS),
          is_seed: true,
          is_demo: true,
          student_verified_at: new Date().toISOString(),
          onboarding_step: 10,
          track: year === "freshman" ? "freshman" : chance(0.12) ? "transfer" : "returning",
          campus: chance(0.85) ? "main" : "downtown",
          academic_college: COLLEGE_FOR[major],
          residential_college: residential,
          llc: chance(0.12)
            ? "honors"
            : gender === "woman" && COLLEGE_FOR[major] === "engineering" && chance(0.5)
              ? "stem_women"
              : null,
          gender_inclusive: chance(0.6) ? chance(0.3) : null,
          last_active_at: daysAgo(between(0, 6)),
          created_at: daysAgo(joined),
        })
        .eq("id", id),
      admin
        .from("user_settings")
        .update({
          last_name: last,
          notify_email_intros: false,
          notify_email_messages: false,
          notify_email_matches: false,
          notify_email_groups: false,
        })
        .eq("user_id", id),
      admin
        .from("preferences")
        .update({
          budget_min: between(10, 14) * 50,
          budget_max: between(16, 22) * 50,
          areas: chance(0.7) ? ["demo-north", "demo-south"] : ["demo-north", "demo-downtown"],
          move_in_date: addDays(dateOnly(new Date()), between(250, 290)),
          lease_length: pick(["academic_year", "academic_year", "twelve_months"]),
          housing_type: pick(["on_campus", "on_campus", "either", "off_campus"]),
          gender_pref: gender === "nonbinary" || chance(0.4) ? [] : [gender, "nonbinary"],
          sleep_schedule: prefs.sleep,
          cleanliness: prefs.clean,
          noise: prefs.noise,
          guests: prefs.guests,
          smoking: prefs.smoking,
          drinking: prefs.drinking,
          pets: prefs.pets,
          study: pick(["campus", "home_quiet", "mix", "home_social"]),
          dealbreakers,
          weights: chance(0.5) ? { sleep: pick([2, 3]), cleanliness: pick([1, 2, 3]) } : {},
        })
        .eq("user_id", id),
      admin
        .from("photos")
        .insert({
          user_id: id,
          storage_path: storagePath,
          position: 0,
          width: 960,
          height: 1200,
          placeholder: await deps.placeholderFor(image),
        }),
    ]);
    const consents = [
      chance(0.88) ? "share_with_housing" : null,
      chance(0.75) ? "checkins" : null,
      chance(0.65) ? "research_outcomes" : null,
      chance(0.3) ? "family_view" : null,
    ].filter((k): k is string => Boolean(k));
    if (consents.length)
      await admin
        .from("consents")
        .insert(
          consents.map((kind) => ({
            user_id: id,
            school_id: DEMO_SCHOOL,
            kind,
            version: CONSENT_VERSION,
            granted_at: daysAgo(joined),
          })),
        );
    await admin
      .from("profiles")
      .update({ onboarding_completed_at: daysAgo(joined - 1) })
      .eq("id", id);
    out.push({ id, first, last, college: COLLEGE_FOR[major], residential, prefs });
    if (i % 20 === 19) process.stdout.write(`${i + 1} `);
  }
  process.stdout.write("\n");
  return out;
}

async function createGroupWith(
  deps: DemoDeps,
  members: Student[],
  name: string,
  termId: string,
  signed: boolean,
  approvedBy: string | null,
) {
  const { admin } = deps;
  const { data: g, error } = await admin
    .from("groups")
    .insert({
      school_id: DEMO_SCHOOL,
      name,
      owner_id: members[0].id,
      target_size: Math.max(2, members.length),
    })
    .select("id")
    .single();
  if (error || !g) throw error ?? new Error("group insert failed");
  await admin
    .from("group_members")
    .insert(
      members.map((m, i) => ({
        group_id: g.id,
        user_id: m.id,
        role: i === 0 ? "owner" : "member",
      })),
    );
  const { data: c } = await admin
    .from("conversations")
    .insert({ kind: "group", group_id: g.id })
    .select("id")
    .single();
  if (c) {
    await admin
      .from("conversation_members")
      .insert(members.map((m) => ({ conversation_id: c.id, user_id: m.id })));
    await admin
      .from("messages")
      .insert({
        conversation_id: c.id,
        kind: "system",
        body: `${members[0].first} started ${name}`,
      });
  }
  await admin.from("pairings").insert({
    school_id: DEMO_SCHOOL,
    group_id: g.id,
    member_ids: members.map((m) => m.id),
    term_id: termId,
    status: approvedBy ? "approved" : chance(0.3) ? "needs_review" : "unreviewed",
    approved_by: approvedBy,
    approved_at: approvedBy ? daysAgo(between(30, 60)) : null,
  });
  const sections = deps.buildDraft(
    members.map((m) => ({
      id: m.id,
      firstName: m.first,
      sleepSchedule: m.prefs.sleep,
      cleanliness: m.prefs.clean,
      noise: m.prefs.noise,
      guests: m.prefs.guests,
      smoking: m.prefs.smoking,
      drinking: m.prefs.drinking,
      pets: m.prefs.pets,
    })),
    [],
  );
  const ids = members.map((m) => m.id);
  const { data: agreement } = await admin
    .from("agreements")
    .insert({
      group_id: g.id,
      member_ids: ids,
      status: signed ? "signed" : "draft",
      signed_at: signed ? daysAgo(between(20, 50)) : null,
      template_version: 1,
    })
    .select("id")
    .single();
  if (agreement) {
    await admin
      .from("agreement_sections")
      .insert(
        sections.map((s, position) => ({
          agreement_id: agreement.id,
          key: s.key,
          title: s.title,
          content: s.content,
          position,
          accepted_by: signed ? ids : ids.slice(0, 1),
        })),
      );
    await admin
      .from("agreement_events")
      .insert({
        agreement_id: agreement.id,
        actor_id: ids[0],
        kind: signed ? "signed" : "created",
      });
  }
  return g.id;
}

/** Sequential room numbers per building. */
function roomAllocator() {
  const next: Record<string, number> = {};
  return (building: string) => {
    next[building] = (next[building] ?? 100) + 1;
    return String(next[building]);
  };
}

export async function seedDemoSchool(deps: DemoDeps) {
  const { admin } = deps;
  console.log("Demo University: removing the previous demo school…");
  const removed = await removeDemoSchool(admin);
  if (removed) console.log(`Removed ${removed} demo accounts.`);
  const { termId, termStart, previousTermId } = await createSchool(admin);
  const staff = await createStaff(admin);
  console.log(
    `Staff: ${Object.keys(staff)
      .map((r) => `${r}@${DEMO_DOMAIN}`)
      .join(", ")}`,
  );

  console.log("Creating 200 students…");
  const students = await createStudents(deps, 200);

  // Housing: Maple and Cedar matched with Rumi; Willow is the comparison hall (usual process).
  const byHall = (college: string) => students.filter((s) => s.residential === college);
  const rumiStudents = [...byHall("maple"), ...byHall("cedar")];
  const willow = byHall("willow");
  const allocate = roomAllocator();
  const moveIn = addDays(termStart, 3);

  // Score everyone first, then form pairs and groups the way students would: from mutual fits.
  console.log("Scoring compatibility…");
  await deps.recomputeSchool(DEMO_SCHOOL);
  const ids = rumiStudents.map((st) => st.id);
  const scores = new Map<string, number>();
  // Small chunks: the API caps a response at 1,000 rows.
  for (let i = 0; i < ids.length; i += 8) {
    const { data } = await admin
      .from("match_scores")
      .select("viewer_id, candidate_id, score")
      .in("viewer_id", ids.slice(i, i + 8))
      .limit(1000);
    for (const r of data ?? []) scores.set(`${r.viewer_id}|${r.candidate_id}`, r.score);
  }
  const fit = (a: string, b: string) => scores.get(`${a}|${b}`) ?? null;
  const used = new Set<string>();

  // Groups of 3–4: greedy around a seed student, every pair must be compatible.
  const groups: { id: string; members: Student[]; building: string; score: number }[] = [];
  for (const seed of rumiStudents) {
    if (groups.length >= 15) break;
    if (used.has(seed.id)) continue;
    const size = groups.length % 3 === 0 ? 4 : 3;
    const members = [seed];
    const pool = rumiStudents
      .filter((st) => st.id !== seed.id && !used.has(st.id) && st.residential === seed.residential)
      .sort((x, y) => (fit(seed.id, y.id) ?? 0) - (fit(seed.id, x.id) ?? 0));
    for (const cand of pool) {
      if (members.length >= size) break;
      if (members.every((m) => (fit(m.id, cand.id) ?? 0) >= 60 && (fit(cand.id, m.id) ?? 0) >= 60))
        members.push(cand);
    }
    if (members.length < size) continue;
    members.forEach((m) => used.add(m.id));
    const building = BUILDINGS.find((b) => b.college === seed.residential)!.name;
    const pairScores = members.flatMap((a, i) =>
      members.slice(i + 1).map((b) => fit(a.id, b.id) ?? 0),
    );
    const id = await createGroupWith(
      deps,
      members,
      `${building.split(" ")[0]} ${["Suite", "Crew", "House"][groups.length % 3]} ${groups.length + 1}`,
      termId,
      chance(0.6),
      chance(0.7) ? staff.housing_admin : null,
    );
    groups.push({ id, members, building, score: Math.min(...pairScores) });
  }

  // 60 pairs by maximum-weight matching, the same algorithm housing auto-pair uses.
  const rest = rumiStudents.filter((st) => !used.has(st.id));
  const edges = rest
    .flatMap((a, i) =>
      rest
        .slice(i + 1)
        .map((b) => ({
          a: a.id,
          b: b.id,
          score: Math.min(fit(a.id, b.id) ?? -1, fit(b.id, a.id) ?? -1),
        })),
    )
    .filter((e) => e.score >= 0);
  const matched = deps.assignPairs(
    rest.map((st, i) => ({ id: st.id, signedUpAt: String(i).padStart(4, "0") })),
    edges,
    { minScore: 40 },
  );
  const pairs: { id: string; members: Student[]; building: string; score: number }[] = [];
  for (const p of matched.pairs.sort((x, y) => y.score - x.score).slice(0, 60)) {
    const members = [rest.find((st) => st.id === p.a)!, rest.find((st) => st.id === p.b)!];
    const building = BUILDINGS.find((b) => b.college === members[0].residential)!.name;
    const id = await createGroupWith(
      deps,
      members,
      `${members[0].first} & ${members[1].first}`,
      termId,
      chance(0.55),
      chance(0.75) ? staff.housing_admin : null,
    );
    pairs.push({ id, members, building, score: p.score });
  }
  console.log(
    `Created ${groups.length} groups and ${pairs.length} pairs; ${rumiStudents.length - used.size - pairs.length * 2} students left unmatched.`,
  );

  // A StarRez import (with deliberate errors) placed the matched students; Willow came the usual way.
  const { data: job } = await admin
    .from("import_jobs")
    .insert({
      school_id: DEMO_SCHOOL,
      provider: "csv",
      kind: "assignments",
      file_name: "fall-2026-assignments.csv",
      status: "completed",
      created_by: staff.housing_admin,
      created_at: daysAgo(70),
      counts: { inserts: 0, updates: 0, unchanged: 0, errors: 4 } as unknown as Json,
      errors: [
        { line: 14, message: "Use YYYY-MM-DD or MM/DD/YYYY for the move-in date." },
        { line: 37, message: "No Rumi student with this ID or email. Not created." },
        { line: 52, message: "Each row needs a student ID or an email." },
        { line: 88, message: "Same student as line 61. Skipped." },
      ] as unknown as Json,
    })
    .select("id")
    .single();

  const assignmentOf = new Map<string, { id: string; building: string }>();
  const housed = [...groups, ...pairs];
  let inserted = 0;
  for (const unit of housed) {
    const room = allocate(unit.building);
    for (const m of unit.members) {
      const { data: a } = await admin
        .from("assignments")
        .insert({
          user_id: m.id,
          school_id: DEMO_SCHOOL,
          term_id: termId,
          building: unit.building,
          room,
          moved_in_at: moveIn,
          source: "import",
          external_ref: `SR-${room}-${m.id.slice(0, 6)}`,
          import_job_id: job?.id ?? null,
        })
        .select("id")
        .single();
      if (a) assignmentOf.set(m.id, { id: a.id, building: unit.building });
      inserted += 1;
    }
  }
  for (let i = 0; i + 1 < willow.length; i += 2) {
    const room = allocate("Willow Hall");
    for (const m of [willow[i], willow[i + 1]]) {
      const { data: a } = await admin
        .from("assignments")
        .insert({
          user_id: m.id,
          school_id: DEMO_SCHOOL,
          term_id: termId,
          building: "Willow Hall",
          room,
          moved_in_at: moveIn,
          source: "import",
        })
        .select("id")
        .single();
      if (a) assignmentOf.set(m.id, { id: a.id, building: "Willow Hall" });
    }
  }
  if (job)
    await admin
      .from("import_jobs")
      .update({
        counts: { inserts: inserted, updates: 0, unchanged: 0, errors: 4 } as unknown as Json,
      })
      .eq("id", job.id);

  // Eight weeks of check-ins. Most rooms are fine; a few drift down with noise and guests.
  const roomOf = new Map<string, string>();
  for (const unit of housed) for (const m of unit.members) roomOf.set(m.id, unit.id);
  // The rooms that struggle are mostly the weaker fits, as they tend to be in real life.
  const byScore = [...housed].sort((x, y) => x.score - y.score);
  const troubled = new Set(
    [
      ...byScore.slice(0, 6),
      byScore[Math.floor(byScore.length / 2)],
      byScore[byScore.length - 3],
    ].map((u) => u.id),
  );
  let checkins = 0;
  for (const [userId, a] of assignmentOf) {
    const unit = roomOf.get(userId);
    const struggling = unit ? troubled.has(unit) : chance(0.15);
    const rows = [14, 28, 42, 56].map((offset, w) => {
      const base = struggling ? 4 - w : between(3, 5);
      const score = clamp(base + (chance(0.2) ? -1 : 0));
      const tags =
        score <= 3 ? [pick(["noise", "guests", "cleanliness", "schedule", "communication"])] : [];
      return {
        assignment_id: a.id,
        user_id: userId,
        term_id: termId,
        due_on: addDays(moveIn, offset),
        score,
        tags,
        submitted_at: daysAgo(80 - offset + 2),
        share_with_ra: struggling && w >= 2,
      };
    });
    await admin.from("checkins").insert(rows);
    checkins += rows.length;
    if (struggling && unit) {
      await admin
        .from("risk_events")
        .insert({
          user_id: userId,
          assignment_id: a.id,
          level: "high",
          reasons: ["Check-in scores fell three weeks running", "Noise came up twice"],
        });
    }
  }
  // Open RA cases for the troubled rooms, with notes from the RA.
  for (const unit of housed.filter((u) => troubled.has(u.id))) {
    const first = unit.members[0];
    const a = assignmentOf.get(first.id);
    if (!a) continue;
    const { data: c } = await admin
      .from("ra_cases")
      .insert({
        school_id: DEMO_SCHOOL,
        assignment_id: a.id,
        user_id: first.id,
        building: unit.building,
        status: "open",
        opened_by: staff.ra,
      })
      .select("id")
      .single();
    if (c)
      await admin
        .from("ra_case_notes")
        .insert({
          case_id: c.id,
          author_id: staff.ra,
          body: "Talked with both roommates. Quiet hours start at 11 on weeknights; checking back next week.",
        });
  }

  // Room changes: some from students in Rumi, some imported without reasons (the tagging queue).
  const movers = [...troubled].flatMap((id) =>
    housed.find((u) => u.id === id)!.members.slice(0, 1),
  );
  const extra = willow.filter(() => chance(0.3));
  for (const m of [...movers, ...extra]) {
    const a = assignmentOf.get(m.id);
    if (!a) continue;
    const imported = chance(0.5);
    const unitScore = housed.find((u) => u.members.some((x) => x.id === m.id))?.score ?? null;
    await admin.from("room_change_requests").insert({
      school_id: DEMO_SCHOOL,
      user_id: m.id,
      assignment_id: a.id,
      term_id: termId,
      building: a.building,
      reason_keys: imported
        ? []
        : [pick(["noise", "guests", "schedule"]), ...(chance(0.4) ? ["communication"] : [])],
      match_score_at_assignment: a.building === "Willow Hall" ? null : unitScore,
      agreement_signed: a.building === "Willow Hall" ? null : chance(0.3),
      source: imported ? "import" : "in_app",
      status: "open",
      created_at: daysAgo(between(5, 40)),
    });
  }

  // Comparison groups for the outcomes report.
  await admin.from("pilot_cohorts").insert([
    {
      school_id: DEMO_SCHOOL,
      term_id: termId,
      name: "Maple and Cedar (matched with Rumi)",
      arm: "rumi",
      rule: { residential_colleges: ["maple", "cedar"], buildings: [] } as unknown as Json,
      created_by: staff.housing_admin,
    },
    {
      school_id: DEMO_SCHOOL,
      term_id: termId,
      name: "Willow (usual process)",
      arm: "control",
      rule: { residential_colleges: ["willow"], buildings: [] } as unknown as Json,
      created_by: staff.housing_admin,
    },
  ]);

  // Last term's end-of-term survey, so "Keep your group?" and the outcomes report have history.
  if (previousTermId) {
    const surveyed = housed.slice(0, 20).flatMap((u) => u.members.map((m) => ({ m, u })));
    await admin
      .from("outcome_surveys")
      .insert(
        surveyed.map(({ m, u }) => ({
          user_id: m.id,
          school_id: DEMO_SCHOOL,
          group_id: u.id,
          term_id: previousTermId,
          room_again: troubled.has(u.id) ? "no" : pick(["yes", "yes", "maybe"]),
          score: troubled.has(u.id) ? between(1, 2) : between(3, 5),
          friction_tags: troubled.has(u.id) ? ["noise"] : [],
        })),
      );
  }

  console.log(
    `Demo University ready: 200 students, ${checkins} check-ins, ${movers.length + extra.length} room changes.`,
  );
  console.log(
    `Sign in to /staff as housing_admin@${DEMO_DOMAIN} (codes arrive in Mailpit). Every screen shows "Demo data".`,
  );
}
