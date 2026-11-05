import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { localizeError } from "./errors-server";
import { localizeNotice } from "./notifications";

/**
 * Missing-translation check for server errors. Every literal message a student-facing action
 * (or the shared validation it uses) can return must have a Spanish entry in the errors
 * dictionary, or `fail()` would answer a Spanish reader in English. Staff-only actions are
 * English by design: their files aren't listed, and STAFF_ONLY names the staff actions that
 * share a file with student ones.
 */
const STUDENT_FILES = [
  "app/actions/agreements.ts",
  "app/actions/auth.ts",
  "app/actions/badges.ts",
  "app/actions/calendar.ts",
  "app/actions/checkins.ts",
  "app/actions/consent.ts",
  "app/actions/consistency.ts",
  "app/actions/family-share.ts",
  "app/actions/groups.ts",
  "app/actions/match-share.ts",
  "app/actions/messages.ts",
  "app/actions/notification-channels.ts",
  "app/actions/notifications.ts",
  "app/actions/onboarding.ts",
  "app/actions/outcome-surveys.ts",
  "app/actions/photos.ts",
  "app/actions/profile-media.ts",
  "app/actions/room-calendar.ts",
  "app/actions/room-hub.ts",
  "app/actions/room-swaps.ts",
  "app/actions/safety.ts",
  "app/actions/scenarios.ts",
  "app/actions/settings.ts",
  "app/actions/social-links.ts",
  "app/actions/social.ts",
  "app/actions/spotify.ts",
  "app/actions/student-id.ts",
  "app/actions/suggestions.ts",
  "lib/validation.ts",
  // friendlyDbError: database errors mapped to plain words
  "lib/action.ts",
  // Class-schedule feed errors, passed to fail() as they are
  "lib/calendar/fetch-feed.ts",
];

/** Messages built with template literals, with sample values filled in. */
const TEMPLATED = [
  "Use your school email (like you@asu.edu).",
  "You can add up to 6 photos.",
  "Clips can be up to 30 seconds.",
];

/** Staff-only actions that share a file with student ones; their messages stay English. */
const STAFF_ONLY = new Set([
  // room-swaps.ts: runSwapFinder, decideSwapProposal, completeSwap
  "Pick a school.",
  "Only housing staff can run swaps.",
  "Couldn't save the proposals.",
  "Check the proposal.",
  "Only housing staff can review swaps.",
  "That proposal was already decided.",
  "Only housing staff can complete swaps.",
  "Only accepted swaps can be marked done.",
  // safety.ts: escalation routes, the report queue, warnings, suspensions, screening
  "Invalid route configuration.",
  "Housing admins only.",
  "Invalid route ID.",
  "Couldn't toggle route.",
  "Couldn't delete route.",
  "Invalid report ID.",
  "Pick a status.",
  "Moderators or housing admins only.",
  "That report isn't in your school's queue.",
  "Couldn't update report status.",
  "Invalid user ID.",
  "That student isn't at your school.",
  "Warning message is required.",
  "You cannot suspend yourself.",
  "You can only suspend students at your school.",
  "Couldn't suspend student.",
  "You can only restore students at your school.",
  "Couldn't restore student.",
  "Pick one of your school's escalation routes first.",
  "That clip was already reviewed.",
  "Only housing admins can change message screening.",
  // checkins.ts: the RA's notification about a check-in
  "Open the RA workspace for details.",
  "Crisis resources were shown to the student. No content is attached.",
  // lib/action.ts: analytics errors on staff dashboards
  "That isn't a segment we track.",
  "That isn't a metric we track.",
]);

/** Errors go through fail(); notification bodies through the notifications templates. */
const translated = (message: string) =>
  localizeError(message, "es") !== message || localizeNotice(message, "es") !== message;

/** Messages returned to students: fail("…"), validation messages and notification bodies. */
const MESSAGE =
  /(?:fail\(\s*|Error\(\s*|message:\s*|error:\s*|,\s*|^\s+\w+:\s*|=\s*)"([A-Z][^"\n]{3,}?[.!?])"/gm;

function messagesIn(file: string) {
  const source = readFileSync(join(__dirname, "..", "..", file), "utf8");
  return [...source.matchAll(MESSAGE)].map((m) => m[1]!);
}

describe("server errors students can see", () => {
  it("are found by the check (it isn't silently matching nothing)", () => {
    expect(messagesIn("app/actions/groups.ts").length).toBeGreaterThan(5);
    expect(messagesIn("lib/action.ts")).toContain("That group is already full.");
  });

  it("all have a Spanish translation", () => {
    const missing = STUDENT_FILES.flatMap((file) =>
      messagesIn(file)
        .filter((message) => !STAFF_ONLY.has(message) && !translated(message))
        .map((message) => `${file}: ${message}`),
    );
    expect([...new Set(missing)]).toEqual([]);
  });

  it("including the templated ones", () => {
    expect(TEMPLATED.filter((message) => !translated(message))).toEqual([]);
  });
});
