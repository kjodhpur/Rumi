/**
 * Notification channels (Phase 7.5). Pure: which channels a notice may use for a student.
 */

export const NOTIFICATION_KINDS = ["intros", "messages", "matches", "groups", "deadlines", "checkins", "agreements"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
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

export type Matrix = Record<NotificationKind, Record<Channel, boolean>>;

/** In-app and email on, texts and push off, until the student says otherwise. */
export function defaultMatrix(): Matrix {
  return Object.fromEntries(NOTIFICATION_KINDS.map((k) => [k, { in_app: true, email: true, sms: false, push: false }])) as Matrix;
}

/** Quiet hours for texts and push, in the campus time zone: 9pm to 8am. */
export function inQuietHours(now: Date, timeZone: string, start = 21, end = 8): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));
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
  const word = body.trim().toUpperCase().replace(/[^A-Z]/g, "");
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
