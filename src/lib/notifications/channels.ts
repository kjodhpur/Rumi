/**
 * Notification channels (Phase 7.5). Pure: which channels a notice may use for a student.
 */

export const NOTIFICATION_KINDS = [
  "intros",
  "messages",
  "matches",
  "groups",
  "deadlines",
  "checkins",
  "agreements",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
/** Kinds whose in-app and email toggles predate the grid and live in user_settings. */
export const LEGACY_KINDS = ["intros", "messages", "matches", "groups"] as const;
export const CHANNELS = ["in_app", "email", "sms", "push"] as const;
export type Channel = (typeof CHANNELS)[number];

export const KIND_LABEL: Record<NotificationKind, string> = {
  intros: "Intros",
  messages: "Messages",
  matches: "New strong matches",
  groups: "Groups",
  deadlines: "Housing deadlines",
  checkins: "Check-ins and RA follow-ups",
  agreements: "Roommate agreements",
};

export const KIND_DESCRIPTION: Record<NotificationKind, string> = {
  intros: "Intros you get, and yours that are accepted. Also people who say they know you.",
  messages:
    "New messages in your chats. Emails are bundled, at most one per chat every 30 minutes.",
  matches: "Someone who fits you really well, and match cards to share.",
  groups: "Invites, join requests, new members, and groups carrying into next term.",
  deadlines: "Roommate requests, room selection and agreement due dates from your housing office.",
  checkins: "Check-ins after you move in, room swaps, and the end-of-term survey.",
  agreements: "Changes, comments and signatures on your roommate agreement.",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  in_app: "In app",
  email: "Email",
  sms: "Text",
  push: "Push",
};

export type Matrix = Record<NotificationKind, Record<Channel, boolean>>;

/** In-app and email on, texts and push off, until the student says otherwise. */
export function defaultMatrix(): Matrix {
  return Object.fromEntries(
    NOTIFICATION_KINDS.map((k) => [k, { in_app: true, email: true, sms: false, push: false }]),
  ) as Matrix;
}

/** Quiet hours for texts and push, in the campus time zone: 9pm to 8am. */
export function inQuietHours(now: Date, timeZone: string, start = 21, end = 8): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now),
  );
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

export interface ChannelContext {
  matrix: Matrix;
  smsReady: boolean; // feature on, phone verified, sms consent
  pushReady: boolean; // feature on, at least one subscription
  quiet: boolean;
  /** Safety notices skip quiet hours and preferences for in-app. */
  urgent?: boolean;
}

export function channelsFor(kind: NotificationKind, ctx: ChannelContext): Channel[] {
  const prefs = ctx.matrix[kind];
  const out: Channel[] = [];
  if (prefs.in_app || ctx.urgent) out.push("in_app");
  if (prefs.email) out.push("email");
  if (prefs.sms && ctx.smsReady && (!ctx.quiet || ctx.urgent)) out.push("sms");
  if (prefs.push && ctx.pushReady && (!ctx.quiet || ctx.urgent)) out.push("push");
  return out;
}

/** SMS keywords per carrier guidelines. */
export function smsKeyword(body: string): "stop" | "start" | "help" | null {
  const word = body
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(word)) return "stop";
  if (["START", "UNSTOP", "YES"].includes(word)) return "start";
  if (["HELP", "INFO"].includes(word)) return "help";
  return null;
}

/** E.164 for US numbers; null when it isn't a plausible US mobile number. */
export function normalizeUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(ten)) return null;
  return `+1${ten}`;
}
