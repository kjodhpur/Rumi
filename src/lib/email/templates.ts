import { absoluteUrl } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import { interpolate, type Params } from "@/lib/i18n/core";
import { messagesFor } from "@/lib/i18n/messages";

function escape(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

interface LayoutInput {
  preheader: string;
  heading: string;
  body: string;
  quote?: string;
  cta: { label: string; href: string };
  /** Replaces the notification-settings footer for emails that aren't notifications. */
  footer?: string;
  locale?: Locale;
}

/** One calm, accessible layout for every notification email. */
export function layout({
  preheader,
  heading,
  body,
  quote,
  cta,
  footer,
  locale = "en",
}: LayoutInput) {
  const m = messagesFor(locale).email;
  const href = absoluteUrl(cta.href);
  const settings = absoluteUrl("/settings/notifications");
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escape(heading)}</title></head>
<body style="margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#171614;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:40px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e7e3db;border-radius:16px;">
<tr><td style="padding:28px 32px 0;"><div style="font-size:24px;font-weight:700;letter-spacing:-0.06em;">rumi</div></td></tr>
<tr><td style="padding:20px 32px 0;"><h1 style="margin:0;font-size:22px;line-height:28px;font-weight:600;letter-spacing:-0.01em;">${escape(heading)}</h1>
<p style="margin:10px 0 0;font-size:15px;line-height:22px;color:#5e5a53;">${escape(body)}</p></td></tr>
${quote ? `<tr><td style="padding:16px 32px 0;"><div style="background:#f0ede6;border-radius:12px;padding:14px 16px;font-size:15px;line-height:22px;color:#171614;">${escape(quote)}</div></td></tr>` : ""}
<tr><td style="padding:24px 32px 32px;"><a href="${href}" style="display:inline-block;background:#171614;color:#f7f5f0;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:12px;">${escape(cta.label)}</a></td></tr>
</table>
<p style="margin:20px 0 0;font-size:12px;line-height:18px;color:#6f6a62;">${footer ? escape(footer) : `${escape(m.footer)} <a href="${settings}" style="color:#6f6a62;">${escape(m.footerLink)}</a>.`}</p>
</td></tr></table></body></html>`;
  const text = `${heading}\n\n${body}${quote ? `\n\n“${quote}”` : ""}\n\n${cta.label}: ${href}\n\n${footer ?? interpolate(m.footerText, { url: settings })}`;
  return { html, text };
}

const say = (text: string, params?: Params) => interpolate(text, params);

export function introReceivedEmail(senderName: string, message: string, locale: Locale = "en") {
  const m = messagesFor(locale).email.introReceived;
  return {
    subject: say(m.subject, { name: senderName }),
    ...layout({
      preheader: message.slice(0, 90),
      heading: say(m.heading, { name: senderName }),
      body: m.body,
      quote: message,
      cta: { label: m.cta, href: "/messages?tab=requests" },
      locale,
    }),
  };
}

export function introAcceptedEmail(
  recipientName: string,
  conversationId: string,
  locale: Locale = "en",
) {
  const m = messagesFor(locale).email.introAccepted;
  return {
    subject: say(m.subject, { name: recipientName }),
    ...layout({
      preheader: m.preheader,
      heading: say(m.heading, { name: recipientName }),
      body: m.body,
      cta: { label: m.cta, href: `/messages/${conversationId}` },
      locale,
    }),
  };
}

export function newMessageEmail(
  senderName: string,
  preview: string,
  conversationId: string,
  groupName?: string | null,
  locale: Locale = "en",
) {
  const m = messagesFor(locale).email.newMessage;
  return {
    subject: groupName
      ? say(m.subjectGroup, { group: groupName })
      : say(m.subject, { name: senderName }),
    ...layout({
      preheader: preview.slice(0, 90),
      heading: groupName
        ? say(m.headingGroup, { name: senderName, group: groupName })
        : say(m.heading, { name: senderName }),
      body: m.body,
      quote: preview,
      cta: { label: m.cta, href: `/messages/${conversationId}` },
      locale,
    }),
  };
}

export function groupInviteEmail(inviterName: string, groupName: string, locale: Locale = "en") {
  const m = messagesFor(locale).email.groupInvite;
  return {
    subject: say(m.subject, { name: inviterName, group: groupName }),
    ...layout({
      preheader: m.preheader,
      heading: say(m.heading, { group: groupName }),
      body: say(m.body, { name: inviterName }),
      cta: { label: m.cta, href: "/messages?tab=requests" },
      locale,
    }),
  };
}

export function strongMatchDigestEmail(
  firstName: string,
  matches: { name: string; score: number; id: string }[],
  locale: Locale = "en",
) {
  const m = messagesFor(locale).email.digest;
  const top = matches.slice(0, 3);
  const list = top.map((x) => `${x.name} (${x.score}%)`).join(", ");
  return {
    subject:
      matches.length === 1
        ? say(m.subjectOne, { score: top[0]!.score })
        : say(m.subjectMany, { count: matches.length }),
    ...layout({
      preheader: list,
      heading: firstName ? say(m.headingName, { name: firstName }) : m.heading,
      body: say(m.body, { list }),
      cta: { label: m.cta, href: "/matches" },
      locale,
    }),
  };
}

/** Staff invites are in English, like the staff app. */
export function staffInviteEmail(
  inviterName: string,
  schoolName: string,
  roleLabel: string,
  token: string,
) {
  return {
    subject: `${inviterName} invited you to Rumi for ${schoolName}`,
    ...layout({
      preheader: `Join as ${roleLabel}. The link works for 7 days.`,
      heading: `Join ${schoolName} on Rumi`,
      body: `${inviterName} invited you as ${roleLabel}. Sign in with this email address to accept. The link works for 7 days.`,
      cta: { label: "Accept invite", href: `/invite/${token}` },
      footer:
        "You're getting this because someone at your school invited this address. Ignore it if you weren't expecting it.",
    }),
  };
}

export function inactivityWarningEmail(daysLeft: number, locale: Locale = "en") {
  const m = messagesFor(locale).email.inactivity;
  return {
    subject: m.subject,
    ...layout({
      preheader: say(m.preheader, { days: daysLeft }),
      heading: m.heading,
      body: say(m.body, { days: daysLeft }),
      cta: { label: m.cta, href: "/login" },
      footer: m.footer,
      locale,
    }),
  };
}

export function housingSuggestionEmail(
  office: string,
  proposalId: string,
  size = 2,
  locale: Locale = "en",
) {
  const m = messagesFor(locale).email.suggestion;
  const group = size > 2;
  return {
    subject: group ? say(m.subjectGroup, { office, size }) : say(m.subject, { office }),
    ...layout({
      preheader: group ? m.preheaderGroup : m.preheader,
      heading: group ? m.headingGroup : m.heading,
      body: group ? say(m.bodyGroup, { office, size }) : say(m.body, { office }),
      cta: { label: m.cta, href: `/suggestions/${proposalId}` },
      locale,
    }),
  };
}

export function housingNudgeEmail(office: string, locale: Locale = "en") {
  const m = messagesFor(locale).email.nudge;
  return {
    subject: m.subject,
    ...layout({
      preheader: m.preheader,
      heading: m.heading,
      body: say(m.body, { office }),
      cta: { label: m.cta, href: "/matches" },
      locale,
    }),
  };
}

/** A student chose to forward a serious report to the school's configured office (Phase 0.3). Staff-facing: English. */
export function escalationForwardEmail(input: {
  office: string;
  category: string;
  reporterFirstName: string;
  reporterEmail: string;
  details: string | null;
  excerpt: string | null;
}) {
  const { html, text } = layout({
    preheader: `A student asked Rumi to forward a ${input.category.toLowerCase()} report.`,
    heading: `A student forwarded a report to ${input.office}`,
    body: `${input.reporterFirstName} (${input.reporterEmail}) reported "${input.category}" on Rumi and chose to send it to your office so you can follow up. Rumi is a roommate-matching service and doesn't investigate.${input.details ? ` What they wrote: ${input.details}` : ""}`,
    quote: input.excerpt ?? undefined,
    cta: { label: "About Rumi", href: "/security" },
    footer:
      "Sent because the student chose to forward their report to this address, which your school configured in Rumi.",
  });
  return { subject: `Forwarded report from a student (${input.category})`, html, text };
}

/** `copy` is already in the recipient's language (see deadline-run). */
export function deadlineNudgeEmail(
  copy: { title: string; body: string; href: string },
  locale: Locale = "en",
) {
  const { html, text } = layout({
    preheader: copy.body,
    heading: copy.title,
    body: copy.body,
    cta: { label: messagesFor(locale).email.deadline.cta, href: copy.href },
    locale,
  });
  return { subject: copy.title, html, text };
}
