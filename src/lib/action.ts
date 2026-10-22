/** Uniform result shape for Server Actions consumed by client components. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T) {
  return { ok: true, data } as ActionResult<T>;
}

export function fail(error: string, fieldErrors?: Record<string, string>): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  return { ok: false, error, fieldErrors };
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
  };
  if (!message) return "Something went wrong. Please try again.";
  for (const [key, value] of Object.entries(map)) {
    if (message.includes(key)) return value;
  }
  return "Something went wrong. Please try again.";
}
