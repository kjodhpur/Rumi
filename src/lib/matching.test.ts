import { describe, expect, it } from "vitest";
import {
  computeMatch,
  emptyHousing,
  emptyLifestyle,
  lifestyleScore,
  musicScore,
  passesHardFilters,
  rankMatches,
  scoresAreSymmetric,
} from "./matching";
import type { MatchCandidate, Profile } from "./types";

function makeProfile(overrides: Partial<Profile> & { id: string }): Profile {
  return {
    email: `${overrides.id}@asu.edu`,
    first_name: "Alex",
    last_initial: "M",
    photo_url: null,
    pronouns: null,
    year: "Sophomore",
    major: "CS",
    campus: "Tempe",
    bio: "Hello",
    instagram: null,
    own_gender: "woman",
    show_gender_publicly: false,
    onboarding_complete: true,
    onboarding_step: 6,
    paused: false,
    suspended: false,
    is_seed: false,
    verified: true,
    school_id: null,
    hide_profile: false,
    theme_preference: "system",
    show_social_links: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function candidate(
  id: string,
  tweaks?: {
    profile?: Partial<Profile>;
    housing?: Partial<ReturnType<typeof emptyHousing>>;
    lifestyle?: Partial<ReturnType<typeof emptyLifestyle>>;
    spotify?: boolean;
  },
): MatchCandidate {
  return {
    profile: makeProfile({ id, ...tweaks?.profile }),
    housing: { ...emptyHousing(id), ...tweaks?.housing },
    lifestyle: { ...emptyLifestyle(id), ...tweaks?.lifestyle },
    spotifyConnected: tweaks?.spotify ?? false,
    topArtists: tweaks?.spotify
      ? [
          { id: "a1", name: "Artist One", image_url: null, rank: 1 },
          { id: "a2", name: "Artist Two", image_url: null, rank: 2 },
        ]
      : [],
    genres: tweaks?.spotify
      ? [
          { genre: "indie", count: 10 },
          { genre: "pop", count: 5 },
        ]
      : [],
  };
}

describe("passesHardFilters", () => {
  it("rejects incomplete or paused profiles", () => {
    const a = candidate("a");
    const b = candidate("b", { profile: { onboarding_complete: false } });
    expect(
      passesHardFilters(a, b, { blockedIds: new Set(), viewerId: "a" }),
    ).toBe(false);
  });

  it("rejects non-overlapping budgets", () => {
    const a = candidate("a", { housing: { budget_min: 400, budget_max: 600 } });
    const b = candidate("b", { housing: { budget_min: 1500, budget_max: 2000 } });
    expect(
      passesHardFilters(a, b, { blockedIds: new Set(), viewerId: "a" }),
    ).toBe(false);
  });

  it("rejects blocked users", () => {
    const a = candidate("a");
    const b = candidate("b");
    expect(
      passesHardFilters(a, b, { blockedIds: new Set(["b"]), viewerId: "a" }),
    ).toBe(false);
  });

  it("rejects dealbreaker mismatches", () => {
    const a = candidate("a", {
      lifestyle: { smoking: "no", dealbreakers: ["smoking"] },
    });
    const b = candidate("b", { lifestyle: { smoking: "yes" } });
    expect(
      passesHardFilters(a, b, { blockedIds: new Set(), viewerId: "a" }),
    ).toBe(false);
  });

  it("allows compatible pair", () => {
    const a = candidate("a");
    const b = candidate("b");
    expect(
      passesHardFilters(a, b, { blockedIds: new Set(), viewerId: "a" }),
    ).toBe(true);
  });

  it("enforces gender preference both directions", () => {
    const a = candidate("a", {
      profile: { own_gender: "woman" },
      lifestyle: { gender_preference: "same-gender" },
    });
    const b = candidate("b", {
      profile: { own_gender: "man" },
      lifestyle: { gender_preference: "any" },
    });
    expect(
      passesHardFilters(a, b, { blockedIds: new Set(), viewerId: "a" }),
    ).toBe(false);
  });
});

describe("lifestyleScore", () => {
  it("scores identical prefs near 100", () => {
    const a = emptyLifestyle("a");
    const b = emptyLifestyle("b");
    const result = lifestyleScore(a, b);
    expect(result.score).toBeGreaterThan(99);
    expect(result.inCommon.length).toBeGreaterThan(0);
  });

  it("scores opposite prefs lower", () => {
    const a = emptyLifestyle("a");
    const b = {
      ...emptyLifestyle("b"),
      sleep_schedule: 1,
      cleanliness: 1,
      guests: 1,
      noise_tolerance: 1,
      social_level: 1,
      study_at_home: 1,
      cooking_sharing: 1,
    };
    a.sleep_schedule = 5;
    a.cleanliness = 5;
    a.guests = 5;
    a.noise_tolerance = 5;
    a.social_level = 5;
    a.study_at_home = 5;
    a.cooking_sharing = 5;
    const result = lifestyleScore(a, b);
    expect(result.score).toBeLessThan(10);
    expect(result.frictionPoints.length).toBeGreaterThan(0);
  });

  it("weights very-important categories more", () => {
    const baseA = emptyLifestyle("a");
    const baseB = emptyLifestyle("b");
    baseA.sleep_schedule = 1;
    baseB.sleep_schedule = 5;
    baseA.weights = { ...baseA.weights, sleep_schedule: "very" };
    baseB.weights = { ...baseB.weights, sleep_schedule: "very" };
    const weighted = lifestyleScore(baseA, baseB);

    const mildA = emptyLifestyle("a");
    const mildB = emptyLifestyle("b");
    mildA.sleep_schedule = 1;
    mildB.sleep_schedule = 5;
    mildA.weights = { ...mildA.weights, sleep_schedule: "not" };
    mildB.weights = { ...mildB.weights, sleep_schedule: "not" };
    const mild = lifestyleScore(mildA, mildB);

    expect(weighted.score).toBeLessThan(mild.score);
  });
});

describe("musicScore", () => {
  it("rewards shared artists and genres", () => {
    const artists = [
      { id: "1", name: "A", image_url: null, rank: 1 },
      { id: "2", name: "B", image_url: null, rank: 2 },
    ];
    const genres = [
      { genre: "pop", count: 8 },
      { genre: "rock", count: 3 },
    ];
    const same = musicScore(artists, artists, genres, genres);
    expect(same.score).toBeGreaterThan(90);
    expect(same.sharedArtists.length).toBe(2);

    const different = musicScore(
      artists,
      [{ id: "9", name: "Z", image_url: null, rank: 1 }],
      genres,
      [{ genre: "jazz", count: 5 }],
    );
    expect(different.score).toBeLessThan(same.score);
  });
});

describe("computeMatch / rankMatches", () => {
  it("is symmetric", () => {
    const a = candidate("a", { spotify: true });
    const b = candidate("b", { spotify: true, profile: { campus: "Tempe", year: "Junior" } });
    expect(scoresAreSymmetric(a, b)).toBe(true);
  });

  it("applies campus and year bonuses", () => {
    const sharedLifestyle = {
      sleep_schedule: 2,
      cleanliness: 4,
      guests: 2,
      noise_tolerance: 4,
      social_level: 2,
      study_at_home: 4,
      cooking_sharing: 2,
    };
    const a = candidate("a", {
      profile: { campus: "Tempe", year: "Junior" },
      lifestyle: { ...sharedLifestyle, sleep_schedule: 1 },
    });
    const same = candidate("b", {
      profile: { campus: "Tempe", year: "Junior" },
      lifestyle: { ...sharedLifestyle, sleep_schedule: 3 },
    });
    const diff = candidate("c", {
      profile: { campus: "Polytechnic", year: "Freshman" },
      lifestyle: { ...sharedLifestyle, sleep_schedule: 3 },
    });
    const sameBreakdown = computeMatch(a, same);
    const diffBreakdown = computeMatch(a, diff);
    expect(sameBreakdown.campusBonus).toBe(3);
    expect(sameBreakdown.yearBonus).toBe(2);
    expect(diffBreakdown.campusBonus).toBe(0);
    expect(diffBreakdown.yearBonus).toBe(0);
    expect(sameBreakdown.finalScore).toBeLessThanOrEqual(100);
    expect(sameBreakdown.finalScore).toBeGreaterThan(diffBreakdown.finalScore);
  });

  it("caps at 100", () => {
    const a = candidate("a", {
      spotify: true,
      profile: { campus: "Tempe", year: "Senior" },
    });
    const b = candidate("b", {
      spotify: true,
      profile: { campus: "Tempe", year: "Senior" },
    });
    expect(computeMatch(a, b).finalScore).toBeLessThanOrEqual(100);
  });

  it("ranks higher scores first", () => {
    const viewer = candidate("viewer");
    const close = candidate("close");
    const far = candidate("far", {
      lifestyle: {
        sleep_schedule: 1,
        cleanliness: 1,
        guests: 1,
        noise_tolerance: 1,
        social_level: 1,
        study_at_home: 1,
        cooking_sharing: 1,
      },
    });
    const ranked = rankMatches(viewer, [far, close], {
      blockedIds: new Set(),
      viewerId: "viewer",
    });
    expect(ranked[0]?.otherId).toBe("close");
  });

  it("uses lifestyle-only when Spotify missing", () => {
    const a = candidate("a");
    const b = candidate("b");
    const breakdown = computeMatch(a, b);
    expect(breakdown.musicScore).toBeNull();
  });

  it("applies soft mutual trust bonus (+0–5)", () => {
    const a = candidate("a");
    const b = candidate("b");
    const base = computeMatch(a, b);
    const withMutuals = computeMatch(a, b, { mutualCount: 3 });
    expect(withMutuals.mutualBonus).toBe(3);
    expect(withMutuals.finalScore).toBeCloseTo(Math.min(100, base.finalScore + 3), 5);
    expect(computeMatch(a, b, { mutualCount: 10 }).mutualBonus).toBe(5);
  });
});
