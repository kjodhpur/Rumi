import { cookies } from "next/headers";
import { LOCALE_COOKIE, localizeError, requestLocale } from "@/lib/i18n/errors";

/** Uniform result shape for Server Actions consumed by client components. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T) {
  return { ok: true, data } as ActionResult<T>;
}

/**
 * A failed result. The message is written in English at the call site and answered in the
 * student's language (from the language cookie) when the dictionary knows it.
 */
export function fail(
  error: string,
  fieldErrors?: Record<string, string>,
): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  const locale = requestLocale(() => cookies().get(LOCALE_COOKIE)?.value);
  return { ok: false, error: localizeError(error, locale), fieldErrors };
}

/** Maps Postgres exception names raised by our RPCs to friendly copy. */
export function friendlyDbError(message: string | undefined): string {
  const map: Record<string, string> = {
    not_authenticated: "Please sign in again.",
    cannot_contact: "You can't contact this person right now.",
    intro_exists: "You already have an intro with this person.",
    recently_declined: "They passed on an intro recently. Give it some time.",
    not_found: "That's no longer available.",
    not_pending: "That intro was already answered.",
    already_in_group: "You're already in a group. Leave it first to join another.",
    onboarding_required: "Finish setting up your profile first.",
    not_member: "You're not a member of that group.",
    group_full: "That group is already full.",
    not_allowed: "You can't do that.",
    missing_first_name: "Add your first name.",
    missing_class_year: "Add your year.",
    missing_photo: "Add at least one photo.",
    missing_areas: "Pick at least one neighborhood.",
    missing_move_in: "Pick a move-in date.",
    school_email_required: "Use your school email address.",
    not_a_match: "You can only share a card with one of your matches.",
    invalid_token: "That link isn't valid anymore.",
    not_signed_in: "Please sign in again.",
    splits_must_sum: "The split has to add up to the full amount.",
    invalid_splits: "Check how the expense is split.",
    too_many: "That's the limit for this room.",
    no_request: "Ask for a room change first.",
    no_assignment: "Tell us where you live first.",
    track_locked: "Your housing office set your track.",
    invalid_option: "Pick one of the listed options.",
    invalid_dimension: "That isn't a segment we track.",
    invalid_metric: "That isn't a metric we track.",
  };
  if (!message) return "Something went wrong. Please try again.";
  for (const [key, value] of Object.entries(map)) {
    if (message.includes(key)) return value;
  }
  return "Something went wrong. Please try again.";
}
